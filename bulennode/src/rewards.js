function createMetrics(config) {
  return {
    startedAt: new Date().toISOString(),
    uptimeSeconds: 0,
    producedBlocks: 0,
    rewardWeight: config.rewardWeight,
    deviceClass: config.deviceClass,
  };
}

function computeLoyaltyBoost(config, metrics) {
  const steps = Array.isArray(config.loyaltyBoostSteps) ? config.loyaltyBoostSteps : [];
  const days = metrics.uptimeSeconds / 86400;
  let boost = 1;
  for (const step of steps) {
    if (days >= step.days) {
      boost = step.multiplier;
    }
  }
  return boost;
}

function computeDeviceProtectionBoost(config, metrics) {
  const map = config.deviceProtectionBoosts || {};
  const boost = map[metrics.deviceClass];
  if (typeof boost === 'number' && boost > 0) {
    return boost;
  }
  return 1;
}

function startUptimeSampler(context) {
  const { config, metrics } = context;
  const intervalSeconds = Math.max(5, Math.min(config.uptimeWindowSeconds, 60));
  const intervalMs = intervalSeconds * 1000;
  const intervalHandle = setInterval(() => {
    metrics.uptimeSeconds += intervalSeconds;
  }, intervalMs);
  if (Array.isArray(context.timers)) {
    context.timers.push(intervalHandle);
  }
}

function onBlockProduced(context) {
  if (context.metrics) {
    context.metrics.producedBlocks += 1;
  }
}

function computeRewardEstimate(config, metrics) {
  const hours = metrics.uptimeSeconds / 3600;
  const loyaltyBoost = computeLoyaltyBoost(config, metrics);
  const deviceBoost = computeDeviceProtectionBoost(config, metrics);
  const hourly =
    config.baseUptimeRewardPerHour * (metrics.rewardWeight || 1) * loyaltyBoost * deviceBoost;
  const total = hours * hourly;
  return {
    hourly,
    total,
    loyaltyBoost,
    deviceBoost,
  };
}

module.exports = {
  createMetrics,
  startUptimeSampler,
  onBlockProduced,
  computeRewardEstimate,
  computeLoyaltyBoost,
  computeDeviceProtectionBoost,
};
