const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const logic = require(path.join(__dirname, '..', '..', 'community_logic.js'));

test('buildCommunitySnapshot filters stale events and aggregates stats', () => {
  const now = Date.now();
  const events = [
    { handle: 'fresh', mentorHours: 2, nodes: 1, impact: 1.2, timestamp: now - 2 * 24 * 60 * 60 * 1000 },
    { handle: 'stale', mentorHours: 4, nodes: 5, impact: 5, timestamp: now - 20 * 24 * 60 * 60 * 1000 },
  ];
  const snapshot = logic.buildCommunitySnapshot(events, now);
  assert.equal(snapshot.stats.contributors, 1);
  assert.equal(snapshot.stats.nodes, 1);
  assert.equal(snapshot.stats.mentorHours, 2);
  assert.equal(snapshot.feed.length, 1);
  assert.equal(snapshot.feed[0].handle, 'fresh');
});

test('calculatePartnerPayout combines base and reliability bonus per role', () => {
  const result = logic.calculatePartnerPayout({
    role: 'infra',
    leads: 10,
    conversionRate: 50,
    avgVolume: 100,
    uptime: 99,
  });
  // Converted deals = 5, gross volume = 500, base cut = 50 (10%)
  assert.ok(result.monthlyPayout > 50, 'payout should include bonus');
  assert.ok(result.bonus > 0, 'bonus should be positive with high uptime');
  assert.equal(result.poolImpact, 10); // 2% of 500
});

test('calculatePartnerPayout clamps inputs and handles creator role', () => {
  const result = logic.calculatePartnerPayout({
    role: 'creator',
    leads: 4,
    conversionRate: 140, // will clamp to 100
    avgVolume: 10,
    uptime: 120, // clamps to 100
  });
  // Converted deals = 4, gross = 40, base cut = 2.4 (6%)
  assert.equal(result.convertedDeals, 4);
  assert.ok(result.monthlyPayout >= 2.4);
  assert.ok(result.bonus <= result.monthlyPayout);
});

test('generateReferralCode is deterministic for the same inputs', () => {
  const codeA = logic.generateReferralCode('alpha-handle', 'contact@example.com', 1700000000000);
  const codeB = logic.generateReferralCode('alpha-handle', 'contact@example.com', 1700000000000);
  const codeC = logic.generateReferralCode('alpha-handle', 'contact@example.com', 1700000001000);
  assert.equal(codeA, codeB);
  assert.notEqual(codeA, codeC);
  assert.match(codeA, /^BULEN-ALPHA-HANDLE-[A-Z0-9]{6}$/);
});
