/* eslint-disable no-console */
const test = require('node:test');
const assert = require('node:assert');
const { spawn } = require('node:child_process');
const { setTimeout: delay } = require('node:timers/promises');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..', '..');
const WORKDIR = path.join(ROOT, 'data', 'fullstack-all');
const STATUS_TOKEN = 'status-token';
const METRICS_TOKEN = 'metrics-token';
const P2P_TOKEN = 'p2p-token';

function startProcess(label, cwd, args, env) {
  const child = spawn('node', args, {
    cwd,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', (chunk) => {
    console.log(`[${label}] ${chunk.toString().trim()}`);
  });
  child.stderr.on('data', (chunk) => {
    console.error(`[${label}][err] ${chunk.toString().trim()}`);
  });
  const stop = () => {
    if (!child.killed) {
      child.kill();
    }
  };
  return { child, stop };
}

async function waitFor(fn, { timeoutMs = 20000, intervalMs = 400, label = 'condition' } = {}) {
  const started = Date.now();
  let lastError;
  while (Date.now() - started < timeoutMs) {
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

function signMessage(privateKeyPem, message) {
  const signer = crypto.createSign('sha256');
  signer.update(message);
  signer.end();
  return signer.sign(privateKeyPem, 'base64');
}

test(
  'full stack: node + explorer + status + payments + wallet sessions',
  { timeout: 45000 },
  async (t) => {
    fs.rmSync(WORKDIR, { recursive: true, force: true });
    fs.mkdirSync(WORKDIR, { recursive: true });

    const baseEnv = { ...process.env, NODE_ENV: 'test' };
    const nodeEnv = {
      ...baseEnv,
      BULEN_HTTP_PORT: '5410',
      BULEN_P2P_PORT: '5411',
      BULEN_DATA_DIR: path.join(WORKDIR, 'node'),
      BULEN_NODE_ID: 'fullstack-all-node',
      BULEN_ENABLE_FAUCET: 'true',
      BULEN_BLOCK_INTERVAL_MS: '600',
      BULEN_LOG_FORMAT: 'tiny',
      BULEN_ALLOW_UNSIGNED_BLOCKS: 'true',
      BULEN_STATUS_TOKEN: STATUS_TOKEN,
      BULEN_METRICS_TOKEN: METRICS_TOKEN,
      BULEN_P2P_TOKEN: P2P_TOKEN,
    };
    const explorerEnv = {
      ...baseEnv,
      EXPLORER_PORT: '5420',
      BULENNODE_API_BASE: 'http://127.0.0.1:5410/api',
      EXPLORER_TITLE: 'Fullstack All Explorer',
      EXPLORER_LOG_FORMAT: 'tiny',
      EXPLORER_STATUS_TOKEN: STATUS_TOKEN,
    };
    const statusEnv = {
      ...baseEnv,
      STATUS_PORT: '5430',
      STATUS_NODES: 'http://127.0.0.1:5410/api/status',
      STATUS_TOKEN,
    };

    const nodeProc = startProcess('bulennode', path.join(ROOT, 'bulennode'), ['src/index.js'], nodeEnv);
    t.after(() => nodeProc.stop());
    const explorerProc = startProcess('explorer', path.join(ROOT, 'explorer'), ['src/server.js'], explorerEnv);
    t.after(() => explorerProc.stop());
    const statusProc = startProcess('status', path.join(ROOT, 'status'), ['src/server.js'], statusEnv);
    t.after(() => statusProc.stop());
    t.after(() => fs.rmSync(WORKDIR, { recursive: true, force: true }));

    await waitFor(async () => {
      const r = await fetchJson('http://127.0.0.1:5410/api/status', {
        headers: { 'x-bulen-status-token': STATUS_TOKEN },
      });
      return r.body ? r : null;
    }, { label: 'node status' });

    // Create payment invoice
    const paymentRes = await fetchJson('http://127.0.0.1:5410/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: 'merchant-all', amount: 75, memo: 'order-fullstack' }),
    });
    assert.strictEqual(paymentRes.status, 201);
    const paymentId = paymentRes.body.id;

    // Fund and pay invoice
    await fetchJson('http://127.0.0.1:5410/api/faucet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: 'alice-all', amount: 500 }),
    });
    await fetchJson('http://127.0.0.1:5410/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'alice-all',
        to: 'merchant-all',
        amount: 80,
        fee: 0,
        memo: 'order-fullstack',
      }),
    });

    // Wait for block inclusion
    await waitFor(async () => {
      const blocks = await fetchJson('http://127.0.0.1:5410/api/blocks?limit=5&offset=0');
      return blocks.body.blocks.some((b) =>
        (b.transactions || []).some((tx) => tx.memo === 'order-fullstack'),
      );
    }, { label: 'block with invoice tx', timeoutMs: 20000 });

    const paid = await fetchJson(`http://127.0.0.1:5410/api/payments/${paymentId}`);
    assert.strictEqual(paid.status, 200);
    assert.strictEqual(paid.body.status, 'paid');

    // Wallet challenge/verify
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'secp256k1' });
    const pubPem = publicKey.export({ type: 'spki', format: 'pem' });
    const challenge = await fetchJson('http://127.0.0.1:5410/api/wallets/challenge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: 'addr-wallet-all', publicKey: pubPem, walletType: 'metamask' }),
    });
    assert.strictEqual(challenge.status, 201);
    const signature = signMessage(privateKey.export({ type: 'pkcs8', format: 'pem' }), challenge.body.message);
    const verified = await fetchJson('http://127.0.0.1:5410/api/wallets/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengeId: challenge.body.id, signature }),
    });
    assert.strictEqual(verified.status, 200);
    assert.ok(verified.body.sessionId);

    const session = await fetchJson(
      `http://127.0.0.1:5410/api/wallets/session/${verified.body.sessionId}`,
    );
    assert.strictEqual(session.status, 200);
    assert.strictEqual(session.body.address, 'addr-wallet-all');

    // Explorer availability
    const explorerHtml = await waitFor(async () => {
      const resp = await fetch('http://127.0.0.1:5420/');
      if (resp.status === 200) {
        const html = await resp.text();
        return html.includes('BulenCoin Explorer') ? html : null;
      }
      return null;
    }, { label: 'explorer homepage' });
    assert.ok(explorerHtml.includes('Latest blocks'));

    // Status aggregator availability
    const statusAgg = await waitFor(async () => {
      const r = await fetchJson('http://127.0.0.1:5430/status');
      return r.body && r.body.nodes && r.body.nodes.length > 0 ? r : null;
    }, { label: 'status aggregation' });
    assert.strictEqual(statusAgg.status, 200);
  },
);
