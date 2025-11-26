/* eslint-disable no-console */
const test = require('node:test');
const assert = require('node:assert');
const { spawn } = require('node:child_process');
const path = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');
const { BulenSdk } = require('../bulencoin-sdk');

const ROOT = path.resolve(__dirname, '..', '..');

function startNode(env) {
  const child = spawn('node', ['src/index.js'], {
    cwd: path.join(ROOT, 'bulennode'),
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const stop = () => {
    if (!child.killed) child.kill();
  };
  child.stdout.on('data', (buf) => console.log(`[node] ${buf.toString().trim()}`));
  child.stderr.on('data', (buf) => console.error(`[node][err] ${buf.toString().trim()}`));
  return { child, stop };
}

async function waitFor(fn, label, timeoutMs = 15000, intervalMs = 250) {
  const started = Date.now();
  let last;
  while (Date.now() - started < timeoutMs) {
    try {
      const val = await fn();
      if (val) return val;
    } catch (error) {
      last = error;
    }
    await delay(intervalMs);
  }
  const err = new Error(`Timed out waiting for ${label}`);
  if (last) err.cause = last;
  throw err;
}

test('JS SDK creates/checks payments and builds links', async (t) => {
  const env = {
    ...process.env,
    NODE_ENV: 'test',
    BULEN_HTTP_PORT: '5410',
    BULEN_P2P_PORT: '5411',
    BULEN_DATA_DIR: path.join(ROOT, 'data', 'sdk-js-node'),
    BULEN_ENABLE_FAUCET: 'true',
    BULEN_BLOCK_INTERVAL_MS: '600',
  };
  const node = startNode(env);
  t.after(() => node.stop());

  const apiBase = 'http://127.0.0.1:5410/api';
  const sdk = new BulenSdk({ apiBase });

  await waitFor(async () => {
    try {
      const res = await fetch(`${apiBase}/health`);
      return res.ok;
    } catch (error) {
      return false;
    }
  }, 'bulennode health');

  // Fund payer
  await fetch(`${apiBase}/faucet`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address: 'sdk-alice', amount: 1000 }),
  });

  // Create invoice
  const payment = await sdk.createPayment({
    to: 'sdk-merchant',
    amount: 50,
    memo: 'sdk-order',
    expiresInSeconds: 300,
  });
  assert.ok(payment.id);

  // Build payment link locally
  const link = sdk.buildPaymentLink({ to: 'sdk-merchant', amount: 50, memo: 'sdk-order' });
  assert.match(link, /^bulen:sdk-merchant\?amount=50/);
  assert.ok(link.includes('memo=sdk-order'));

  // Build payment link via node (with QR)
  const linkResp = await sdk.createPaymentLink({
    address: 'sdk-merchant',
    amount: 50,
    memo: 'sdk-order',
  });
  assert.ok(linkResp.ok);
  assert.match(linkResp.link, /^bulen:sdk-merchant\?amount=50/);

  // Pay invoice
  await fetch(`${apiBase}/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'sdk-alice',
      to: 'sdk-merchant',
      amount: 50,
      fee: 0,
      memo: 'sdk-order',
    }),
  });

  const paid = await waitFor(
    async () => {
      const status = await sdk.verifyPayment(payment.id);
      return status.paid ? status : null;
    },
    'payment paid',
    15000,
    400,
  );
  assert.strictEqual(paid.status, 'paid');
  assert.ok(paid.transactionId);
});
