const fs = require('fs');
const path = require('path');

function ensureDirectory(directoryPath) {
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }
}

function loadJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    console.error('Failed to read JSON file', filePath, error);
    return fallback;
  }
}

function saveJson(filePath, value) {
  const directoryPath = path.dirname(filePath);
  ensureDirectory(directoryPath);
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

function computeSnapshotHash(snapshot) {
  const crypto = require('crypto');
  const payload = {
    chainId: snapshot.chainId,
    blocks: snapshot.blocks || [],
    accounts: snapshot.accounts || {},
    feeBurnedTotal: snapshot.feeBurnedTotal || 0,
    ecosystemPool: snapshot.ecosystemPool || 0,
    mintedRewardsTotal: snapshot.mintedRewardsTotal || 0,
  };
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function getStateFile(config) {
  return path.join(config.dataDir, 'state.json');
}

function computeChecksum(value) {
  const crypto = require('crypto');
  const raw = JSON.stringify(value);
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function createEmptyState(config) {
  return {
    chainId: config.chainId,
    blocks: [],
    accounts: {},
    feeBurnedTotal: 0,
    ecosystemPool: 0,
    mintedRewardsTotal: 0,
    checkpoints: [],
  };
}

function loadState(config) {
  ensureDirectory(config.dataDir);
  const filePath = getStateFile(config);
  const raw = loadJson(filePath, createEmptyState(config));
  const { _checksum, ...state } = raw;
  const expected = computeChecksum({ ...state, _checksum: undefined });
  if (_checksum && _checksum !== expected) {
    console.warn('State checksum mismatch – file may be corrupted');
  }
  if (state.finalizedSnapshot && !state.finalizedSnapshot.hash) {
    state.finalizedSnapshot.hash = computeSnapshotHash(state.finalizedSnapshot);
  }
  if (!state.chainId) {
    state.chainId = config.chainId;
  }
  if (!Array.isArray(state.blocks)) {
    state.blocks = [];
  }
  if (!state.accounts || typeof state.accounts !== 'object') {
    state.accounts = {};
  }
  if (typeof state.feeBurnedTotal !== 'number') {
    state.feeBurnedTotal = 0;
  }
  if (typeof state.ecosystemPool !== 'number') {
    state.ecosystemPool = 0;
  }
  if (typeof state.mintedRewardsTotal !== 'number') {
    state.mintedRewardsTotal = 0;
  }
  return state;
}

function saveState(config, state) {
  const filePath = getStateFile(config);
  const withChecksum = { ...state, _checksum: computeChecksum({ ...state }) };
  saveJson(filePath, withChecksum);
}

module.exports = {
  loadState,
  saveState,
  computeSnapshotHash,
};
