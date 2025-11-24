const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Configure environment before requiring config/server
process.env.BULEN_NODE_PROFILE = 'desktop-full';
process.env.BULEN_HTTP_PORT = '0';
process.env.BULEN_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'bulen-security-'));
process.env.BULEN_BLOCK_INTERVAL_MS = '200';

const config = require('../src/config');
const { createNodeContext, createServer, startBlockProducer } = require('../src/server');
const { startUptimeSampler } = require('../src/rewards');

const context = createNodeContext(config);
// Speed up block production for tests
config.blockIntervalMs = 200;

const server = createServer(context);
startBlockProducer(context);
startUptimeSampler(context);

const addressInfo = server.address();
const baseUrl = `http://127.0.0.1:${addressInfo.port}`;

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

test('security and functional behaviours', async () => {
  // 1. Faucet disabled returns 403
  config.enableFaucet = false;
  let result = await fetchJson(`${baseUrl}/api/faucet`, {
    method: 'POST',
    body: JSON.stringify({ address: 'alice', amount: 1000 }),
  });
  assert.strictEqual(result.status, 403);

  // 2. Faucet enabled and requireSignatures=true rejects unsigned transaction
  config.enableFaucet = true;
  config.requireSignatures = true;

  // Fund alice
  result = await fetchJson(`${baseUrl}/api/faucet`, {
    method: 'POST',
    body: JSON.stringify({ address: 'alice', amount: 1000 }),
  });
  assert.strictEqual(result.status, 200);

  // Try to send transaction without signature
  result = await fetchJson(`${baseUrl}/api/transactions`, {
    method: 'POST',
    body: JSON.stringify({
      from: 'alice',
      to: 'bob',
      amount: 10,
      fee: 1,
      nonce: 1,
    }),
  });
  assert.strictEqual(result.status, 400);
  assert.ok(
    result.body && typeof result.body.error === 'string',
    'Expected error message for unsigned transaction',
  );

  // 3. P2P token enforcement
  config.p2pToken = 'secret-token';

  // Missing token
  result = await fetchJson(`${baseUrl}/p2p/tx`, {
    method: 'POST',
    body: JSON.stringify({ transaction: { id: 'tx1' } }),
  });
  assert.strictEqual(result.status, 403);

  // Correct token
  result = await fetchJson(`${baseUrl}/p2p/tx`, {
    method: 'POST',
    headers: { 'x-bulen-p2p-token': 'secret-token' },
    body: JSON.stringify({ transaction: { id: 'tx2' } }),
  });
  assert.strictEqual(result.status, 200);
  assert.ok(result.body && result.body.ok);

  // 4. Functional: faucet + transaction + block production update account state
  config.requireSignatures = false;
  config.enableFaucet = true;

  const uniqueSuffix = Date.now().toString(16);
  const aliceFunctional = `alice-functional-${uniqueSuffix}`;
  const bobFunctional = `bob-functional-${uniqueSuffix}`;

  // Fund alice again
  await fetchJson(`${baseUrl}/api/faucet`, {
    method: 'POST',
    body: JSON.stringify({ address: aliceFunctional, amount: 500 }),
  });

  // Submit simple transaction
  await fetchJson(`${baseUrl}/api/transactions`, {
    method: 'POST',
    body: JSON.stringify({
      from: aliceFunctional,
      to: bobFunctional,
      amount: 100,
      fee: 0,
    }),
  });

  // Wait for at least one block interval
  await new Promise((resolve) => setTimeout(resolve, 700));

  // Check account balance for bob-functional
  result = await fetchJson(`${baseUrl}/api/accounts/${bobFunctional}`, {
    method: 'GET',
  });
  assert.strictEqual(result.status, 200);
  assert.ok(result.body);
  assert.strictEqual(result.body.balance, 100);

  if (Array.isArray(context.timers)) {
    context.timers.forEach((handle) => clearInterval(handle));
  }
  server.close();
});
