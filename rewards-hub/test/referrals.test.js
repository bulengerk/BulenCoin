import test from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import crypto from 'node:crypto';
import { createApp, createState, buildConfig } from '../server.js';

const token = 'ref-token';
const hmacSecret = 'ref-hmac';
const referralSecret = 'ref-secret';

function sign(body) {
  return crypto.createHmac('sha256', hmacSecret).update(body).digest('hex');
}

function startServer(overrides = {}) {
  const state = createState();
  const config = buildConfig({
    authToken: token,
    hmacSecret,
    referralSecret,
    friendAllowlist: ['friend-1'],
    logFormat: 'none',
    rateLimitMax: 100,
    ...overrides,
  });
  const app = createApp(config, state);
  return new Promise((resolve) => {
    const server = http.createServer(app).listen(0, () => {
      resolve({ baseUrl: `http://127.0.0.1:${server.address().port}`, server, state });
    });
  });
}

async function postReport(baseUrl, bodyObj, headers = {}) {
  const body = JSON.stringify(bodyObj);
  const res = await fetch(`${baseUrl}/reports`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-rewards-token': token,
      'x-bulen-signature': sign(body),
      ...headers,
    },
    body,
  });
  return res;
}

test('referrals auto-invite nodes and award badges/share token', async () => {
  const { baseUrl, server } = await startServer();

  // Allowlisted friend can report.
  let res = await postReport(baseUrl, {
    nodeId: 'friend-1',
    stake: 200,
    uptimePercent: 0.95,
  });
  assert.strictEqual(res.status, 200);

  // Get referral code for friend-1
  res = await fetch(`${baseUrl}/referrals/code?nodeId=friend-1`, {
    headers: { 'x-rewards-token': token },
  });
  assert.strictEqual(res.status, 200);
  const { code } = await res.json();
  assert.ok(code);

  // Stranger without code is blocked
  res = await postReport(baseUrl, { nodeId: 'stranger', stake: 200, uptimePercent: 0.9 });
  assert.strictEqual(res.status, 403);

  // Invited guest with referral code succeeds
  res = await postReport(
    baseUrl,
    { nodeId: 'guest-1', stake: 200, uptimePercent: 0.97 },
    { 'x-referral-code': code },
  );
  assert.strictEqual(res.status, 200);

  // Check badges
  const guestBadges = await (await fetch(`${baseUrl}/badges/guest-1`)).json();
  assert.ok(guestBadges.badges.includes('referred'));
  const refBadges = await (await fetch(`${baseUrl}/badges/friend-1`)).json();
  assert.ok(refBadges.badges.includes('referrer'));
  assert.ok(refBadges.badges.includes('ambassador-1'));

  // Share endpoint returns signed payload
  const share = await (await fetch(`${baseUrl}/share/guest-1`)).json();
  assert.strictEqual(share.nodeId, 'guest-1');
  assert.ok(share.signature && share.signature.length > 0);

  server.close();
});
