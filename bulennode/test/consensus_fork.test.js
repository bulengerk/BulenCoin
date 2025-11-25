const test = require('node:test');
const assert = require('node:assert');

const { createGenesisBlock, createBlock, ensureAccount, hashObject } = require('../src/chain');
const { ensureConsensusState, handleIncomingBlock } = require('../src/consensus');

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
    finalityMinDepth: 0,
    slashPenalty: 0.5,
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

  setStake(context, 'light', 10);
  setStake(context, 'heavy', 100);

  const blockLight = createBlock(config, state, 'light', []);
  let result = handleIncomingBlock(context, blockLight, { source: 'local' });
  assert.ok(result.accepted, `Expected light block accepted, got ${result.reason}`);
  assert.strictEqual(state.blocks[state.blocks.length - 1].validator, 'light');

  const heavyContent = {
    index: 1,
    previousHash: genesis.hash,
    timestamp: new Date().toISOString(),
    validator: 'heavy',
    validatorStake: ensureAccount(state, 'heavy').stake,
    transactions: [],
  };
  const heavyBlock = { ...heavyContent, hash: hashObject(heavyContent) };

  result = handleIncomingBlock(context, heavyBlock, { source: 'p2p' });
  assert.ok(result.accepted, `Expected heavy fork accepted, got ${result.reason}`);
  const tip = state.blocks[state.blocks.length - 1];
  assert.strictEqual(tip.validator, 'heavy');
  assert.strictEqual(tip.previousHash, genesis.hash);
  assert.ok(result.reorg, 'Expected reorg onto heavier chain');
});

test('equivocation triggers slashing and blocks are rejected', () => {
  const context = createTestContext({ slashPenalty: 0.5 });
  const { state, config } = context;
  const genesis = state.blocks[0];

  const validator = 'equivocator';
  setStake(context, validator, 80);

  const blockA = createBlock(config, state, validator, []);
  let result = handleIncomingBlock(context, blockA, { source: 'local' });
  assert.ok(result.accepted);

  const blockBContent = {
    index: 1,
    previousHash: genesis.hash,
    timestamp: new Date(Date.now() + 10).toISOString(),
    validator,
    validatorStake: ensureAccount(state, validator).stake,
    transactions: [],
  };
  const blockB = { ...blockBContent, hash: hashObject(blockBContent) };
  result = handleIncomingBlock(context, blockB, { source: 'p2p' });

  assert.ok(!result.accepted, 'Equivocating block should not be accepted over canonical');
  const slashedAccount = state.accounts[validator];
  assert.ok(slashedAccount.stake < 80, 'Stake should be reduced after slashing');
  assert.ok(Array.isArray(state.slashEvents) && state.slashEvents.length >= 1);
});

test('blocks reach finality when stake threshold is met', () => {
  const context = createTestContext({ finalityStakeThreshold: 0.5, finalityMinDepth: 0 });
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
