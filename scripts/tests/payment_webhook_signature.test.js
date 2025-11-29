/* eslint-disable no-console */
const test = require('node:test');
const assert = require('node:assert');
const { spawn } = require('node:child_process');
const { setTimeout: delay } = require('node:timers/promises');
const path = require('node:path');
const fs = require('node:fs');
const http = require('node:http');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..', '..');
const WORKDIR = path.join(ROOT, 'data', 'webhook-signature');

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

async function waitFor(fn, label, timeoutMs = 15000, intervalMs = 250) {
  const started = Date.now();
  let last;
  while (Date.now() - started < timeoutMs) {
    try {
      const val = await fn();
      if (val) return val;
    } catch (error) {
      last = error;
    }
    await delay(intervalMs);
  }
  const err = new Error(`Timed out waiting for ${label}`);
  if (last) err.cause = last;
  throw err;
}

function startWebhookServer(secret) {
  let received = null;
  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks);
      const sig = req.headers['x-bulen-signature'];
      const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');
      received = {
        sig,
        expected,
        matches: sig === expected,
        payload: JSON.parse(raw.toString()),
      };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    });
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve({
        server,
        port: server.address().port,
        get: () => received,
        stop: () => server.close(),
      });
    });
  });
}

test('payment webhook is signed with HMAC', async (t) => {
  fs.rmSync(WORKDIR, { recursive: true, force: true });
  fs.mkdirSync(WORKDIR, { recursive: true });

  const secret = 'test-webhook-secret';
  const webhook = await startWebhookServer(secret);
  t.after(() => webhook.stop());

  const env = {
    ...process.env,
    NODE_ENV: 'test',
    BULEN_HTTP_PORT: '5260',
    BULEN_P2P_PORT: '5261',
    BULEN_DATA_DIR: path.join(WORKDIR, 'node'),
    BULEN_ENABLE_FAUCET: 'true',
    BULEN_BLOCK_INTERVAL_MS: '800',
    BULEN_WEBHOOK_SECRET: secret,
  };
  const node = startNode(env);
  t.after(() => node.stop());

  await waitFor(async () => {
    try {
      const res = await fetchJson('http://127.0.0.1:5260/api/health');
      return res.status === 200;
    } catch (error) {
      return false;
    }
  }, 'bulennode health');

  const headers = { 'Content-Type': 'application/json' };
  await fetchJson('http://127.0.0.1:5260/api/faucet', {
    method: 'POST',
    headers,
    body: JSON.stringify({ address: 'alice-webhook', amount: 5000 }),
  });

  const payment = await fetchJson('http://127.0.0.1:5260/api/payments', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      to: 'merchant-webhook',
      amount: 50,
      memo: 'webhook-test',
      webhookUrl: `http://127.0.0.1:${webhook.port}/hook`,
    }),
  });
  assert.strictEqual(payment.status, 201);

  // Send matching transaction to trigger payment -> paid
  await fetchJson('http://127.0.0.1:5260/api/transactions', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      from: 'alice-webhook',
      to: 'merchant-webhook',
      amount: 50,
      fee: 1,
      memo: 'webhook-test',
      nonce: 1,
    }),
  });

  const webhookResult = await waitFor(
    () => {
      const rec = webhook.get();
      return rec && rec.matches ? rec : null;
    },
    'webhook signature',
    20000,
  );
  assert.ok(webhookResult.matches, 'signature should match');
  assert.strictEqual(webhookResult.payload.event, 'payment.updated');
  assert.strictEqual(webhookResult.payload.payment.status, 'paid');
});
