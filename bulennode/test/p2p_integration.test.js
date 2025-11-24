const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

const baseConfig = require('../src/config');
const { createNodeContext, createServer, startBlockProducer } = require('../src/server');
const { startUptimeSampler } = require('../src/rewards');

function cloneConfig(overrides) {
  return {
    ...baseConfig,
    peers: [],
    ...overrides,
  };
}

async function fetchJson(url, options) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options && options.headers ? options.headers : {}),
    },
  });
  let body = null;
  try {
    body = await response.json();
  } catch (error) {
    body = null;
  }
  return { status: response.status, body };
}

test('block produced on node A is propagated to node B via P2P', async () => {
  const suffix = Date.now().toString(16);
  const alice = `alice-p2p-${suffix}`;
  const bob = `bob-p2p-${suffix}`;

  const dataDirA = path.join(__dirname, '..', 'test-data-p2p-A');
  const dataDirB = path.join(__dirname, '..', 'test-data-p2p-B');

  const configA = cloneConfig({
    nodeId: 'node-A',
    dataDir: dataDirA,
    httpPort: 0,
    nodeRole: 'validator',
    blockIntervalMs: 300,
    p2pToken: 'p2p-secret',
  });

  const contextA = createNodeContext(configA);
  const serverA = createServer(contextA);
  startBlockProducer(contextA);
  startUptimeSampler(contextA);
  const addressInfoA = serverA.address();

  const configB = cloneConfig({
    nodeId: 'node-B',
    dataDir: dataDirB,
    httpPort: 0,
    nodeRole: 'validator',
    blockIntervalMs: 300,
    p2pToken: 'p2p-secret',
  });
  const contextB = createNodeContext(configB);
  const serverB = createServer(contextB);
  startBlockProducer(contextB);
  startUptimeSampler(contextB);
  const addressInfoB = serverB.address();

  // Configure node A to broadcast to node B
  configA.peers = [`127.0.0.1:${addressInfoB.port}`];

  const baseUrlA = `http://127.0.0.1:${addressInfoA.port}`;
  const baseUrlB = `http://127.0.0.1:${addressInfoB.port}`;

  try {
    // Fund alice on node A so the transaction is valid there
    let result = await fetchJson(`${baseUrlA}/api/faucet`, {
      method: 'POST',
      body: JSON.stringify({ address: alice, amount: 500 }),
    });
    assert.strictEqual(result.status, 200);

    // Submit a transaction on node A
    result = await fetchJson(`${baseUrlA}/api/transactions`, {
      method: 'POST',
      body: JSON.stringify({
        from: alice,
        to: bob,
        amount: 100,
        fee: 0,
      }),
    });
    assert.strictEqual(result.status, 202);
    const txId = result.body && result.body.transaction && result.body.transaction.id;
    assert.ok(txId, 'Expected transaction id from node A response');

    // Wait for at least one block to be produced and propagated
    await new Promise((resolve) => setTimeout(resolve, 1200));

    // Check that node B has seen the transaction in at least one block
    result = await fetchJson(`${baseUrlB}/api/blocks?limit=20`, {
      method: 'GET',
    });
    assert.strictEqual(result.status, 200);
    assert.ok(result.body);
    const hasTx = result.body.blocks.some((block) =>
      block.transactions.some((transaction) => transaction.id === txId),
    );
    assert.ok(hasTx, 'Expected propagated transaction to appear in node B blocks');
  } finally {
    if (Array.isArray(contextA.timers)) {
      contextA.timers.forEach((handle) => clearInterval(handle));
    }
    if (Array.isArray(contextB.timers)) {
      contextB.timers.forEach((handle) => clearInterval(handle));
    }
    serverA.close();
    serverB.close();
  }
});
