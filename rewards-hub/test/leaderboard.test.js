import test from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import crypto from 'node:crypto';
import { createApp, createState, buildConfig } from '../server.js';

const token = 'test-token';
const hmacSecret = 'test-hmac-secret';

function startTestServer(overrides = {}) {
  const state = createState();
  const config = buildConfig({
    authToken: token,
    hmacSecret,
    minStake: 50,
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

function sign(body) {
  return crypto.createHmac('sha256', hmacSecret).update(body).digest('hex');
}

test('leaderboard stores reports and enforces token, signature and min stake', async () => {
  const { baseUrl, server } = await startTestServer();

  // Missing token
  let res = await fetch(`${baseUrl}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nodeId: 'node1', stake: 100, uptimePercent: 0.9 }),
  });
  assert.strictEqual(res.status, 403);

  // Below min stake
  const lowBody = JSON.stringify({ nodeId: 'node1', stake: 10, uptimePercent: 0.9 });
  res = await fetch(`${baseUrl}/reports`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-rewards-token': token,
      'x-bulen-signature': sign(lowBody),
    },
    body: lowBody,
  });
  assert.strictEqual(res.status, 400);

  // Valid report
  const validBody = JSON.stringify({
    nodeId: 'node1',
    stake: 1000,
    uptimePercent: 0.995,
    deviceClass: 'desktop',
    reputation: 2,
    deviceBoost: 1.1,
  });
  res = await fetch(`${baseUrl}/reports`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-rewards-token': token,
      'x-bulen-signature': sign(validBody),
    },
    body: validBody,
  });
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.ok(body.score > 0);
  assert.ok(body.badges.includes('staker-1k'));

  // Leaderboard
  res = await fetch(`${baseUrl}/leaderboard`);
  assert.strictEqual(res.status, 200);
  const lb = await res.json();
  assert.strictEqual(lb.count, 1);
  assert.strictEqual(lb.entries[0].nodeId, 'node1');
  assert.ok(lb.entries[0].score > 0);

  server.close();
});
