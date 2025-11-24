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
  const body = await response.json();
  return { status: response.status, body };
}

test('payments API tracks invoices until paid', async () => {
  const dataDir = path.join(__dirname, '..', 'test-data-payments');
  const config = cloneConfig({
    nodeId: 'node-payments',
    dataDir,
    httpPort: 0,
    blockIntervalMs: 200,
    enableFaucet: true,
    requireSignatures: false,
  });

  const context = createNodeContext(config);
  const server = createServer(context);
  startBlockProducer(context);
  startUptimeSampler(context);

  const addressInfo = server.address();
  const baseUrl = `http://127.0.0.1:${addressInfo.port}`;

  try {
    // Create a payment request
    const paymentRes = await fetchJson(`${baseUrl}/api/payments`, {
      method: 'POST',
      body: JSON.stringify({ to: 'merchant', amount: 50, memo: 'order-123', expiresInSeconds: 300 }),
    });
    assert.strictEqual(paymentRes.status, 201);
    const paymentId = paymentRes.body.id;

    // Fund alice
    await fetchJson(`${baseUrl}/api/faucet`, {
      method: 'POST',
      body: JSON.stringify({ address: 'alice-payments', amount: 200 }),
    });

    // Submit transaction with memo to pay the invoice
    await fetchJson(`${baseUrl}/api/transactions`, {
      method: 'POST',
      body: JSON.stringify({
        from: 'alice-payments',
        to: 'merchant',
        amount: 60,
        fee: 0,
        memo: 'order-123',
      }),
    });

    // Wait for block production
    await new Promise((resolve) => setTimeout(resolve, 700));

    const statusRes = await fetchJson(`${baseUrl}/api/payments/${paymentId}`, {
      method: 'GET',
    });
    assert.strictEqual(statusRes.status, 200);
    assert.strictEqual(statusRes.body.status, 'paid');
    assert.ok(statusRes.body.transactionId);
  } finally {
    if (Array.isArray(context.timers)) {
      context.timers.forEach((handle) => clearInterval(handle));
    }
    server.close();
  }
});
