const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const os = require('os');

const baseConfig = require('../src/config');
const { createNodeContext, createServer } = require('../src/server');

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

test('mempool returns 429 when over capacity', async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bulen-mempool-'));
  const config = cloneConfig({
    dataDir,
    httpPort: 0,
    mempoolMaxSize: 2,
    requireSignatures: false,
    enableFaucet: true,
  });
  const context = createNodeContext(config);
  const server = createServer(context);
  const addressInfo = server.address();
  const baseUrl = `http://127.0.0.1:${addressInfo.port}`;

  try {
    // Fund alice
    await fetchJson(`${baseUrl}/api/faucet`, {
      method: 'POST',
      body: JSON.stringify({ address: 'alice', amount: 1000 }),
    });

    // Two transactions should fit
    for (let i = 0; i < 2; i += 1) {
      const res = await fetchJson(`${baseUrl}/api/transactions`, {
        method: 'POST',
        body: JSON.stringify({
          from: 'alice',
          to: `bob-${i}`,
          amount: 1,
          fee: 0,
          nonce: i + 1,
        }),
      });
      assert.strictEqual(res.status, 202);
    }

    // Third should be rejected with 429
    const res = await fetchJson(`${baseUrl}/api/transactions`, {
      method: 'POST',
      body: JSON.stringify({
        from: 'alice',
        to: 'bob-3',
        amount: 1,
        fee: 0,
        nonce: 3,
      }),
    });
    assert.strictEqual(res.status, 429);
  } finally {
    if (Array.isArray(context.timers)) {
      context.timers.forEach((handle) => clearInterval(handle));
    }
    server.close();
  }
});
