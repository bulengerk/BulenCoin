const test = require('node:test');
const assert = require('node:assert');

const { createGenesisBlock, createBlock, ensureAccount, hashObject } = require('../src/chain');
const { ensureConsensusState, handleIncomingBlock } = require('../src/consensus');
const { signPayload, deriveAddressFromPublicKey } = require('../src/identity');
const crypto = require('crypto');

function createTestContext(overrides = {}) {
  const config = {
    chainId: 'bulencoin-devnet-1',
    nodeId: 'node-test',
    nodeRole: 'validator',
    protocolVersion: '1.0.0',
    protocolMajor: 1,
    p2pToken: '',
    p2pRequireHandshake: false,
    minimumValidatorWeight: 1,
    finalityStakeThreshold: 0.6,
    finalityMinDepth: 1,
    slashPenalty: 0.5,
    allowUnsignedBlocks: false,
    ...overrides,
  };
  const state = {
    chainId: config.chainId,
    blocks: [],
    accounts: {},
  };
  createGenesisBlock(config, state);
  ensureConsensusState(state);
  const context = {
    config,
    state,
    mempool: [],
    payments: [],
    walletStore: {},
    metrics: {},
    timers: [],
  };
  return context;
}

function signBlockWithKey(block, privateKeyPem, publicKeyPem, chainId = 'bulencoin-devnet-1') {
  const { computeBlockHash } = require('../src/chain');
  const signed = { ...block };
  signed.chainId = signed.chainId || chainId;
  const validator = deriveAddressFromPublicKey(publicKeyPem);
  signed.validator = validator;
  signed.committee = [{ address: validator, stake: block.validatorStake || 1 }];
  signed.producerPublicKey = publicKeyPem;
  signed.hash = computeBlockHash(signed);
  signed.producerSignature = signPayload(privateKeyPem, signed.hash);
  signed.certificate = [
    {
      validator,
      publicKey: publicKeyPem,
      signature: signed.producerSignature,
    },
  ];
  return signed;
}

function setStake(context, address, stake) {
  const account = ensureAccount(context.state, address);
  account.stake = stake;
  ensureConsensusState(context.state);
  const snapshot = context.state.finalizedSnapshot || context.state;
  const snapAccount = ensureAccount(snapshot, address);
  snapAccount.stake = stake;
}

test('stake-weighted fork choice prefers heavier validator branch', () => {
  const context = createTestContext();
  const { state, config } = context;
  const genesis = state.blocks[0];

  const { privateKey: privLight, publicKey: pubLight } = crypto.generateKeyPairSync('ec', { namedCurve: 'secp256k1' });
  const publicKeyPem = pubLight.export({ type: 'spki', format: 'pem' });
  const privateKeyPem = privLight.export({ type: 'pkcs8', format: 'pem' });
  const validatorAddr = deriveAddressFromPublicKey(publicKeyPem);

  setStake(context, validatorAddr, 50);

  const blockLight = createBlock(config, state, validatorAddr, []);
  const signedLight = signBlockWithKey(blockLight, privateKeyPem, publicKeyPem, config.chainId);

  let result = handleIncomingBlock(context, signedLight, { source: 'local' });
  assert.ok(result.accepted, `Expected light block accepted, got ${result.reason}`);
  assert.strictEqual(state.blocks[state.blocks.length - 1].validator, signedLight.validator);

  // Heavier fork from a different validator
  const { privateKey: privHeavy, publicKey: pubHeavy } = crypto.generateKeyPairSync('ec', { namedCurve: 'secp256k1' });
  const heavyPubPem = pubHeavy.export({ type: 'spki', format: 'pem' });
  const heavyPrivPem = privHeavy.export({ type: 'pkcs8', format: 'pem' });
  const heavyValidator = deriveAddressFromPublicKey(heavyPubPem);
  setStake(context, heavyValidator, 200);

  const heavyContent = {
    index: 1,
    previousHash: genesis.hash,
    timestamp: new Date().toISOString(),
    chainId: config.chainId,
    validator: heavyValidator,
    validatorStake: ensureAccount(state, heavyValidator).stake,
    transactions: [],
  };
  const heavyBlock = { ...heavyContent, hash: hashObject(heavyContent) };
  const signedHeavy = signBlockWithKey(heavyBlock, heavyPrivPem, heavyPubPem, config.chainId);

  result = handleIncomingBlock(context, signedHeavy, { source: 'p2p' });
  assert.ok(result.accepted, `Expected heavy fork accepted, got ${result.reason}`);
  const tip = state.blocks[state.blocks.length - 1];
  assert.strictEqual(tip.validator, signedHeavy.validator);
  assert.strictEqual(tip.previousHash, genesis.hash);
  assert.ok(result.reorg, 'Expected reorg onto heavier chain');
});

test('equivocation triggers slashing and blocks are rejected', () => {
  const context = createTestContext({ slashPenalty: 0.5 });
  const { state, config } = context;
  const genesis = state.blocks[0];

  const validator = 'equivocator';
  setStake(context, validator, 80);

  const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'secp256k1' });
  const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' });
  const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' });
  const validatorAddr = deriveAddressFromPublicKey(publicKeyPem);
  setStake(context, validatorAddr, 80);

  const blockA = createBlock(config, state, validatorAddr, []);
  const signedA = signBlockWithKey(blockA, privateKeyPem, publicKeyPem);
  let result = handleIncomingBlock(context, signedA, { source: 'local' });
  assert.ok(result.accepted);

  const blockBContent = {
    index: 1,
    previousHash: genesis.hash,
    timestamp: new Date(Date.now() + 10).toISOString(),
    chainId: config.chainId,
    validator: validatorAddr,
    validatorStake: ensureAccount(state, validatorAddr).stake,
    transactions: [],
  };
  const blockB = { ...blockBContent, hash: hashObject(blockBContent) };
  const signedB = signBlockWithKey(blockB, privateKeyPem, publicKeyPem, config.chainId);
  result = handleIncomingBlock(context, signedB, { source: 'p2p' });

  assert.ok(!result.accepted, 'Equivocating block should not be accepted over canonical');
  const slashedAccount = state.accounts[validatorAddr];
  assert.ok(slashedAccount.stake < 80, 'Stake should be reduced after slashing');
  assert.ok(Array.isArray(state.slashEvents) && state.slashEvents.length >= 1);
});

test('blocks reach finality when stake threshold is met', () => {
  const context = createTestContext({
    finalityStakeThreshold: 0.5,
    finalityMinDepth: 0,
    allowUnsignedBlocks: true,
  });
  const { state, config } = context;

  setStake(context, 'val1', 40);
  setStake(context, 'val2', 100);

  const block1 = createBlock(config, state, 'val1', []);
  let result = handleIncomingBlock(context, block1, { source: 'local' });
  assert.ok(result.accepted);

  const block2 = createBlock(config, state, 'val2', []);
  result = handleIncomingBlock(context, block2, { source: 'local' });
  assert.ok(result.accepted);

  assert.ok(
    state.finalizedHeight >= 2,
    `Expected finalization to progress, got height ${state.finalizedHeight}`,
  );
  assert.ok(state.finalizedHash, 'Finalized hash should be set');
});
