import test from 'node:test';
import assert from 'node:assert';
import crypto from 'node:crypto';
import {
  badgeFor,
  computeScore,
  pruneOld,
  rateLimit,
  verifySignature,
  createState,
  parseThresholds,
  parseList,
  buildReferralCode,
  verifyReferralCode,
  applyReferral,
  addBadges,
  isAllowedNode,
} from '../server.js';

test('computeScore clamps inputs and applies log stake weighting', () => {
  const score = computeScore({ uptimePercent: 1.2, stake: 999, reputation: 10, deviceBoost: 2 });
  assert.ok(score > 0);
  const low = computeScore({ uptimePercent: -1, stake: -5, reputation: -5 });
  assert.strictEqual(low, 0);
});

test('badgeFor assigns badges by uptime, device class and stake', () => {
  const badges = badgeFor({ uptimePercent: 0.995, stake: 1500, deviceClass: 'phone-pro' });
  assert.ok(badges.includes('uptime-99'));
  assert.ok(badges.includes('mobile-hero'));
  assert.ok(badges.includes('staker-1k'));
});

test('pruneOld removes expired reports using ttl', () => {
  const state = createState();
  const ttlMs = 1_000;
  const now = Date.now();
  state.reports.set('old', { at: new Date(now - 2_000).toISOString() });
  state.reports.set('fresh', { at: new Date(now - 100).toISOString() });
  pruneOld(state.reports, ttlMs, now);
  assert.ok(!state.reports.has('old'));
  assert.ok(state.reports.has('fresh'));
});

test('rateLimit enforces window and reset', () => {
  const state = createState();
  const ip = '127.0.0.1';
  const windowMs = 1000;
  const max = 2;
  const start = Date.now();
  assert.ok(rateLimit(state.rateBuckets, ip, windowMs, max, start));
  assert.ok(rateLimit(state.rateBuckets, ip, windowMs, max, start + 10));
  assert.strictEqual(rateLimit(state.rateBuckets, ip, windowMs, max, start + 20), false);
  assert.ok(rateLimit(state.rateBuckets, ip, windowMs, max, start + windowMs + 1));
});

test('verifySignature validates HMAC header', () => {
  const secret = 'unit-secret';
  const body = JSON.stringify({ hello: 'world' });
  const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');
  const req = {
    headers: { 'x-bulen-signature': signature },
    rawBody: Buffer.from(body),
  };
  assert.ok(verifySignature(req, secret));
  assert.strictEqual(
    verifySignature(
      { headers: { 'x-bulen-signature': 'deadbeef' }, rawBody: Buffer.from(body) },
      secret,
    ),
    false,
  );
});

test('parsers normalize threshold/list values', () => {
  assert.deepStrictEqual(parseThresholds('5, 1, 1,10'), [1, 5, 10]);
  assert.deepStrictEqual(parseList(' a , ,b '), ['a', 'b']);
});

test('referral codes round-trip and reject tampering', () => {
  const secret = 'ref-secret';
  const code = buildReferralCode('node-abc', secret);
  assert.strictEqual(verifyReferralCode(code, secret), 'node-abc');
  assert.strictEqual(verifyReferralCode(code + 'x', secret), null);
});

test('applyReferral records referral, counts and badges', () => {
  const state = createState();
  const config = {
    referralSecret: 'ref-secret',
    referralBadgeThresholds: [1, 3],
  };
  applyReferral('ref-1', 'node-1', state, config, 0);
  assert.strictEqual(state.referredBy.get('node-1'), 'ref-1');
  assert.strictEqual(state.referralCounts.get('ref-1'), 1);
  assert.ok(state.badges.get('node-1').includes('referred'));
  assert.ok(state.badges.get('ref-1').includes('referrer'));
  // idempotent on repeat
  applyReferral('ref-1', 'node-1', state, config, 0);
  assert.strictEqual(state.referralCounts.get('ref-1'), 1);
  // Hitting next threshold adds badge
  applyReferral('ref-1', 'node-2', state, config, 0);
  applyReferral('ref-1', 'node-3', state, config, 0);
  assert.ok(state.badges.get('ref-1').includes('ambassador-3'));
});

test('isAllowedNode gates by allowlist and referrer', () => {
  const state = createState();
  state.referredBy.set('invited', 'friend-1');
  const config = { friendAllowlist: ['friend-1'] };
  assert.ok(isAllowedNode('friend-1', null, config, state));
  assert.ok(isAllowedNode('invited', null, config, state));
  assert.strictEqual(isAllowedNode('stranger', null, config, state), false);
  assert.ok(isAllowedNode('guest', 'friend-1', config, state));
});
