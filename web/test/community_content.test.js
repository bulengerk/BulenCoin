const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const logic = require(path.join(__dirname, '..', '..', 'community_logic.js'));
const html = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8');

test('landing page wires community and partner sections', () => {
  assert.ok(html.includes('id="community"'), 'community section should exist');
  assert.ok(html.includes('id="partners"'), 'partner section should exist');
  assert.ok(html.includes('community_logic.js'), 'community_logic script is loaded');
  assert.ok(
    html.includes('href="#community"') && html.includes('href="#partners"'),
    'navigation links should point to new sections',
  );
});

test('default community snapshot exposes fresh feed and stats', () => {
  const snapshot = logic.buildCommunitySnapshot();
  assert.ok(snapshot.stats.contributors >= 5);
  assert.equal(snapshot.stats.nodes, 8);
  assert.equal(snapshot.stats.mentorHours, 16);
  assert.ok(snapshot.feed.length > 0, 'feed should have entries');
  const [top] = snapshot.feed;
  assert.ok(top.summary.length > 0);
});

test('referral calculator stays within sane bounds for noisy input', () => {
  const result = logic.calculatePartnerPayout({
    role: 'product',
    leads: 0,
    conversionRate: -10, // should be clamped to 0
    avgVolume: 500,
    uptime: 50,
  });
  assert.equal(result.monthlyPayout, 0);
  assert.equal(result.bonus, 0);
  assert.equal(result.poolImpact, 0);
});
