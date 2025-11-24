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
  peers: parsePeers(getEnv('BULEN_PEERS', '')),
  blockIntervalMs: getNumberEnv('BULEN_BLOCK_INTERVAL_MS', selectedProfile.blockIntervalMs),
  maxBodySize: getEnv('BULEN_MAX_BODY_SIZE', '128kb'),
  requireSignatures: getBoolEnv(
    'BULEN_REQUIRE_SIGNATURES',
    process.env.NODE_ENV === 'production' ? true : false,
  ),
  enableFaucet: getBoolEnv('BULEN_ENABLE_FAUCET', (() => {
    if (process.env.NODE_ENV === 'production') {
      return false;
    }
    if (typeof selectedProfile.enableFaucet === 'boolean') {
      return selectedProfile.enableFaucet;
    }
    return process.env.NODE_ENV !== 'production';
  })()),
  p2pToken: getEnv('BULEN_P2P_TOKEN', ''),
  telemetryEnabled: getBoolEnv('BULEN_TELEMETRY_ENABLED', false),
  corsOrigins: parseOrigins(getEnv('BULEN_CORS_ORIGINS', '')),
  logFormat: getEnv('BULEN_LOG_FORMAT', 'dev'),
  baseUptimeRewardPerHour: getNumberEnv('BULEN_BASE_UPTIME_REWARD', 1),
  uptimeWindowSeconds: getNumberEnv('BULEN_UPTIME_WINDOW_SECONDS', 300),
  rateLimitWindowMs: getNumberEnv('BULEN_RATE_LIMIT_WINDOW_MS', 15 * 1000),
  rateLimitMaxRequests: getNumberEnv('BULEN_RATE_LIMIT_MAX_REQUESTS', 60),
  protocolVersion: getEnv('BULEN_PROTOCOL_VERSION', defaultProtocolVersion),
  loyaltyBoostSteps: parseLoyaltySteps(getEnv('BULEN_LOYALTY_STEPS', '')),
  deviceProtectionBoosts: parseDeviceBoosts(getEnv('BULEN_DEVICE_PROTECTION', '')),
  get protocolMajor() {
    return getProtocolMajor(this.protocolVersion);
  },
  allProfiles: profileDefaults,
};

module.exports = config;
