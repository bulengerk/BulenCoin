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
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options && options.headers ? options.headers : {}),
    },
  });
  const body = await res.json();
  return { status: res.status, body };
}

test('payment-link builds BIP21-style URI and QR, rejects bad input', async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bulen-paylink-'));
  const config = cloneConfig({
    dataDir,
    httpPort: 0,
    enableFaucet: false,
    requireSignatures: false,
  });

  const context = createNodeContext(config);
  const server = createServer(context);
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // Missing address
    const missing = await fetchJson(`${baseUrl}/api/payment-link`, {
      method: 'POST',
      body: JSON.stringify({ amount: 10 }),
    });
    assert.strictEqual(missing.status, 400);

    // Invalid amount
    const badAmount = await fetchJson(`${baseUrl}/api/payment-link`, {
      method: 'POST',
      body: JSON.stringify({ address: 'merchant', amount: 0 }),
    });
    assert.strictEqual(badAmount.status, 400);

    // Valid
    const memo = 'tip-123';
    const good = await fetchJson(`${baseUrl}/api/payment-link`, {
      method: 'POST',
      body: JSON.stringify({ address: 'merchant', amount: 12.5, memo }),
    });
    assert.strictEqual(good.status, 200);
    assert.ok(good.body.ok);
    assert.match(good.body.link, /^bulen:merchant\?amount=12\.5/);
    assert.ok(good.body.link.includes(`memo=${encodeURIComponent(memo)}`));
    if (good.body.qrDataUrl) {
      assert.match(good.body.qrDataUrl, /^data:image\/png;base64,/);
    }
  } finally {
    if (Array.isArray(context.timers)) {
      context.timers.forEach((handle) => clearInterval(handle));
    }
    server.close();
  }
});
