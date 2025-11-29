/* eslint-disable no-console */
const test = require('node:test');
const assert = require('node:assert');
const { spawn } = require('node:child_process');
const { setTimeout: delay } = require('node:timers/promises');
const path = require('node:path');
const fs = require('node:fs');

const ROOT = path.resolve(__dirname, '..', '..');
const WORKDIR = path.join(ROOT, 'data', 'mempool-fee');

function startProcess(env) {
  const child = spawn('node', ['src/index.js'], {
    cwd: path.join(ROOT, 'bulennode'),
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', (buf) => console.log(`[node] ${buf.toString().trim()}`));
  child.stderr.on('data', (buf) => console.error(`[node][err] ${buf.toString().trim()}`));
  const stop = () => {
    if (!child.killed) child.kill();
  };
  return { child, stop };
}

async function fetchJson(url, options) {
  const res = await fetch(url, options);
  const body = await res.json();
  return { status: res.status, body };
}

test('mempool fee floor rejects low-fee tx and accepts above threshold', { timeout: 30000 }, async (t) => {
  fs.rmSync(WORKDIR, { recursive: true, force: true });
  fs.mkdirSync(WORKDIR, { recursive: true });

  const env = {
    NODE_ENV: 'test',
    BULEN_HTTP_PORT: '6610',
    BULEN_P2P_PORT: '6611',
    BULEN_DATA_DIR: path.join(WORKDIR, 'node'),
    BULEN_NODE_ID: 'fee-node',
    BULEN_ENABLE_FAUCET: 'true',
    BULEN_BLOCK_INTERVAL_MS: '600',
    BULEN_ALLOW_UNSIGNED_BLOCKS: 'true',
    BULEN_LOG_FORMAT: 'tiny',
    BULEN_MEMPOOL_MIN_FEE: '2',
  };

  const proc = startProcess(env);
  t.after(proc.stop);
  t.after(() => fs.rmSync(WORKDIR, { recursive: true, force: true }));

  // wait for node health
  let ready = false;
  for (let i = 0; i < 20; i += 1) {
    try {
      const r = await fetchJson('http://127.0.0.1:6610/api/health');
      if (r.status === 200) {
        ready = true;
        break;
      }
    } catch (error) {
      // ignore
    }
    // eslint-disable-next-line no-await-in-loop
    await delay(300);
  }
  assert.ok(ready, 'node did not become ready');

  await fetchJson('http://127.0.0.1:6610/api/faucet', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address: 'alice-fee', amount: 100 }),
  });

  const lowFee = await fetchJson('http://127.0.0.1:6610/api/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'alice-fee', to: 'bob-fee', amount: 10, fee: 0 }),
  });
  assert.strictEqual(lowFee.status, 400);
  assert.match(lowFee.body.error || '', /fee/i);

  const okFee = await fetchJson('http://127.0.0.1:6610/api/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'alice-fee', to: 'bob-fee', amount: 10, fee: 2 }),
  });
  assert.strictEqual(okFee.status, 202);
  assert.strictEqual(okFee.body.accepted, true);
});
