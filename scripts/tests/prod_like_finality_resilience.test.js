/* eslint-disable no-console */
const test = require('node:test');
const assert = require('node:assert');
const { spawn } = require('node:child_process');
const { setTimeout: delay } = require('node:timers/promises');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { deriveAddressFromPublicKey } = require('../../bulennode/src/identity');

const ROOT = path.resolve(__dirname, '..', '..');
const WORKDIR = path.join(ROOT, 'data', 'prod-finality');

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

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const body = await response.json();
  return { status: response.status, body };
}

test(
  'prod-like committee=3 with signatures survives drop of 2 nodes',
  { timeout: 90000 },
  async (t) => {

fs.rmSync(WORKDIR, { recursive: true, force: true });
fs.mkdirSync(WORKDIR, { recursive: true });

const validators = Array.from({ length: 3 }).map(() => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'secp256k1' });
  const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' });
  const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' });
  const address = deriveAddressFromPublicKey(publicKeyPem);
  return { privateKeyPem, publicKeyPem, address, stake: 1000 };
});
const genesisValidatorsEnv = validators.map((v) => `${v.address}:${v.stake}`).join(',');

const baseEnv = {

      ...process.env,
      NODE_ENV: 'test',
      BULEN_SECURITY_PRESET: 'strict',
      BULEN_REQUIRE_SIGNATURES: 'true',
      BULEN_COMMITTEE_SIZE: '3',
      BULEN_BLOCK_INTERVAL_MS: '600',
      BULEN_ENABLE_FAUCET: 'false',
      BULEN_STATUS_TOKEN: 'status-token',
      BULEN_METRICS_TOKEN: 'metrics-token',
      BULEN_WEBHOOK_SECRET: 'webhook-secret',
      BULEN_P2P_TOKEN: 'finality-token',
      BULEN_PEERS: '',
      BULEN_LOG_FORMAT: 'tiny',
      BULEN_ALLOW_UNSIGNED_BLOCKS: 'false',
      BULEN_ALLOW_EMPTY_BLOCKS: 'true',
      BULEN_GENESIS_VALIDATORS: genesisValidatorsEnv,
      BULEN_ALLOW_SINGLE_VALIDATOR_CERT: 'true',
    };

    const basePort = 6810; // avoid clashes with other tests
    const peerList = [
      'http://127.0.0.1:6810',
      'http://127.0.0.1:6820',
      'http://127.0.0.1:6830',
    ].join(',');
    const nodes = [
      { label: 'val1', http: basePort + 0, p2p: basePort + 1, dir: path.join(WORKDIR, 'val1') },
      { label: 'val2', http: basePort + 10, p2p: basePort + 11, dir: path.join(WORKDIR, 'val2') },
      { label: 'val3', http: basePort + 20, p2p: basePort + 21, dir: path.join(WORKDIR, 'val3') },
    ];

    const procs = nodes.map((node, idx) => {
      const validator = validators[idx];
      const env = {
        ...baseEnv,
        BULEN_HTTP_PORT: String(node.http),
        BULEN_P2P_PORT: String(node.p2p),
        BULEN_DATA_DIR: node.dir,
        BULEN_NODE_ID: node.label,
        BULEN_NODE_PROFILE: 'server-full',
        BULEN_STATUS_TOKEN: baseEnv.BULEN_STATUS_TOKEN,
        BULEN_METRICS_TOKEN: baseEnv.BULEN_METRICS_TOKEN,
        BULEN_WEBHOOK_SECRET: baseEnv.BULEN_WEBHOOK_SECRET,
        BULEN_NODE_PRIVATE_KEY: validator.privateKeyPem,
      };
      env.BULEN_PEERS = peerList;
      const proc = startProcess(node.label, path.join(ROOT, 'bulennode'), ['src/index.js'], env);
      t.after(proc.stop);
      return proc;
    });

    t.after(() => fs.rmSync(WORKDIR, { recursive: true, force: true }));

    // Wait for all nodes up
    for (const node of nodes) {
      await waitFor(async () => {
      const res = await fetchJson(`http://127.0.0.1:${node.http}/api/status`, {
        headers: { 'x-bulen-status-token': baseEnv.BULEN_STATUS_TOKEN },
      });
      return res.status === 200 ? res : null;
    }, { label: `${node.label} status` });
  }

    // Wait for first height growth with strict/signatures
    const before = await waitFor(async () => {
      const res = await fetchJson(`http://127.0.0.1:${nodes[0].http}/api/status`, {
        headers: { 'x-bulen-status-token': baseEnv.BULEN_STATUS_TOKEN },
      });
      return res.body && typeof res.body.height === 'number' && res.body.height >= 1 ? res : null;
    }, { label: 'initial height', timeoutMs: 30000 });
    const beforeHeight = before.body.height || 0;

    // Drop two validators
    procs[1].stop();
    procs[2].stop();

    // Remaining node should continue to advance height (no quorum, but tip grows)
    const advanced = await waitFor(async () => {
      const res = await fetchJson(`http://127.0.0.1:${nodes[0].http}/api/status`, {
        headers: { 'x-bulen-status-token': baseEnv.BULEN_STATUS_TOKEN },
      });
      return res.body.height > beforeHeight ? res : null;
    }, { label: 'height advances after validator loss', timeoutMs: 20000 });
    assert.ok(advanced.body.height > beforeHeight);
  },
);
