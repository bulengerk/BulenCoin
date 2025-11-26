/* eslint-disable no-console */
const test = require('node:test');
const assert = require('node:assert');
const { spawn } = require('node:child_process');
const { setTimeout: delay } = require('node:timers/promises');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');

const { canonicalTransactionPayload, deriveAddressFromPublicKey } = require('../../bulennode/src/security');

const ROOT = path.resolve(__dirname, '..', '..');
const WORKDIR = path.join(ROOT, 'data', 'security-guardrails');

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
      if (result) {
        return result;
      }
    } catch (error) {
      lastError = error;
    }
    await delay(intervalMs);
  }
  const error = new Error(`Timed out waiting for ${label}`);
  if (lastError) {
    error.cause = lastError;
  }
  throw error;
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const body = await response.json();
  return { status: response.status, body };
}

function signTransaction(privateKeyPem, transaction, chainId = 'bulencoin-devnet-1') {
  const signer = crypto.createSign('sha256');
  signer.update(canonicalTransactionPayload(transaction, chainId));
  signer.end();
  return signer.sign(privateKeyPem, 'base64');
}

test(
  'security guardrails: signatures, P2P token, rate limiter',
  { timeout: 70000 },
  async (t) => {
    fs.rmSync(WORKDIR, { recursive: true, force: true });
    fs.mkdirSync(WORKDIR, { recursive: true });

    const envBase = { ...process.env, NODE_ENV: 'test' };
    const nodeEnv = {
      ...envBase,
      BULEN_HTTP_PORT: '5310',
      BULEN_P2P_PORT: '5311',
      BULEN_DATA_DIR: path.join(WORKDIR, 'node'),
      BULEN_NODE_ID: 'security-node',
      BULEN_ENABLE_FAUCET: 'true',
      BULEN_REQUIRE_SIGNATURES: 'true',
      BULEN_P2P_TOKEN: 'secret-token',
      BULEN_LOG_FORMAT: 'tiny',
      BULEN_BLOCK_INTERVAL_MS: '1200',
    };

    const nodeProc = startProcess('bulennode', path.join(ROOT, 'bulennode'), ['src/index.js'], nodeEnv);
    t.after(() => nodeProc.stop());
    t.after(() => fs.rmSync(WORKDIR, { recursive: true, force: true }));

    await waitFor(
      async () => {
        const result = await fetchJson('http://127.0.0.1:5310/api/status');
        return result.body ? result : null;
      },
    { label: 'bulennode status endpoint' },
    );

    // Fund account so signature validation is reached instead of balance checks.
    await fetchJson('http://127.0.0.1:5310/api/faucet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: 'alice-unsigned', amount: 100 }),
    });

    // 1) Require signatures rejects unsigned transactions.
    const unsignedTx = await fetchJson('http://127.0.0.1:5310/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'alice-unsigned',
        to: 'bob-unsigned',
        amount: 10,
        fee: 1,
        nonce: 1,
      }),
    });
    assert.strictEqual(unsignedTx.status, 400);
    assert.match(unsignedTx.body.error || '', /signature/i);

    // 2) Signed transaction with matching address is accepted.
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'secp256k1' });
    const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' });
    const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' });
    const derivedAddress = deriveAddressFromPublicKey(publicKeyPem);

    const faucet = await fetchJson('http://127.0.0.1:5310/api/faucet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: derivedAddress, amount: 500 }),
    });
    assert.strictEqual(faucet.status, 200);

    const txPayload = {
      from: derivedAddress,
      to: 'bob-signed',
      amount: 50,
      fee: 1,
      nonce: 1,
      action: 'transfer',
      memo: 'guardrails',
      timestamp: Date.now(),
    };
    const signature = signTransaction(privateKeyPem, txPayload);
    const signedTx = await fetchJson('http://127.0.0.1:5310/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...txPayload, publicKey: publicKeyPem, signature }),
    });
    assert.ok([200, 202].includes(signedTx.status), `expected accepted tx, got ${signedTx.status} ${JSON.stringify(signedTx.body)}`);
    assert.strictEqual(signedTx.body.accepted, true);

    // 3) P2P token must be present.
    const p2pNoToken = await fetchJson('http://127.0.0.1:5310/p2p/tx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dummy: true }),
    });
    assert.strictEqual(p2pNoToken.status, 403);

    const p2pWrongToken = await fetchJson('http://127.0.0.1:5310/p2p/tx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-bulen-p2p-token': 'wrong' },
      body: JSON.stringify({ dummy: true }),
    });
    assert.strictEqual(p2pWrongToken.status, 403);

    // 4) Rate limiter triggers 429 after burst.
    let got429 = false;
    for (let i = 0; i < 80; i += 1) {
      const res = await fetch('http://127.0.0.1:5310/api/status');
      if (res.status === 429) {
        got429 = true;
        break;
      }
    }
    assert.ok(got429, 'Expected at least one 429 from rate limiter during burst');
  },
);
