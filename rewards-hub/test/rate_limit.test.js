import test from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import crypto from 'node:crypto';
import { buildConfig, createApp, createState } from '../server.js';

const token = 'rate-token';
const hmacSecret = 'rate-hmac';

function sign(body) {
  return crypto.createHmac('sha256', hmacSecret).update(body).digest('hex');
}

function startServer(overrides = {}) {
  const state = createState();
  const config = buildConfig({
    authToken: token,
    hmacSecret,
    rateLimitMax: 2,
    rateLimitWindowMs: 10_000,
    logFormat: 'none',
    ...overrides,
  });
  const app = createApp(config, state);
  return new Promise((resolve) => {
    const server = http.createServer(app).listen(0, () => {
      resolve({ baseUrl: `http://127.0.0.1:${server.address().port}`, server, state, config });
    });
  });
}

test('rate limiter caps reports per window and badges endpoint works', async () => {
  const { baseUrl, server } = await startServer();

  const body = JSON.stringify({ nodeId: 'node-limited', stake: 200, uptimePercent: 0.9 });
  const headers = {
    'Content-Type': 'application/json',
    'x-rewards-token': token,
    'x-bulen-signature': sign(body),
  };

  let res = await fetch(`${baseUrl}/reports`, { method: 'POST', headers, body });
  assert.strictEqual(res.status, 200);
  res = await fetch(`${baseUrl}/reports`, { method: 'POST', headers, body });
  assert.strictEqual(res.status, 200);
  res = await fetch(`${baseUrl}/reports`, { method: 'POST', headers, body });
  assert.strictEqual(res.status, 429);

  const badgeRes = await fetch(`${baseUrl}/badges/node-limited`);
  assert.strictEqual(badgeRes.status, 200);
  const badges = await badgeRes.json();
  assert.deepStrictEqual(badges.nodeId, 'node-limited');

  server.close();
});
