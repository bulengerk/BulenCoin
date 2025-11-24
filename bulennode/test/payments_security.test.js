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
  const body = await response.json();
  return { status: response.status, body };
}

test('payments reject invalid payloads and long memo', async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bulen-payments-security-'));
  const config = cloneConfig({
    nodeId: 'node-payments-security',
    dataDir,
    httpPort: 0,
    enableFaucet: true,
  });
  const context = createNodeContext(config);
  const server = createServer(context);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    // Missing destination
    const missingTo = await fetchJson(`${baseUrl}/api/payments`, {
      method: 'POST',
      body: JSON.stringify({ amount: 10 }),
    });
    assert.strictEqual(missingTo.status, 400);

    // Invalid amount
    const badAmount = await fetchJson(`${baseUrl}/api/payments`, {
      method: 'POST',
      body: JSON.stringify({ to: 'merchant', amount: -1 }),
    });
    assert.strictEqual(badAmount.status, 400);

    // Too long memo
    const longMemo = 'x'.repeat(300);
    const memoRes = await fetchJson(`${baseUrl}/api/payments`, {
      method: 'POST',
      body: JSON.stringify({ to: 'merchant', amount: 10, memo: longMemo }),
    });
    assert.strictEqual(memoRes.status, 400);

    // Valid memo within limit succeeds
    const ok = await fetchJson(`${baseUrl}/api/payments`, {
      method: 'POST',
      body: JSON.stringify({ to: 'merchant', amount: 10, memo: 'short' }),
    });
    assert.strictEqual(ok.status, 201);
  } finally {
    server.close();
  }
});
