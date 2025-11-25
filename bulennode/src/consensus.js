const {
  applyBlock,
  ensureAccount,
  hashObject,
} = require('./chain');

function deepCloneState(state) {
  const clone = {
    chainId: state.chainId,
    blocks: Array.isArray(state.blocks) ? state.blocks.map((block) => ({ ...block })) : [],
    accounts: JSON.parse(JSON.stringify(state.accounts || {})),
  };
  if (state.feeBurnedTotal !== undefined) {
    clone.feeBurnedTotal = state.feeBurnedTotal;
  }
  if (state.ecosystemPool !== undefined) {
    clone.ecosystemPool = state.ecosystemPool;
  }
  if (state.mintedRewardsTotal !== undefined) {
    clone.mintedRewardsTotal = state.mintedRewardsTotal;
  }
  if (state.slashEvents) {
    clone.slashEvents = Array.isArray(state.slashEvents)
      ? state.slashEvents.map((evt) => ({ ...evt }))
      : [];
  }
  if (state.slashRecords) {
    clone.slashRecords = { ...state.slashRecords };
  }
  if (state.equivocations) {
    clone.equivocations = JSON.parse(JSON.stringify(state.equivocations));
  }
  if (state.finalizedHeight !== undefined) {
    clone.finalizedHeight = state.finalizedHeight;
  }
  if (state.finalizedHash !== undefined) {
    clone.finalizedHash = state.finalizedHash;
  }
  if (state.bestTipHash !== undefined) {
    clone.bestTipHash = state.bestTipHash;
  }
  if (state.bestChainWeight !== undefined) {
    clone.bestChainWeight = state.bestChainWeight;
  }
  if (state.finalizedSnapshot) {
    clone.finalizedSnapshot = deepCloneState(state.finalizedSnapshot);
  }
  return clone;
}

function getBlockByHash(state, hash) {
  if (!hash) {
    return null;
  }
  if (state.blockIndex && state.blockIndex[hash]) {
    return state.blockIndex[hash];
  }
  if (Array.isArray(state.blocks)) {
    return state.blocks.find((item) => item.hash === hash) || null;
  }
  return null;
}

