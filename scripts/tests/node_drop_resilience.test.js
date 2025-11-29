/* eslint-disable no-console */
const test = require('node:test');
const assert = require('node:assert');
const { spawn } = require('node:child_process');
const { setTimeout: delay } = require('node:timers/promises');
const path = require('node:path');
const fs = require('node:fs');

const ROOT = path.resolve(__dirname, '..', '..');
const WORKDIR = path.join(ROOT, 'data', 'resilience-drop');

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

async function waitFor(fn, { timeoutMs = 20000, intervalMs = 400, label = 'condition' } = {}) {
  const start = Date.now();
  let lastError;
  while (Date.now() - start < timeoutMs) {
    try {
      const result = await fn();
      if (result) return result;
    } catch (error) {
      lastError = error;
    }
    await delay(intervalMs);
  }
  const error = new Error(`Timed out waiting for ${label}`);
  if (lastError) error.cause = lastError;
  throw error;
}

async function fetchJson(url) {
  const response = await fetch(url);
  const body = await response.json();
  return { status: response.status, body };
}

test('resilience: surviving node continues when 2/3 nodes drop', { timeout: 60000 }, async (t) => {
  fs.rmSync(WORKDIR, { recursive: true, force: true });
  fs.mkdirSync(WORKDIR, { recursive: true });

  const baseEnv = {
    ...process.env,
    NODE_ENV: 'test',
    BULEN_LOG_FORMAT: 'tiny',
    BULEN_BLOCK_INTERVAL_MS: '500',
    BULEN_ENABLE_FAUCET: 'true',
  };

  const nodes = [
    { label: 'node-a', http: 5710, p2p: 5711, dir: path.join(WORKDIR, 'a') },
    { label: 'node-b', http: 5720, p2p: 5721, dir: path.join(WORKDIR, 'b') },
    { label: 'node-c', http: 5730, p2p: 5731, dir: path.join(WORKDIR, 'c') },
  ];

  const procs = nodes.map((node) => {
    const env = {
      ...baseEnv,
      BULEN_HTTP_PORT: String(node.http),
      BULEN_P2P_PORT: String(node.p2p),
      BULEN_DATA_DIR: node.dir,
      BULEN_NODE_ID: node.label,
      BULEN_NODE_PROFILE: 'desktop-full',
    };
    const proc = startProcess(node.label, path.join(ROOT, 'bulennode'), ['src/index.js'], env);
    t.after(proc.stop);
    return proc;
  });

  t.after(() => fs.rmSync(WORKDIR, { recursive: true, force: true }));

  // Wait until all nodes respond
  for (const node of nodes) {
    await waitFor(async () => {
      const res = await fetchJson(`http://127.0.0.1:${node.http}/api/status`);
      return res.status === 200 ? res : null;
    }, { label: `${node.label} status` });
  }

  // Seed a tx on node-a so we can watch height advance later
  await fetch(`http://127.0.0.1:${nodes[0].http}/api/faucet`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address: 'resilience-seed', amount: 100 }),
  });
  await fetch(`http://127.0.0.1:${nodes[0].http}/api/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'resilience-seed', to: 'sink', amount: 1, fee: 0 }),
  });

  // Start status service pointed at all three nodes
  const statusEnv = {
    ...baseEnv,
    STATUS_PORT: '5750',
    STATUS_NODES: nodes.map((n) => `http://127.0.0.1:${n.http}/api/status`).join(','),
  };
  const statusProc = startProcess('status', path.join(ROOT, 'status'), ['src/server.js'], statusEnv);
  t.after(statusProc.stop);

  const statusUrl = 'http://127.0.0.1:5750/status';

  // Confirm aggregator sees all three nodes
  await waitFor(async () => {
    const r = await fetchJson(statusUrl);
    return r.body?.aggregate?.nodeCount === 3 ? r : null;
  }, { label: 'status aggregator with 3 nodes' });

  // Drop node-b and node-c abruptly
  procs[1].stop();
  procs[2].stop();

  // Aggregator should degrade to a single healthy node without 500s
  const singleNodeStatus = await waitFor(async () => {
    const r = await fetchJson(statusUrl);
    if (r.status === 200 && r.body?.aggregate?.nodeCount === 1) return r;
    return null;
  }, { label: 'status aggregator after drops', timeoutMs: 15000 });
  assert.strictEqual(singleNodeStatus.body.aggregate.nodeCount, 1);

  // Surviving node should keep producing blocks after the drop
  const before = await fetchJson(`http://127.0.0.1:${nodes[0].http}/api/status`);
  const beforeHeight = before.body.height || before.body.blockHeight || 0;

  // Submit a fresh tx post-drop to force block production
  await fetch(`http://127.0.0.1:${nodes[0].http}/api/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'resilience-seed', to: 'sink', amount: 1, fee: 0, nonce: 2 }),
  });

  await waitFor(async () => {
    const r = await fetchJson(`http://127.0.0.1:${nodes[0].http}/api/status`);
    const height = r.body.height || r.body.blockHeight || 0;
    return height > beforeHeight;
  }, { label: 'height advances after drop', timeoutMs: 15000 });
});
