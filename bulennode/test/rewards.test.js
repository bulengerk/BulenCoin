const test = require('node:test');
const assert = require('node:assert');

const { createMetrics, computeRewardEstimate } = require('../src/rewards');

test('computeRewardEstimate scales with uptime and rewardWeight', () => {
  const config = {
    baseUptimeRewardPerHour: 2,
    rewardWeight: 1.0,
    loyaltyBoostSteps: [{ days: 365, multiplier: 1.2 }],
    deviceProtectionBoosts: { desktop: 1 },
  };
  const metrics = createMetrics(config);
  metrics.uptimeSeconds = 3600;

  const reward = computeRewardEstimate(config, metrics);
  assert.strictEqual(reward.hourly, 2);
  assert.strictEqual(reward.total, 2);

  const lowWeightConfig = {
    baseUptimeRewardPerHour: 2,
    rewardWeight: 0.5,
    loyaltyBoostSteps: [],
    deviceProtectionBoosts: { desktop: 1 },
  };
  const lowWeightMetrics = createMetrics(lowWeightConfig);
  lowWeightMetrics.uptimeSeconds = 7200;

  const lowerReward = computeRewardEstimate(lowWeightConfig, lowWeightMetrics);
  assert.strictEqual(lowerReward.hourly, 1);
  assert.strictEqual(lowerReward.total, 2);
});

test('loyalty and device protection boosts apply over time', () => {
  const config = {
    baseUptimeRewardPerHour: 1,
    rewardWeight: 0.5,
    deviceProtectionBoosts: { phone: 1.2 },
    loyaltyBoostSteps: [
      { days: 30, multiplier: 1.05 },
      { days: 365, multiplier: 1.2 },
    ],
  };
  const metrics = createMetrics(config);
  metrics.deviceClass = 'phone';
  metrics.uptimeSeconds = 400 * 24 * 3600; // 400 days

  const reward = computeRewardEstimate(config, metrics);
  // base (1) * weight (0.5) * device boost (1.2) * loyalty (>=1.2)
  assert.ok(reward.hourly > 0.7);
  assert.strictEqual(reward.loyaltyBoost, 1.2);
  assert.strictEqual(reward.deviceBoost, 1.2);
});
