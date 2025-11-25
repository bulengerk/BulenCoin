const config = require('./config');
const { createNodeContext, startBlockProducer, createServer } = require('./server');
const { startUptimeSampler } = require('./rewards');
const { startRewardsReporter } = require('./telemetry');

function validateProductionConfig(conf) {
  const strict = conf.securityStrict || process.env.NODE_ENV === 'production';
  if (!strict) {
    return;
  }
  if (!conf.requireSignatures) {
    throw new Error('Production/strict mode requires BULEN_REQUIRE_SIGNATURES=true');
  }
  if (conf.enableFaucet) {
    throw new Error('Production/strict mode must not expose faucet (set BULEN_ENABLE_FAUCET=false)');
  }
  if (!conf.p2pToken || !conf.p2pToken.length) {
    throw new Error('Production/strict mode requires BULEN_P2P_TOKEN to protect P2P endpoints');
  }
  if (conf.p2pRequireHandshake === false) {
    throw new Error('Production/strict mode requires BULEN_P2P_REQUIRE_HANDSHAKE=true');
  }
  if (conf.p2pRequireTls && !conf.p2pTlsEnabled) {
    throw new Error('Production/strict mode requires TLS when BULEN_P2P_REQUIRE_TLS=true');
  }
  if (!conf.statusToken || !conf.metricsToken) {
    throw new Error('Production/strict mode requires BULEN_STATUS_TOKEN and BULEN_METRICS_TOKEN');
  }
  if (conf.requireWebhookSecret && !conf.webhookSecret) {
    throw new Error('Production/strict mode requires BULEN_WEBHOOK_SECRET for signed webhooks');
  }
}

function main() {
  console.log('Starting BulenNode with config:', {
    chainId: config.chainId,
    nodeId: config.nodeId,
    nodeRole: config.nodeRole,
    nodeProfile: config.nodeProfile,
    deviceClass: config.deviceClass,
    rewardWeight: config.rewardWeight,
    httpPort: config.httpPort,
    securityPreset: config.securityPreset,
    requireSignatures: config.requireSignatures,
    enableFaucet: config.enableFaucet,
    peers: config.peers,
    enableProtocolRewards: config.enableProtocolRewards,
  });

  validateProductionConfig(config);

  const context = createNodeContext(config);
  createServer(context);
  startBlockProducer(context);
  startUptimeSampler(context);
  startRewardsReporter(context);
}

main();
