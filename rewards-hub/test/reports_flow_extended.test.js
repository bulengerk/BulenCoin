import test from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import crypto from 'node:crypto';
import { buildConfig, buildShareSignature, createApp, createState } from '../server.js';

const token = 'flow-token';
const hmacSecret = 'flow-hmac';
const referralSecret = 'flow-ref';

function sign(body) {
  return crypto.createHmac('sha256', hmacSecret).update(body).digest('hex');
}

function startServer(overrides = {}) {
  const state = createState();
  const config = buildConfig({
    authToken: token,
    hmacSecret,
    referralSecret,
    ttlMs: 250,
    minStake: 50,
    rateLimitMax: 50,
    logFormat: 'none',
    ...overrides,
  });
  const app = createApp(config, state);
  return new Promise((resolve) => {
    const server = http.createServer(app).listen(0, () => {
      resolve({
        baseUrl: `http://127.0.0.1:${server.address().port}`,
        server,
        state,
        config,
      });
    });
  });
}

test('reports enforce signatures/token, leaderboard sorts and TTL prunes, share signs payload', async () => {
  const { baseUrl, server, state, config } = await startServer();

  // Reject invalid signature
  let res = await fetch(`${baseUrl}/reports`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-rewards-token': token,
      'x-bulen-signature': 'bad-signature',
    },
    body: JSON.stringify({ nodeId: 'bad', stake: 100, uptimePercent: 0.9 }),
  });
  assert.strictEqual(res.status, 403);

  // Accept valid reports
  const body1 = JSON.stringify({
    nodeId: 'node-strong',
    stake: 2000,
    uptimePercent: 0.99,
    deviceBoost: 1.2,
  });
  res = await fetch(`${baseUrl}/reports`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-rewards-token': token,
      'x-bulen-signature': sign(body1),
    },
    body: body1,
  });
  assert.strictEqual(res.status, 200);

  const body2 = JSON.stringify({ nodeId: 'node-weak', stake: 100, uptimePercent: 0.5 });
  await fetch(`${baseUrl}/reports`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-rewards-token': token,
      'x-bulen-signature': sign(body2),
    },
    body: body2,
  });

  const lb = await (await fetch(`${baseUrl}/leaderboard`)).json();
  assert.strictEqual(lb.count, 2);
  assert.strictEqual(lb.entries[0].nodeId, 'node-strong'); // sorted by score desc

  // Share endpoint signs payload with referral/hmac secret
  const share = await (await fetch(`${baseUrl}/share/node-strong`)).json();
  const expectedSig = buildShareSignature(
    config.referralSecret || config.hmacSecret,
    JSON.stringify({ nodeId: 'node-strong', badges: state.badges.get('node-strong') || [] }),
  );
  assert.strictEqual(share.signature, expectedSig);
  assert.ok((share.badges || []).length > 0);

  // TTL pruning removes old reports
  await new Promise((resolve) => setTimeout(resolve, config.ttlMs + 50));
  const pruned = await (await fetch(`${baseUrl}/leaderboard`)).json();
  assert.strictEqual(pruned.count, 0);

  server.close();
});
