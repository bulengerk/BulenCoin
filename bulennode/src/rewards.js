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

function computeEfficiencyBoost(metrics) {
  const watts = Number(metrics.powerWatts || 0);
  if (Number.isNaN(watts) || watts <= 0) return 1;
  // Simple tiering: reward lower power draw with a modest boost.
  if (watts <= 5) return 1.2;
  if (watts <= 10) return 1.1;
  if (watts <= 20) return 1.05;
  return 1;
}

function startUptimeSampler(context) {
  const { config, metrics } = context;
  const intervalSeconds = Math.max(5, Math.min(config.uptimeWindowSeconds, 60));
  const intervalMs = intervalSeconds * 1000;
  const intervalHandle = setInterval(() => {
    if (context.superLightSleeping) {
      return;
    }
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
  const efficiencyBoost = computeEfficiencyBoost(metrics);
  const hourly =
    config.baseUptimeRewardPerHour *
    (metrics.rewardWeight || 1) *
    loyaltyBoost *
    deviceBoost *
    efficiencyBoost;
  const total = hours * hourly;
  return {
    hourly,
    total,
    loyaltyBoost,
    deviceBoost,
    efficiencyBoost,
  };
}

function computeRewardProjection(config, metrics, options = {}) {
  const metricsOverride = { ...metrics };
  if (options.deviceClass) {
    metricsOverride.deviceClass = options.deviceClass;
  }
  const base = computeRewardEstimate(config, metricsOverride);
  const stake = Math.max(0, Number(options.stake || 0));
  const stakeWeight = Math.min(3, 1 + stake / 10000);
  const uptimeHoursPerDay = Math.max(
    0,
    Math.min(24, Number(options.uptimeHoursPerDay || 24)),
  );
  const days = Math.max(1, Math.min(30, Number(options.days || 7)));
  const hourly = base.hourly * stakeWeight;
  const daily = hourly * uptimeHoursPerDay;
  const weekly = daily * Math.min(7, days);
  const periodTotal = daily * days;
  return {
    hourly,
    daily,
    weekly,
    periodTotal,
    stakeWeight,
    uptimeHoursPerDay,
    days,
    loyaltyBoost: base.loyaltyBoost,
    deviceBoost: base.deviceBoost,
    efficiencyBoost: base.efficiencyBoost,
  };
}

module.exports = {
  createMetrics,
  startUptimeSampler,
  onBlockProduced,
  computeRewardEstimate,
  computeLoyaltyBoost,
  computeDeviceProtectionBoost,
  computeEfficiencyBoost,
  computeRewardProjection,
};
