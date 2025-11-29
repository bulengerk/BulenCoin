/* eslint-disable no-console */
const test = require('node:test');
const assert = require('node:assert');
const { spawn } = require('node:child_process');
const { setTimeout: delay } = require('node:timers/promises');
const path = require('node:path');
const fs = require('node:fs');

const ROOT = path.resolve(__dirname, '..', '..');
const WORKDIR = path.join(ROOT, 'data', 'superlight-test');

function startNode(env) {
  const child = spawn('node', ['src/index.js'], {
    cwd: path.join(ROOT, 'bulennode'),
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
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

async function waitFor(fn, label, timeoutMs = 15000, intervalMs = 300) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const val = await fn();
    if (val) return val;
    await delay(intervalMs);
  }
  throw new Error(`Timed out waiting for ${label}`);
}

test('super-light profile sleeps on low battery and resumes', async (t) => {
  fs.rmSync(WORKDIR, { recursive: true, force: true });
  fs.mkdirSync(WORKDIR, { recursive: true });

  const env = {
    ...process.env,
    NODE_ENV: 'test',
    BULEN_NODE_PROFILE: 'phone-superlight',
    BULEN_DATA_DIR: path.join(WORKDIR, 'node'),
    BULEN_HTTP_PORT: '5250',
    BULEN_P2P_PORT: '5251',
    BULEN_BLOCK_INTERVAL_MS: '1000',
    BULEN_SUPERLIGHT_KEEP_BLOCKS: '64',
    BULEN_SUPERLIGHT_BATTERY_THRESHOLD: '0.2',
    BULEN_ENABLE_FAUCET: 'false',
  };

  const node = startNode(env);
  t.after(() => node.stop());

  const status1 = await waitFor(
    async () => {
      try {
        const res = await fetchJson('http://127.0.0.1:5250/api/status');
        return res.body && res.body.superLight ? res : null;
      } catch (error) {
        return null;
      }
    },
    'superlight status',
  );
  assert.ok(status1.body.superLight);
  assert.strictEqual(status1.body.superLightSleeping, false);

  const low = await fetchJson('http://127.0.0.1:5250/api/device/battery', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ level: 0.1 }),
  });
  assert.strictEqual(low.status, 200);
  assert.strictEqual(low.body.sleeping, true);

  const afterLow = await fetchJson('http://127.0.0.1:5250/api/status');
  assert.strictEqual(afterLow.body.superLightSleeping, true);

  const high = await fetchJson('http://127.0.0.1:5250/api/device/battery', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ level: 0.8 }),
  });
  assert.strictEqual(high.status, 200);
  assert.strictEqual(high.body.sleeping, false);

  const afterResume = await fetchJson('http://127.0.0.1:5250/api/status');
  assert.strictEqual(afterResume.body.superLightSleeping, false);
});
