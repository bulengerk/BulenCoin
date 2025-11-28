const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const logic = require(path.join(__dirname, '..', '..', 'community_logic.js'));

test('age multiplier grows with time and penalises long downtime', () => {
  const young = logic.computeAgeMultiplier(15, 0); // half month
  const mature = logic.computeAgeMultiplier(365, 0); // ~12 months
  assert.ok(mature > young, 'older node should have larger multiplier');
  assert.ok(mature <= 1.5, 'cap at 1.5x');

  const penalised = logic.computeAgeMultiplier(365, 10);
  assert.ok(penalised < mature, 'downtime should reduce age multiplier');
  assert.ok(penalised >= 0.5, 'penalty should respect floor');
});

test('loyalty multiplier respects percent caps and maturity', () => {
  const lowCommit = logic.computeLoyaltyMultiplier(5, 12);
  const targetCommit = logic.computeLoyaltyMultiplier(20, 12);
  const overCommit = logic.computeLoyaltyMultiplier(80, 24);

  assert.ok(targetCommit > lowCommit, 'higher commit should yield higher multiplier');
  assert.ok(overCommit <= 1.5, 'loyalty boost is capped at +50% (1.5x total)');
});

test('combined projection scales baseline rewards', () => {
  const base = { hourly: 1, daily: 24, weekly: 168 };
  const multipliers = {
    ageMultiplier: logic.computeAgeMultiplier(180, 0), // ~6 months
    loyaltyMultiplier: logic.computeLoyaltyMultiplier(25, 18), // near max
  };
  const projected = logic.projectLoyaltyAdjustedRewards(base, multipliers);
  assert.ok(projected.weekly > base.weekly, 'projection should increase with multipliers');
  assert.ok(projected.periodTotal >= projected.weekly, 'period total mirrors weekly');
});
