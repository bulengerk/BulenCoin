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
config.p2pRequireHandshake = false;
config.allowEmptyBlocks = false;
config.statusToken = '';

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

async function waitFor(fn, label, timeoutMs = 5000, intervalMs = 200) {
  const start = Date.now();
  let lastError;
  while (Date.now() - start < timeoutMs) {
    try {
      const value = await fn();
      if (value) return value;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  const error = new Error(`Timed out waiting for ${label}`);
  if (lastError) error.cause = lastError;
  throw error;
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
  context.state.enableFaucet = true;

  const uniqueSuffix = Date.now().toString(16);
  const aliceFunctional = `alice-functional-${uniqueSuffix}`;
  const bobFunctional = `bob-functional-${uniqueSuffix}`;

  // Fund alice again
  result = await fetchJson(`${baseUrl}/api/faucet`, {
    method: 'POST',
    body: JSON.stringify({ address: aliceFunctional, amount: 500 }),
  });
  assert.strictEqual(result.status, 200);

  // Submit simple transaction
  result = await fetchJson(`${baseUrl}/api/transactions`, {
    method: 'POST',
    body: JSON.stringify({
      from: aliceFunctional,
      to: bobFunctional,
      amount: 100,
      fee: 0,
    }),
  });
  assert.strictEqual(result.status, 202);

  // Wait for balance update (block production + apply)
  await waitFor(async () => {
    const status = await fetchJson(`${baseUrl}/api/status`, { method: 'GET' });
    return status.body && status.body.height >= 1;
  }, 'block production');

  // Check account balance for bob-functional
  result = await fetchJson(`${baseUrl}/api/accounts/${bobFunctional}`, {
    method: 'GET',
  });
  assert.strictEqual(result.status, 200);
  assert.ok(result.body);
  assert.strictEqual(result.body.balance, 100);

  await waitFor(async () => {
    const res = await fetchJson(`${baseUrl}/api/accounts/${bobFunctional}`, { method: 'GET' });
    return res.body && res.body.balance === 100;
  }, 'bob balance update');
});

test.after(() => {
  if (Array.isArray(context.timers)) {
    context.timers.forEach((handle) => clearInterval(handle));
  }
  server.close();
  config.enableFaucet = true;
});
