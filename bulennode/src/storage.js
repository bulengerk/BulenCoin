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

function getStateFile(config) {
  return path.join(config.dataDir, 'state.json');
}

function createEmptyState(config) {
  return {
    chainId: config.chainId,
    blocks: [],
    accounts: {},
    feeBurnedTotal: 0,
    ecosystemPool: 0,
    mintedRewardsTotal: 0,
  };
}

function loadState(config) {
  ensureDirectory(config.dataDir);
  const filePath = getStateFile(config);
  const state = loadJson(filePath, createEmptyState(config));
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
  saveJson(filePath, state);
}

module.exports = {
  loadState,
  saveState,
};
