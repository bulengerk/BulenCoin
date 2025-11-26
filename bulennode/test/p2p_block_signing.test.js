const test = require('node:test');
const assert = require('node:assert');

const baseConfig = require('../src/config');
const { createNodeContext, createServer } = require('../src/server');
const { createBlock, ensureAccount } = require('../src/chain');
const { snapshotAtHeight, selectCommittee } = require('../src/consensus');
const { signBlockHash } = require('../src/security');

function setupNode(overrides = {}) {
  const config = {
    ...baseConfig,
    httpPort: 0,
    p2pPort: 0,
    p2pRequireHandshake: false,
    p2pToken: 'p2p-signing-token',
    allowUnsignedBlocks: false,
    enableFaucet: false,
    requireSignatures: false,
    ...overrides,
  };
  const context = createNodeContext(config);
  const server = createServer(context);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  return { config, context, server, baseUrl };
}

test('P2P accepts properly signed block with checkpoint', async () => {
  const { config, context, server, baseUrl } = setupNode();
  const validator = config.validatorAddress || config.nodeId;
  ensureAccount(context.state, validator).stake = 10;

  const committee = selectCommittee(config, context.state, context.state.bestTipHash);
  const checkpointHeight = context.state.finalizedHeight || 0;
  const checkpointHash = context.state.finalizedHash || null;
  const snapshot = snapshotAtHeight(config, context.state, checkpointHeight);
  const finalityCheckpoint = {
    height: checkpointHeight,
    hash: checkpointHash,
    signer: context.identity.address,
    publicKey: context.identity.publicKeyPem,
    snapshotHash: snapshot.hash,
    signature: signBlockHash(
      context.identity,
      JSON.stringify({ height: checkpointHeight, hash: checkpointHash, snapshotHash: snapshot.hash }),
    ),
  };

  const block = createBlock(config, context.state, validator, [{ id: 'p2p-test-tx' }], {
    committee,
    certificate: [],
    producerPublicKey: context.identity.publicKeyPem,
    finalityCheckpoint,
  });
  const producerSignature = signBlockHash(context.identity, block.hash);
  block.producerSignature = producerSignature;
  block.certificate = [
    { validator, publicKey: context.identity.publicKeyPem, signature: producerSignature },
  ];

  const response = await fetch(`${baseUrl}/p2p/block`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-bulen-p2p-token': 'p2p-signing-token',
      'x-bulen-protocol-version': config.protocolVersion,
    },
    body: JSON.stringify({ block }),
  });
  assert.strictEqual(response.status, 200, `unexpected status ${response.status}`);
  const body = await response.json();
  assert.strictEqual(body.ok, true);

  server.close();
  if (Array.isArray(context.timers)) {
    context.timers.forEach((t) => clearInterval(t));
  }
});

test('P2P rejects unsigned block when allowUnsignedBlocks=false', async () => {
  const { config, context, server, baseUrl } = setupNode();
  const validator = config.validatorAddress || config.nodeId;
  ensureAccount(context.state, validator).stake = 5;

  const committee = selectCommittee(config, context.state, context.state.bestTipHash);
  const block = createBlock(config, context.state, validator, [], {
    committee,
    certificate: [],
    producerPublicKey: context.identity.publicKeyPem,
    finalityCheckpoint: null,
  });

  const response = await fetch(`${baseUrl}/p2p/block`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-bulen-p2p-token': 'p2p-signing-token',
      'x-bulen-protocol-version': config.protocolVersion,
    },
    body: JSON.stringify({ block }),
  });
  assert.strictEqual(response.status, 400);

  server.close();
  if (Array.isArray(context.timers)) {
    context.timers.forEach((t) => clearInterval(t));
  }
});
