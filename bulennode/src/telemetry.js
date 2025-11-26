const crypto = require('crypto');
const { computeRewardEstimate } = require('./rewards');

function fetchSafe(...args) {
  if (typeof globalThis.fetch !== 'function') {
    throw new Error('Fetch API is not available; use Node.js >=18 or provide a fetch polyfill');
  }
  return globalThis.fetch(...args);
}

function startRewardsReporter(context) {
  const { config, metrics, state } = context;
  const hubUrl = process.env.BULEN_REWARDS_HUB || config.rewardsHubUrl || '';
  const token = process.env.BULEN_REWARDS_TOKEN || config.rewardsHubToken || '';
  const hmacSecret =
    process.env.BULEN_REWARDS_HMAC_SECRET || config.rewardsHubHmacSecret || '';
  if (!hubUrl || !token) {
    return;
  }
  const intervalMs = Number(process.env.BULEN_REWARDS_INTERVAL_MS || 10 * 60 * 1000);

  const sendReport = async () => {
    try {
      const estimate = computeRewardEstimate(config, metrics);
      const stake = Object.values(state.accounts || {}).reduce(
        (sum, acc) => sum + (acc.stake || 0),
        0,
      );
      const uptimeSeconds = metrics.uptimeSeconds || 0;
      const maxUptime = Number(config.uptimeWindowSeconds || 0) + uptimeSeconds;
      const uptimePercent = maxUptime > 0 ? Math.min(1, uptimeSeconds / maxUptime) : 0;
      const body = {
        nodeId: config.validatorAddress || config.nodeId,
        deviceClass: config.deviceClass,
        stake,
        uptimePercent,
        reputation:
          state.accounts[config.validatorAddress || config.nodeId]?.reputation || 0,
        deviceBoost: estimate.deviceBoost || 1,
      };
      const normalized = hubUrl.endsWith('/') ? hubUrl.slice(0, -1) : hubUrl;
      const bodyString = JSON.stringify(body);
      const signature =
        hmacSecret && hmacSecret.length
          ? crypto.createHmac('sha256', hmacSecret).update(bodyString).digest('hex')
          : null;
      await fetchSafe(`${normalized}/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-rewards-token': token,
          ...(signature ? { 'x-bulen-signature': signature } : {}),
        },
        body: bodyString,
      });
    } catch (error) {
      // best-effort; ignore errors
    }
  };

  const handle = setInterval(sendReport, intervalMs);
  if (Array.isArray(context.timers)) {
    context.timers.push(handle);
  }
  // send once on start
  sendReport();
}

module.exports = {
  startRewardsReporter,
};
