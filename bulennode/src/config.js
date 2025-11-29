const path = require('path');
let defaultProtocolVersion = '1.0.0';

try {
  // eslint-disable-next-line global-require, import/no-dynamic-require
  const pkg = require('../package.json');
  if (pkg && typeof pkg.version === 'string') {
    defaultProtocolVersion = pkg.version;
  }
} catch (error) {
  // Keep default protocol version
}

function getEnv(name, defaultValue) {
  if (process.env[name] && process.env[name].length > 0) {
    return process.env[name];
  }
  return defaultValue;
}

function getBoolEnv(name, defaultValue) {
  const value = process.env[name];
  if (value === undefined) {
    return defaultValue;
  }
  const normalized = String(value).toLowerCase();
  if (normalized === '1' || normalized === 'true' || normalized === 'yes') {
    return true;
  }
  if (normalized === '0' || normalized === 'false' || normalized === 'no') {
    return false;
  }
  return defaultValue;
}

function getNumberEnv(name, defaultValue) {
  const value = process.env[name];
  if (value === undefined) {
    return defaultValue;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

function parsePeers(rawPeers) {
  if (!rawPeers) {
    return [];
  }
  return rawPeers
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function parseOrigins(rawOrigins) {
  if (!rawOrigins) {
    return [];
  }
  return rawOrigins
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function parseLoyaltySteps(rawSteps) {
  if (!rawSteps) {
    return [
      { days: 30, multiplier: 1.05 },
      { days: 180, multiplier: 1.1 },
      { days: 365, multiplier: 1.2 },
      { days: 730, multiplier: 1.35 },
      { days: 1825, multiplier: 1.5 },
    ];
  }
  return rawSteps
    .split(',')
    .map((entry) => {
      const [daysStr, multStr] = entry.split(':').map((v) => v.trim());
      const days = Number(daysStr);
      const multiplier = Number(multStr);
      if (Number.isNaN(days) || Number.isNaN(multiplier)) {
        return null;
      }
      return { days, multiplier };
    })
    .filter(Boolean)
    .sort((a, b) => a.days - b.days);
}

function parseDeviceBoosts(rawBoosts) {
  if (!rawBoosts) {
    return {
      phone: 1.15,
      tablet: 1.1,
      raspberry: 1.12,
    };
  }
  return rawBoosts.split(',').reduce((acc, entry) => {
    const [deviceClass, multStr] = entry.split(':').map((v) => v.trim());
    const multiplier = Number(multStr);
    if (deviceClass && !Number.isNaN(multiplier)) {
      acc[deviceClass] = multiplier;
    }
    return acc;
  }, {});
}

function parseGenesisValidators(raw) {
  if (!raw) return [];
  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [address, stakeStr] = entry.split(':').map((v) => v.trim());
      const stake = Number(stakeStr || 0);
      if (!address) return null;
      return { address, stake: Number.isNaN(stake) ? 0 : stake };
    })
    .filter(Boolean);
}

const projectRoot = path.resolve(__dirname, '..', '..');

const profileDefaults = {
  'desktop-full': {
    deviceClass: 'desktop',
    rewardWeight: 0.8,
    nodeRole: 'validator',
    httpPort: 4100,
    p2pPort: 4101,
    blockIntervalMs: 8000,
    enableFaucet: true,
  },
  'server-full': {
    deviceClass: 'server',
    rewardWeight: 1.0,
    nodeRole: 'validator',
    httpPort: 4100,
    p2pPort: 4101,
    blockIntervalMs: 6000,
    enableFaucet: false,
  },
  'mobile-light': {
    deviceClass: 'phone',
    rewardWeight: 0.5,
    nodeRole: 'validator',
    httpPort: 4110,
    p2pPort: 4111,
    blockIntervalMs: 12000,
    enableFaucet: true,
  },
  'tablet-light': {
    deviceClass: 'tablet',
    rewardWeight: 0.6,
    nodeRole: 'validator',
    httpPort: 4112,
    p2pPort: 4113,
    blockIntervalMs: 11000,
    enableFaucet: true,
  },
  'phone-superlight': {
    deviceClass: 'phone',
    rewardWeight: 0.35,
    nodeRole: 'observer',
    httpPort: 4114,
    p2pPort: 4115,
    blockIntervalMs: 15000,
    enableFaucet: false,
  },
  raspberry: {
    deviceClass: 'raspberry',
    rewardWeight: 0.75,
    nodeRole: 'validator',
    httpPort: 4120,
    p2pPort: 4121,
    blockIntervalMs: 9000,
    enableFaucet: true,
  },
  gateway: {
    deviceClass: 'server',
    rewardWeight: 0.9,
    nodeRole: 'observer',
    httpPort: 4130,
    p2pPort: 4131,
    blockIntervalMs: 8000,
    enableFaucet: false,
  },
};

const nodeProfile = getEnv('BULEN_NODE_PROFILE', 'desktop-full');
const selectedProfile = profileDefaults[nodeProfile] || profileDefaults['desktop-full'];

function getProtocolMajor(version) {
  const match = String(version).match(/^(\d+)\./);
  if (!match) {
    return 0;
  }
  const value = Number(match[1]);
  return Number.isNaN(value) ? 0 : value;
}

const securityPreset = getEnv('BULEN_SECURITY_PRESET', 'dev').toLowerCase();
const securityStrict = ['strict', 'prod', 'production', 'mainnet'].includes(securityPreset);

const defaultStatusToken =
  getEnv('BULEN_STATUS_TOKEN', process.env.NODE_ENV === 'test' ? 'status-token' : 'bulen-status');
const defaultMetricsToken =
  getEnv('BULEN_METRICS_TOKEN', process.env.NODE_ENV === 'test' ? 'metrics-token' : 'bulen-metrics');
const defaultP2PToken =
  getEnv('BULEN_P2P_TOKEN', process.env.NODE_ENV === 'test' ? 'p2p-token' : 'bulen-p2p');

const config = {
  chainId: getEnv('BULEN_CHAIN_ID', 'bulencoin-devnet-1'),
  nodeId: getEnv('BULEN_NODE_ID', `node-${Math.random().toString(16).slice(2)}`),
  nodeRole: getEnv('BULEN_NODE_ROLE', selectedProfile.nodeRole), // validator | observer
  nodeProfile,
  deviceClass: selectedProfile.deviceClass,
  rewardWeight: selectedProfile.rewardWeight,
  httpPort: getNumberEnv('BULEN_HTTP_PORT', selectedProfile.httpPort),
  p2pPort: getNumberEnv('BULEN_P2P_PORT', selectedProfile.p2pPort),
  dataDir: getEnv('BULEN_DATA_DIR', path.join(projectRoot, 'data', nodeProfile)),
  nodeKeyPath: getEnv('BULEN_NODE_KEY_FILE', path.join(projectRoot, 'data', nodeProfile, 'node_key.pem')),
  nodeKeyPem: getEnv('BULEN_NODE_PRIVATE_KEY', ''),
  peers: parsePeers(getEnv('BULEN_PEERS', '')),
  blockIntervalMs: getNumberEnv('BULEN_BLOCK_INTERVAL_MS', selectedProfile.blockIntervalMs),
  maxBodySize: getEnv('BULEN_MAX_BODY_SIZE', '128kb'),
  requireSignatures: getBoolEnv(
    'BULEN_REQUIRE_SIGNATURES',
    securityStrict || (process.env.NODE_ENV === 'production' ? true : false),
  ),
  enableFaucet: getBoolEnv('BULEN_ENABLE_FAUCET', false),
  p2pToken: defaultP2PToken,
  p2pTokens: parsePeers(getEnv('BULEN_P2P_TOKENS', '')).filter(Boolean),
  p2pRequireHandshake: getBoolEnv(
    'BULEN_P2P_REQUIRE_HANDSHAKE',
    true,
  ),
  p2pTlsEnabled: getBoolEnv('BULEN_P2P_TLS_ENABLED', false),
  p2pTlsKeyFile: getEnv('BULEN_P2P_TLS_KEY_FILE', ''),
  p2pTlsCertFile: getEnv('BULEN_P2P_TLS_CERT_FILE', ''),
  p2pTlsCaFile: getEnv('BULEN_P2P_TLS_CA_FILE', ''),
  p2pTlsMutualEnabled: getBoolEnv('BULEN_P2P_TLS_MUTUAL', false),
  p2pTlsAllowSelfSigned: getBoolEnv('BULEN_P2P_TLS_ALLOW_SELF_SIGNED', false),
  p2pQuicEnabled: getBoolEnv('BULEN_P2P_QUIC_ENABLED', false),
  p2pQuicPort: getNumberEnv(
    'BULEN_P2P_QUIC_PORT',
    getNumberEnv('BULEN_P2P_PORT', selectedProfile.p2pPort) + 100,
  ),
  telemetryEnabled: getBoolEnv('BULEN_TELEMETRY_ENABLED', false),
  corsOrigins: parseOrigins(getEnv('BULEN_CORS_ORIGINS', '')),
  logFormat: getEnv('BULEN_LOG_FORMAT', 'dev'),
  baseUptimeRewardPerHour: getNumberEnv('BULEN_BASE_UPTIME_REWARD', 1),
  uptimeWindowSeconds: getNumberEnv('BULEN_UPTIME_WINDOW_SECONDS', 300),
  rateLimitWindowMs: getNumberEnv('BULEN_RATE_LIMIT_WINDOW_MS', 15 * 1000),
  rateLimitMaxRequests: getNumberEnv('BULEN_RATE_LIMIT_MAX_REQUESTS', 60),
  walletRequirePassphrase: getBoolEnv('BULEN_WALLET_REQUIRE_PASSPHRASE', securityStrict),
  walletPassphraseMinLength: getNumberEnv('BULEN_WALLET_PASSPHRASE_MIN_LENGTH', 12),
  protocolVersion: getEnv('BULEN_PROTOCOL_VERSION', defaultProtocolVersion),
  loyaltyBoostSteps: parseLoyaltySteps(getEnv('BULEN_LOYALTY_STEPS', '')),
  deviceProtectionBoosts: parseDeviceBoosts(getEnv('BULEN_DEVICE_PROTECTION', '')),
  minimumValidatorWeight: getNumberEnv('BULEN_MIN_VALIDATOR_WEIGHT', 1),
  finalityStakeThreshold: getNumberEnv('BULEN_FINALITY_THRESHOLD', 0.67),
  finalityMinDepth: getNumberEnv('BULEN_FINALITY_MIN_DEPTH', 2),
  slashPenalty: getNumberEnv('BULEN_SLASH_PENALTY', 0.25),
  mempoolMaxSize: getNumberEnv('BULEN_MEMPOOL_MAX_SIZE', 1000),
  mempoolMinFee: getNumberEnv('BULEN_MEMPOOL_MIN_FEE', 0),
  p2pRequireTls: getBoolEnv('BULEN_P2P_REQUIRE_TLS', false),
  metricsToken: defaultMetricsToken,
  statusToken: defaultStatusToken,
  p2pMaxPeers: getNumberEnv('BULEN_P2P_MAX_PEERS', 50),
  p2pFanout: getNumberEnv('BULEN_P2P_FANOUT', 8),
  webhookSecret: getEnv('BULEN_WEBHOOK_SECRET', ''),
  rewardsHubHmacSecret: getEnv('BULEN_REWARDS_HMAC_SECRET', ''),
  superLightMode: getBoolEnv(
    'BULEN_SUPERLIGHT_MODE',
    nodeProfile === 'phone-superlight' || nodeProfile === 'super-light',
  ),
  superLightKeepBlocks: getNumberEnv('BULEN_SUPERLIGHT_KEEP_BLOCKS', 256),
  superLightFinalityBuffer: getNumberEnv('BULEN_SUPERLIGHT_FINALITY_BUFFER', 2),
  superLightBatteryThreshold: getNumberEnv('BULEN_SUPERLIGHT_BATTERY_THRESHOLD', 0.15),
  deviceControlToken: getEnv('BULEN_DEVICE_TOKEN', ''),
  requireWebhookSecret: getBoolEnv(
    'BULEN_REQUIRE_WEBHOOK_SECRET',
    securityStrict || process.env.NODE_ENV === 'production',
  ),
  allowInsecureWebhooks: getBoolEnv(
    'BULEN_ALLOW_INSECURE_WEBHOOKS',
    process.env.NODE_ENV !== 'production' && !securityStrict,
  ),
  securityPreset,
  securityStrict,
  enableProtocolRewards: getBoolEnv('BULEN_ENABLE_PROTOCOL_REWARDS', true),
  blockReward: getNumberEnv('BULEN_BLOCK_REWARD', securityStrict ? 10 : 0),
  feeBurnFraction: getNumberEnv('BULEN_FEE_BURN_FRACTION', 0.3),
  feeEcosystemFraction: getNumberEnv('BULEN_FEE_ECOSYSTEM_FRACTION', 0.1),
  blockProducerRewardFraction: getNumberEnv('BULEN_BLOCK_PRODUCER_FRACTION', 0.4),
  committeeSize: getNumberEnv('BULEN_COMMITTEE_SIZE', 3),
  p2pMaxCertificateEntries: getNumberEnv('BULEN_P2P_MAX_CERT_ENTRIES', 64),
  p2pPeerRateLimitWindowMs: getNumberEnv('BULEN_P2P_PEER_WINDOW_MS', 5000),
  p2pPeerRateLimitMax: getNumberEnv('BULEN_P2P_PEER_MAX_REQUESTS', 40),
  p2pBadCertBanMinutes: getNumberEnv('BULEN_P2P_BAD_CERT_BAN_MIN', 10),
  validatorAllowlist: parsePeers(getEnv('BULEN_VALIDATOR_ALLOWLIST', '')).filter(Boolean),
  nodeKeyRotateDays: getNumberEnv('BULEN_NODE_KEY_ROTATE_DAYS', 0),
  // Default to false everywhere; tests can opt-in via env.
  allowUnsignedBlocks: getBoolEnv('BULEN_ALLOW_UNSIGNED_BLOCKS', false),
  allowEmptyBlocks: getBoolEnv('BULEN_ALLOW_EMPTY_BLOCKS', true),
  allowSingleValidatorCertificate: getBoolEnv(
    'BULEN_ALLOW_SINGLE_VALIDATOR_CERT',
    !securityStrict && process.env.NODE_ENV !== 'production',
  ),
  p2pMaxConcurrent: getNumberEnv('BULEN_P2P_MAX_CONCURRENT', 16),
  genesisValidators: parseGenesisValidators(getEnv('BULEN_GENESIS_VALIDATORS', '')),
  get protocolMajor() {
    return getProtocolMajor(this.protocolVersion);
  },
  allProfiles: profileDefaults,
};

module.exports = config;
