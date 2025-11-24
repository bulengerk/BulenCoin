const config = require('./config');
const { createNodeContext, startBlockProducer, createServer } = require('./server');
const { startUptimeSampler } = require('./rewards');

function validateProductionConfig(conf) {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }
  if (!conf.requireSignatures) {
    throw new Error('Production requires BULEN_REQUIRE_SIGNATURES=true');
  }
  if (conf.enableFaucet) {
    throw new Error('Production must not expose faucet (set BULEN_ENABLE_FAUCET=false)');
  }
  if (!conf.p2pToken || !conf.p2pToken.length) {
    throw new Error('Production requires BULEN_P2P_TOKEN to protect P2P endpoints');
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
    requireSignatures: config.requireSignatures,
    enableFaucet: config.enableFaucet,
    peers: config.peers,
  });

  validateProductionConfig(config);

  const context = createNodeContext(config);
  createServer(context);
  startBlockProducer(context);
  startUptimeSampler(context);
}

main();
