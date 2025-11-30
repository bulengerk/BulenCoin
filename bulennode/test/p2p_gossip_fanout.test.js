const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const os = require('os');

const baseConfig = require('../src/config');
const { createNodeContext, createServer, startBlockProducer } = require('../src/server');
const { startUptimeSampler } = require('../src/rewards');

function cloneConfig(overrides) {
  return {
    ...baseConfig,
    peers: [],
    allowUnsignedBlocks: true,
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

test('blocks propagate with limited fanout', async () => {
  const fanout = 3;
  const nodes = [];
  const dataDirs = [];
  const token = 'fanout-token';

  try {
    // Spin up 4 nodes with tight block interval
    for (let i = 0; i < 4; i += 1) {
      const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), `bulen-fanout-${i}-`));
      dataDirs.push(dataDir);
      const config = cloneConfig({
        nodeId: `node-${i}`,
        dataDir,
        httpPort: 0,
        blockIntervalMs: 300,
        mempoolMaxSize: 100,
        p2pToken: token,
        p2pRequireHandshake: true,
        p2pFanout: fanout,
        p2pMaxPeers: 8,
        requireSignatures: false,
        allowUnsignedBlocks: false,
        statusToken: '',
        metricsToken: '',
        bulcosSupplyCap: 0,
        bulcosDailyMintCap: 0,
        bulcosMinReserveRatio: 0,
        enableFaucet: true,
      });
      process.env.ALLOW_STATE_MIGRATION = 'true';
      const context = createNodeContext(config);
      context.config.enableFaucet = true;
      context.state.enableFaucet = true;
      const server = createServer(context);
      // Only node 0 will produce blocks to avoid competing forks in this test
      if (i === 0) {
        startBlockProducer(context);
      }
      startUptimeSampler(context);
      const addressInfo = server.address();
      nodes.push({ context, server, baseUrl: `http://127.0.0.1:${addressInfo.port}` });
    }

    // Wire peers after we know ports
    const peerList = nodes.map((n) => n.baseUrl.replace('http://', '').replace('/api', '').replace(/\/$/, ''));
    for (const node of nodes) {
      node.context.config.peers = peerList.filter((p) => !node.baseUrl.includes(p));
    }

    const [nodeA, nodeB, nodeC, nodeD] = nodes;

    // Fund alice on node A
    let res = await fetchJson(`${nodeA.baseUrl}/api/faucet`, {
      method: 'POST',
      body: JSON.stringify({ address: 'alice-fanout', amount: 500 }),
    });
    assert.strictEqual(res.status, 200);

    // Submit a tx on node A
    res = await fetchJson(`${nodeA.baseUrl}/api/transactions`, {
      method: 'POST',
      body: JSON.stringify({
        from: 'alice-fanout',
        to: 'bob-fanout',
        amount: 10,
        fee: 0,
        nonce: 1,
      }),
    });
    assert.strictEqual(res.status, 202);

    // Wait for propagation
    await new Promise((resolve) => setTimeout(resolve, 3500));

    // Check all nodes have height >=1
    const heights = [];
    for (const node of [nodeA, nodeB, nodeC, nodeD]) {
      const status = await fetchJson(`${node.baseUrl}/api/status`, { method: 'GET' });
      assert.strictEqual(status.status, 200);
      heights.push(status.body.height);
    }
    assert.ok(heights.every((h) => h >= 1), `Expected all nodes to reach height 1, got ${heights}`);
  } finally {
    for (const node of nodes) {
      if (Array.isArray(node.context.timers)) {
        node.context.timers.forEach((handle) => clearInterval(handle));
      }
      node.server.close();
    }
    dataDirs.forEach((dir) => {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
      } catch (error) {
        // ignore cleanup issues
      }
    });
    delete process.env.ALLOW_STATE_MIGRATION;
  }
});
