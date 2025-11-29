/* eslint-disable no-console */
const test = require('node:test');
const assert = require('node:assert');
const { spawn } = require('node:child_process');
const { setTimeout: delay } = require('node:timers/promises');
const path = require('node:path');
const fs = require('node:fs');

const { BulenSdk } = require('../../sdk/bulencoin-sdk');

const ROOT = path.resolve(__dirname, '..', '..');
const WORKDIR = path.join(ROOT, 'data', 'sdk-compat');
const pkg = require('../../sdk/package.json');

function startProcess(label, env) {
  const child = spawn('node', ['src/index.js'], {
    cwd: path.join(ROOT, 'bulennode'),
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', (buf) => console.log(`[${label}] ${buf.toString().trim()}`));
  child.stderr.on('data', (buf) => console.error(`[${label}][err] ${buf.toString().trim()}`));
  const stop = () => {
    if (!child.killed) child.kill();
  };
  return { child, stop };
}

async function waitFor(fn, { timeoutMs = 20000, intervalMs = 400, label = 'condition' } = {}) {
  const started = Date.now();
  let lastError;
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fn();
      if (res) return res;
    } catch (error) {
      lastError = error;
    }
    // eslint-disable-next-line no-await-in-loop
    await delay(intervalMs);
  }
  const err = new Error(`Timed out waiting for ${label}`);
  if (lastError) err.cause = lastError;
  throw err;
}

async function fetchJson(url, options) {
  const resp = await fetch(url, options);
  const body = await resp.json();
  return { status: resp.status, body };
}

test('JS SDK compatibility: payment create/get/link and version stays aligned', { timeout: 30000 }, async (t) => {
  fs.rmSync(WORKDIR, { recursive: true, force: true });
  fs.mkdirSync(WORKDIR, { recursive: true });

  const env = {
    NODE_ENV: 'test',
    BULEN_HTTP_PORT: '5910',
    BULEN_P2P_PORT: '5911',
    BULEN_DATA_DIR: path.join(WORKDIR, 'node'),
    BULEN_NODE_ID: 'sdk-node',
    BULEN_ENABLE_FAUCET: 'true',
    BULEN_BLOCK_INTERVAL_MS: '700',
    BULEN_ALLOW_UNSIGNED_BLOCKS: 'true',
    BULEN_LOG_FORMAT: 'tiny',
  };

  const proc = startProcess('bulennode', env);
  t.after(proc.stop);
  t.after(() => fs.rmSync(WORKDIR, { recursive: true, force: true }));

  await waitFor(async () => {
    const r = await fetchJson('http://127.0.0.1:5910/api/health');
    return r.status === 200 ? r : null;
  }, { label: 'node health' });

  const sdk = new BulenSdk({ apiBase: 'http://127.0.0.1:5910/api' });

  // buildPaymentLink should be stable and encode memo
  const link = sdk.buildPaymentLink({ to: 'merchant-compat', amount: 12.5, memo: 'memo-compat' });
  assert.match(link, /^bulen:merchant-compat\?amount=12\.5&memo=memo-compat/);

  // create/get payment roundtrip
  const payment = await sdk.createPayment({ to: 'merchant-compat', amount: 42, memo: 'sdk-compat' });
  assert.ok(payment.id, 'payment id should be present');
  assert.strictEqual(payment.amount, 42);
  assert.strictEqual(payment.to, 'merchant-compat');

  const fetched = await sdk.getPayment(payment.id);
  assert.strictEqual(fetched.id, payment.id);
  assert.ok(fetched.status, 'payment status should exist');

  const verified = await sdk.verifyPayment(payment.id);
  assert.strictEqual(verified.id, payment.id);
  assert.strictEqual(typeof verified.paid, 'boolean');

  // version alignment check
  assert.strictEqual(pkg.version, '0.1.4');
});
