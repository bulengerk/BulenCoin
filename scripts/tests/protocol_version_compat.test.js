/* eslint-disable no-console */
const test = require('node:test');
const assert = require('node:assert');
const { spawn } = require('node:child_process');
const { setTimeout: delay } = require('node:timers/promises');
const path = require('node:path');
const fs = require('node:fs');

const ROOT = path.resolve(__dirname, '..', '..');
const WORKDIR = path.join(ROOT, 'data', 'protocol-compat-live');
const STATUS_TOKEN = 'status-token';

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

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  let body = null;
  try {
    body = await response.json();
  } catch (_err) {
    body = null;
  }
  return { status: response.status, body };
}

async function waitForStatus(port, { timeoutMs = 15000 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/status`, {
        headers: { 'x-bulen-status-token': STATUS_TOKEN },
      });
      if (res.ok) return true;
    } catch (_err) {
      // ignore until timeout
    }
    // eslint-disable-next-line no-await-in-loop
    await delay(300);
  }
  throw new Error(`Node on port ${port} did not become ready`);
}

test('protocol compatibility: same major accepted, missing header accepted, different major rejected', async (t) => {
  fs.rmSync(WORKDIR, { recursive: true, force: true });
  fs.mkdirSync(WORKDIR, { recursive: true });

  const baseEnv = {
    NODE_ENV: 'test',
    BULEN_SECURITY_PRESET: 'dev',
    BULEN_REQUIRE_SIGNATURES: 'false',
    BULEN_ALLOW_UNSIGNED_BLOCKS: 'true',
    BULEN_ALLOW_EMPTY_BLOCKS: 'true',
    BULEN_P2P_REQUIRE_HANDSHAKE: 'false',
    BULEN_P2P_TOKEN: 'proto-token',
    BULEN_LOG_FORMAT: 'tiny',
    BULEN_PEERS: '',
    BULEN_BLOCK_INTERVAL_MS: '700',
    BULEN_STATUS_TOKEN: STATUS_TOKEN,
    BULEN_METRICS_TOKEN: 'metrics-token',
  };

  const node = startProcess('proto-main', {
    ...baseEnv,
    BULEN_PROTOCOL_VERSION: '1.2.0',
    BULEN_HTTP_PORT: '6910',
    BULEN_P2P_PORT: '6911',
    BULEN_DATA_DIR: path.join(WORKDIR, 'node-main'),
  });
  t.after(node.stop);
  t.after(() => fs.rmSync(WORKDIR, { recursive: true, force: true }));

  await waitForStatus(6910);

  // Same major (1.x) should be accepted.
  const sameMajor = await fetchJson('http://127.0.0.1:6910/p2p/tx', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-bulen-p2p-token': 'proto-token',
      'x-bulen-protocol-version': '1.4.3',
    },
    body: JSON.stringify({ transaction: { id: 'tx-same-major' } }),
  });
  assert.strictEqual(sameMajor.status, 200);

  // Missing header should be accepted for backward compatibility.
  const missingHeader = await fetchJson('http://127.0.0.1:6910/p2p/tx', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-bulen-p2p-token': 'proto-token',
    },
    body: JSON.stringify({ transaction: { id: 'tx-no-header' } }),
  });
  assert.strictEqual(missingHeader.status, 200);

  // Different major (2.x) should be rejected.
  const diffMajor = await fetchJson('http://127.0.0.1:6910/p2p/tx', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-bulen-p2p-token': 'proto-token',
      'x-bulen-protocol-version': '2.0.0',
    },
    body: JSON.stringify({ transaction: { id: 'tx-different-major' } }),
  });
  assert.strictEqual(diffMajor.status, 400);
  assert.ok(diffMajor.body && typeof diffMajor.body.error === 'string');
});