function ensureConsensusState(state) {
  if (!state.blockIndex) {
    state.blockIndex = {};
  }
  if (Array.isArray(state.blocks)) {
    for (const block of state.blocks) {
      if (block && block.hash) {
        state.blockIndex[block.hash] = block;
      }
    }
  }
  const tip = state.blocks && state.blocks.length ? state.blocks[state.blocks.length - 1] : null;
  if (!state.equivocations) {
    state.equivocations = {};
  }
  if (!state.slashRecords) {
    state.slashRecords = {};
  }
  if (!state.slashEvents) {
    state.slashEvents = [];
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
  if (state.finalizedHeight === undefined || state.finalizedHeight === null) {
    state.finalizedHeight = tip ? tip.index : 0;
  }
  if (!state.finalizedHash && tip) {
    state.finalizedHash = tip.hash;
  }
  if (!state.finalizedSnapshot) {
    const snapshotHeight = state.finalizedHeight || (tip ? tip.index : 0);
    const snapshotBlocks = Array.isArray(state.blocks)
      ? state.blocks.filter((block) => block.index <= snapshotHeight)
      : [];
    state.finalizedSnapshot = {
      chainId: state.chainId,
      blocks: snapshotBlocks.map((block) => ({ ...block })),
      accounts: JSON.parse(JSON.stringify(state.accounts || {})),
    };
  }
  if (!state.bestTipHash && state.blocks && state.blocks.length) {
    state.bestTipHash = state.blocks[state.blocks.length - 1].hash;
  }
}

function deriveTotalStake(state) {
  return Object.values(state.accounts || {}).reduce((sum, account) => sum + (account.stake || 0), 0);
}

function deriveServerNonce(config, peerId) {
  const seed = `${config.p2pToken || 'bulen'}:${peerId}`;
  return hashObject({ seed }).slice(0, 32);
}

function slashValidator(state, validator, config, reason, height) {
  const penaltyFraction = typeof config.slashPenalty === 'number' ? config.slashPenalty : 0.25;
  const account = ensureAccount(state, validator);
  const currentStake = account.stake || 0;
  const penalty = Math.ceil(currentStake * penaltyFraction);
  account.stake = Math.max(0, currentStake - penalty);
  account.reputation = (account.reputation || 0) - Math.max(1, Math.ceil(penaltyFraction * 10));

  if (state.finalizedSnapshot) {
    const snapshotAccount = ensureAccount(state.finalizedSnapshot, validator);
    const snapshotStake = snapshotAccount.stake || 0;
    snapshotAccount.stake = Math.max(0, snapshotStake - penalty);
    snapshotAccount.reputation =
      (snapshotAccount.reputation || 0) - Math.max(1, Math.ceil(penaltyFraction * 10));
  }

  state.slashEvents.push({
    validator,
    penalty,
    reason,
    height,
    at: new Date().toISOString(),
  });
}

function recordEquivocationAndSlash(state, block, config) {
  const validator = block.validator;
  const height = block.index;
  const key = `${validator}:${height}`;
  const existingForValidator = state.equivocations[validator] || {};
  const existingHash = existingForValidator[height];

  if (existingHash && existingHash !== block.hash) {
    if (!state.slashRecords[key]) {
      slashValidator(state, validator, config, `Equivocation at height ${height}`, height);
      state.slashRecords[key] = true;
    }
  }

  if (!existingHash) {
    existingForValidator[height] = block.hash;
    state.equivocations[validator] = existingForValidator;
  }
}

function collectChain(state, tipHash, finalizedHash) {
  const path = [];
  let currentHash = tipHash;
  const seen = new Set();
  const maxHops = (state.blocks ? state.blocks.length : 0) + Object.keys(state.blockIndex || {}).length + 4;

  while (currentHash) {
    const block = getBlockByHash(state, currentHash);
    if (!block) {
      return { ok: false, reason: 'Unknown ancestor', chain: [] };
    }
    path.push(block);
    if (block.previousHash === null || block.hash === finalizedHash) {
      break;
    }
    if (seen.has(currentHash)) {
      return { ok: false, reason: 'Cycle detected', chain: [] };
    }
    seen.add(currentHash);
    currentHash = block.previousHash;
    if (path.length > maxHops) {
      return { ok: false, reason: 'Exceeded ancestry search limit', chain: [] };
    }
  }

  path.reverse();
  return { ok: true, chain: path };
}

function evaluateChain(config, state, tipHash) {
  ensureConsensusState(state);

  if (!tipHash) {
    return { ok: false, reason: 'Missing tip hash' };
  }

  const finalizedHash = state.finalizedHash || null;
  const finalizedHeight = state.finalizedHeight || 0;
  const baseSnapshot = deepCloneState(state.finalizedSnapshot || state);

  const { ok, reason, chain } = collectChain(state, tipHash, finalizedHash);
  if (!ok) {
    return { ok: false, reason };
  }

  const workingState = deepCloneState(baseSnapshot);
  let weight = 0;
  let tipHeight = finalizedHeight;
  const validatorStakes = {};
  const includedTxIds = new Set();

  for (const block of chain) {
    if (block.index <= finalizedHeight) {
      tipHeight = block.index;
      continue;
    }
    const validatorAccount = ensureAccount(workingState, block.validator);
    const stake = validatorAccount.stake || 0;
    const contribution = Math.max(stake, config.minimumValidatorWeight || 1);
    validatorStakes[block.hash] = contribution;
    weight += contribution;
    try {
      applyBlock(config, workingState, block);
    } catch (error) {
      return { ok: false, reason: error.message };
    }
    tipHeight = block.index;
    for (const tx of block.transactions || []) {
      if (tx && tx.id) {
        includedTxIds.add(tx.id);
      }
    }
  }

  const tipHashResolved = chain.length ? chain[chain.length - 1].hash : tipHash;

  return {
    ok: true,
    weight,
    tipHeight,
    tipHash: tipHashResolved,
    chain: workingState.blocks,
    state: workingState,
    validatorStakes,
    includedTxIds,
  };
}

function isBetterChain(candidate, current) {
  if (!candidate || !candidate.ok) {
    return false;
  }
  if (!current || !current.ok) {
    return true;
  }
  if (candidate.weight !== current.weight) {
    return candidate.weight > current.weight;
  }
  if (candidate.tipHeight !== current.tipHeight) {
    return candidate.tipHeight > current.tipHeight;
  }
  return String(candidate.tipHash || '').localeCompare(String(current.tipHash || '')) > 0;
}

function pruneMempool(context, includedTxIds) {
  if (!includedTxIds || !includedTxIds.size) {
    return;
  }
  const { mempool } = context;
  for (let index = mempool.length - 1; index >= 0; index -= 1) {
    const tx = mempool[index];
    if (tx && includedTxIds.has(tx.id)) {
      mempool.splice(index, 1);
    }
  }
}

function snapshotAtHeight(config, state, targetHeight) {
  const baseSnapshot = deepCloneState(state.finalizedSnapshot || state);
  if (!baseSnapshot.accounts || !Object.keys(baseSnapshot.accounts).length) {
    baseSnapshot.accounts = JSON.parse(JSON.stringify(state.accounts || {}));
  }
  const snapshot = deepCloneState(baseSnapshot);
  const sortedBlocks = (state.blocks || []).slice().sort((a, b) => a.index - b.index);

  for (const block of sortedBlocks) {
    if (block.index <= snapshot.blocks[snapshot.blocks.length - 1]?.index) {
      continue;
    }
    if (block.index > targetHeight) {
      break;
    }
    applyBlock(config, snapshot, block);
  }

  snapshot.blocks = snapshot.blocks.filter((block) => block.index <= targetHeight);
  return snapshot;
}

function updateFinalization(state, evaluation, config) {
  const minDepth = typeof config.finalityMinDepth === 'number' ? config.finalityMinDepth : 2;
  const thresholdFraction =
    typeof config.finalityStakeThreshold === 'number' ? config.finalityStakeThreshold : 0.67;
  const chainBlocks = evaluation.chain || [];
  if (!chainBlocks.length) {
    return;
  }
  const tipHeight = chainBlocks[chainBlocks.length - 1].index;
  const limitHeight = tipHeight - minDepth;
  if (limitHeight <= state.finalizedHeight) {
    return;
  }

  const totalStake = deriveTotalStake(evaluation.state || { accounts: {} });
  const threshold = totalStake * thresholdFraction;
  const seenValidators = new Set();
  let observed = 0;
  let newFinalHeight = state.finalizedHeight;
  let newFinalHash = state.finalizedHash;

  for (const block of chainBlocks) {
    if (block.index <= state.finalizedHeight) {
      continue;
    }
    if (block.index > limitHeight) {
      break;
    }
    const weight = evaluation.validatorStakes[block.hash] || 0;
    if (!seenValidators.has(block.validator)) {
      observed += weight;
      seenValidators.add(block.validator);
    }
    if (observed >= threshold) {
      newFinalHeight = block.index;
      newFinalHash = block.hash;
    }
  }

  if (newFinalHeight > state.finalizedHeight) {
    state.finalizedHeight = newFinalHeight;
    state.finalizedHash = newFinalHash;
    state.finalizedSnapshot = snapshotAtHeight(config, state, newFinalHeight);
  }
}

function handleIncomingBlock(context, block, options = {}) {
  const { state, config } = context;
  ensureConsensusState(state);

  const parent = block.previousHash ? getBlockByHash(state, block.previousHash) : null;
  if (block.index > 0 && !parent) {
    return { accepted: false, reason: 'Missing parent' };
  }
  if (parent && parent.index + 1 !== block.index) {
    return { accepted: false, reason: 'Unexpected height for parent' };
  }

  const recalculatedHash = hashObject({
    index: block.index,
    previousHash: block.previousHash,
    timestamp: block.timestamp,
    validator: block.validator,
    validatorStake: block.validatorStake,
    transactions: block.transactions,
  });
  if (recalculatedHash !== block.hash) {
    return { accepted: false, reason: 'Block hash mismatch' };
  }

  recordEquivocationAndSlash(state, block, config);

  if (typeof state.finalizedHeight === 'number' && block.index <= state.finalizedHeight) {
    return { accepted: false, reason: 'Block is not allowed below finalized height' };
  }
  state.blockIndex[block.hash] = block;

  const currentTipHash = state.bestTipHash || (state.blocks && state.blocks.length
    ? state.blocks[state.blocks.length - 1].hash
    : null);

  const currentEval = currentTipHash ? evaluateChain(config, state, currentTipHash) : null;
  const candidateEval = evaluateChain(config, state, block.hash);

  if (!candidateEval.ok) {
    return { accepted: false, reason: candidateEval.reason };
  }

  const better = isBetterChain(candidateEval, currentEval);
  const extendsCurrent = currentTipHash && block.previousHash === currentTipHash;
  if (!better && !extendsCurrent) {
    return { accepted: false, reason: 'Not a better chain' };
  }

  const previousHashes = new Set((state.blocks || []).map((item) => item.hash));
  state.blocks = candidateEval.chain;
  state.accounts = candidateEval.state.accounts;
  state.bestTipHash = candidateEval.tipHash;
  state.bestChainWeight = candidateEval.weight;
  state.feeBurnedTotal = candidateEval.state.feeBurnedTotal || 0;
  state.ecosystemPool = candidateEval.state.ecosystemPool || 0;
  state.mintedRewardsTotal = candidateEval.state.mintedRewardsTotal || 0;

  pruneMempool(context, candidateEval.includedTxIds);
  updateFinalization(state, candidateEval, config);

  const newBlocks = (state.blocks || []).filter((blk) => !previousHashes.has(blk.hash));
  const orderedNewBlocks = newBlocks.sort((a, b) => a.index - b.index);

  return {
    accepted: true,
    reorg: better && !extendsCurrent,
    newBlocks: orderedNewBlocks,
    weight: candidateEval.weight,
  };
}

module.exports = {
  ensureConsensusState,
  handleIncomingBlock,
  evaluateChain,
  deriveTotalStake,
  recordEquivocationAndSlash,
  slashValidator,
  deriveServerNonce,
};
