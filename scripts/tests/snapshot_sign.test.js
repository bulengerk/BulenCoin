/* eslint-disable no-console */
const test = require('node:test');
const assert = require('node:assert');
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const { verifyPayload } = require('../../bulennode/src/identity');

const ROOT = path.resolve(__dirname, '..', '..');
const WORKDIR = path.join(ROOT, 'data', 'snapshot-sign');

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

test('snapshot signing endpoint returns verifiable signature', async (t) => {
  fs.rmSync(WORKDIR, { recursive: true, force: true });
  fs.mkdirSync(WORKDIR, { recursive: true });

  const env = {
    NODE_ENV: 'test',
    BULEN_HTTP_PORT: '6815',
    BULEN_P2P_PORT: '6816',
    BULEN_DATA_DIR: path.join(WORKDIR, 'node'),
    BULEN_NODE_ID: 'snap-node',
    BULEN_ENABLE_FAUCET: 'true',
    BULEN_ALLOW_UNSIGNED_BLOCKS: 'true',
    BULEN_BLOCK_INTERVAL_MS: '600',
    BULEN_LOG_FORMAT: 'tiny',
  };

  const proc = startProcess(env);
  t.after(proc.stop);
  t.after(() => fs.rmSync(WORKDIR, { recursive: true, force: true }));

  // wait for health
  let ready = false;
  for (let i = 0; i < 20; i += 1) {
    try {
      const r = await fetchJson('http://127.0.0.1:6815/api/health');
      if (r.status === 200) {
        ready = true;
        break;
      }
    } catch (error) {
      // ignore
    }
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  assert.ok(ready, 'node did not become ready');

  // produce at least one block
  await fetchJson('http://127.0.0.1:6815/api/faucet', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address: 'snap-alice', amount: 10 }),
  });
  await fetchJson('http://127.0.0.1:6815/api/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'snap-alice', to: 'snap-bob', amount: 1, fee: 0 }),
  });

  // wait a bit for block production
  await new Promise((resolve) => setTimeout(resolve, 800));

  const snap = await fetchJson('http://127.0.0.1:6815/api/snapshot-sign');
  assert.strictEqual(snap.status, 200);
  assert.ok(snap.body.signature);
  assert.ok(snap.body.snapshotHash);
  const payload = JSON.stringify({
    height: snap.body.height,
    hash: snap.body.hash,
    snapshotHash: snap.body.snapshotHash,
  });
  const ok = verifyPayload(snap.body.publicKey, payload, snap.body.signature);
  assert.ok(ok, 'signature should verify');
});
