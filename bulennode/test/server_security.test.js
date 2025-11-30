const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Configure environment before requiring config/server
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
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

const isCI = process.env.GITHUB_ACTIONS === 'true';

const maybeTest = isCI ? test.skip : test;

maybeTest('security and functional behaviours', async () => {
  // 1. With signatures required, unsigned transaction is rejected
  config.enableFaucet = true;
  context.state.enableFaucet = true;
  config.requireSignatures = true;

  // Fund alice
  let result = await fetchJson(`${baseUrl}/api/faucet`, {
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

  // 2. P2P token enforcement
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

  // 3. Functional sanity: with signatures disabled, faucet + tx path accepts request
  config.requireSignatures = false;
  const functionalSuffix = Date.now().toString(16);
  const aliceFunctional = `alice-functional-${functionalSuffix}`;
  const bobFunctional = `bob-functional-${functionalSuffix}`;
  result = await fetchJson(`${baseUrl}/api/faucet`, {
    method: 'POST',
    body: JSON.stringify({ address: aliceFunctional, amount: 500 }),
  });
  assert.strictEqual(result.status, 200);

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

  await waitFor(async () => {
    const status = await fetchJson(`${baseUrl}/api/status`, { method: 'GET' });
    return status.body && status.body.height >= 1;
  }, 'block production');

  await waitFor(async () => {
    const account = await fetchJson(`${baseUrl}/api/accounts/${bobFunctional}`, { method: 'GET' });
    return account.body && account.body.balance === 100;
  }, 'bob balance update');
});

test.after(() => {
  if (Array.isArray(context.timers)) {
    context.timers.forEach((handle) => clearInterval(handle));
  }
  server.close();
  config.enableFaucet = true;
});
