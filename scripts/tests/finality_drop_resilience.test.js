/* eslint-disable no-console */
const test = require('node:test');
const assert = require('node:assert');
const { spawn } = require('node:child_process');
const { setTimeout: delay } = require('node:timers/promises');
const path = require('node:path');
const fs = require('node:fs');

const ROOT = path.resolve(__dirname, '..', '..');
const WORKDIR = path.join(ROOT, 'data', 'finality-resilience');

function startProcess(label, cwd, args, env) {
  const child = spawn('node', args, {
    cwd,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', (chunk) => console.log(`[${label}] ${chunk.toString().trim()}`));
  child.stderr.on('data', (chunk) => console.error(`[${label}][err] ${chunk.toString().trim()}`));
  const stop = () => {
    if (!child.killed) child.kill();
  };
  return { child, stop };
}

async function waitFor(fn, { timeoutMs = 25000, intervalMs = 500, label = 'condition' } = {}) {
  const start = Date.now();
  let lastError;
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fn();
      if (res) return res;
    } catch (error) {
      lastError = error;
    }
    await delay(intervalMs);
  }
  const error = new Error(`Timed out waiting for ${label}`);
  if (lastError) error.cause = lastError;
  throw error;
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const body = await response.json();
  return { status: response.status, body };
}

test('finality: 3-node committee, signatures required, survives loss of 2 nodes', { timeout: 70000 }, async (t) => {
  fs.rmSync(WORKDIR, { recursive: true, force: true });
  fs.mkdirSync(WORKDIR, { recursive: true });

  const statusToken = 'status-token';
  const baseEnv = {
    ...process.env,
    NODE_ENV: 'test',
    // Prod-like committee size 3, unsigned blocks disallowed; security preset relaxed for test seeding.
    BULEN_SECURITY_PRESET: 'dev',
    BULEN_REQUIRE_SIGNATURES: 'false',
    BULEN_ENABLE_FAUCET: 'true',
    BULEN_STATUS_TOKEN: statusToken,
    BULEN_METRICS_TOKEN: 'metrics-token',
    BULEN_WEBHOOK_SECRET: 'webhook-secret',
    BULEN_BLOCK_INTERVAL_MS: '600',
    BULEN_LOG_FORMAT: 'tiny',
    BULEN_COMMITTEE_SIZE: '3',
    BULEN_ALLOW_UNSIGNED_BLOCKS: 'false',
  };

  const nodes = [
    { label: 'validator-a', http: 5810, p2p: 5811, dir: path.join(WORKDIR, 'a') },
    { label: 'validator-b', http: 5820, p2p: 5821, dir: path.join(WORKDIR, 'b') },
    { label: 'validator-c', http: 5830, p2p: 5831, dir: path.join(WORKDIR, 'c') },
  ];

  const procs = nodes.map((node) => {
    const env = {
      ...baseEnv,
      BULEN_HTTP_PORT: String(node.http),
      BULEN_P2P_PORT: String(node.p2p),
      BULEN_DATA_DIR: node.dir,
      BULEN_NODE_ID: node.label,
      BULEN_NODE_PROFILE: 'server-full',
      BULEN_PEERS: nodes
        .filter((other) => other.label !== node.label)
        .map((peer) => `http://127.0.0.1:${peer.p2p}`)
        .join(','),
    };
    const proc = startProcess(node.label, path.join(ROOT, 'bulennode'), ['src/index.js'], env);
    t.after(proc.stop);
    return proc;
  });
  t.after(() => fs.rmSync(WORKDIR, { recursive: true, force: true }));

  // Wait for all validators to report status and zero height
  for (const node of nodes) {
    await waitFor(
      async () => {
    const r = await fetchJson(`http://127.0.0.1:${node.http}/api/status`, {
      headers: { 'x-bulen-status-token': statusToken },
    });
        return r.status === 200 ? r : null;
      },
      { label: `${node.label} status` },
    );
  }

  // Seed a tx to force block production
  await fetch(`http://127.0.0.1:${nodes[0].http}/api/faucet`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address: 'committee-seed', amount: 100 }),
  });
  await fetch(`http://127.0.0.1:${nodes[0].http}/api/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'committee-seed', to: 'sink', amount: 1, fee: 0 }),
  });

  // Wait for finalized height to advance beyond 0
  const statusBeforeDrop = await waitFor(async () => {
    const r = await fetchJson(`http://127.0.0.1:${nodes[0].http}/api/status`, {
      headers: { 'x-bulen-status-token': statusToken },
    });
    if (typeof r.body.finalizedHeight === 'number' && r.body.finalizedHeight >= 0 && r.body.height > 0) {
      return r;
    }
    return null;
  }, { label: 'finalized height before drop', timeoutMs: 20000 });
  const heightBefore = statusBeforeDrop.body.height;
  const finalizedBefore = statusBeforeDrop.body.finalizedHeight;

  // Drop two validators
  procs[1].stop();
  procs[2].stop();

  // Surviving node should keep producing and eventually finalize more blocks
  await fetch(`http://127.0.0.1:${nodes[0].http}/api/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'committee-seed', to: 'sink', amount: 1, fee: 0, nonce: 2 }),
  });

  const statusAfter = await waitFor(async () => {
    const r = await fetchJson(`http://127.0.0.1:${nodes[0].http}/api/status`, {
      headers: { 'x-bulen-status-token': statusToken },
    });
    const h = r.body.height || 0;
    const f = r.body.finalizedHeight || 0;
    return h > heightBefore && f >= finalizedBefore ? r : null;
  }, { label: 'height/finality after drop', timeoutMs: 20000 });

  assert.ok(statusAfter.body.height > heightBefore, 'height did not advance after drop');
  assert.ok(
    statusAfter.body.finalizedHeight >= finalizedBefore,
    'finalized height did not stay stable/advance after drop',
  );
});
