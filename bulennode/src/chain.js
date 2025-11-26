const crypto = require('crypto');

function hashObject(object) {
  const canonical = JSON.stringify(object);
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

function canonicalBlockView(block) {
  return {
    index: block.index,
    previousHash: block.previousHash,
    chainId: block.chainId,
    timestamp: block.timestamp,
    validator: block.validator,
    validatorStake: block.validatorStake,
    transactions: block.transactions,
    committee: block.committee || [],
    monetary: block.monetary || null,
    finalityCheckpoint: block.finalityCheckpoint || null,
    slashEvents: block.slashEvents || [],
    producerPublicKey: block.producerPublicKey || null,
  };
}

function computeBlockHash(block) {
  return hashObject(canonicalBlockView(block));
}

function creditBalance(state, address, amount) {
  if (!amount || Number.isNaN(amount)) {
    return;
  }
  const account = ensureAccount(state, address);
  account.balance += amount;
  if (state.finalizedSnapshot) {
    const snapshotAccount = ensureAccount(state.finalizedSnapshot, address);
    snapshotAccount.balance += amount;
  }
}

function getTotalStake(state) {
  return Object.values(state.accounts || {}).reduce((sum, acc) => sum + (acc.stake || 0), 0);
}

function normalizeFraction(value, fallback) {
  const numeric = Number(value);
  if (Number.isNaN(numeric) || numeric < 0) {
    return fallback;
  }
  return Math.min(1, numeric);
}

function computeFeeSplits(config, totalFees) {
  const burnFraction = normalizeFraction(config.feeBurnFraction, 0);
  const ecosystemFraction = normalizeFraction(config.feeEcosystemFraction, 0);
  const validatorFraction = Math.max(0, 1 - burnFraction - ecosystemFraction);
  const burned = totalFees * burnFraction;
  const ecosystem = totalFees * ecosystemFraction;
  const validator = totalFees * validatorFraction;
  return { burned, ecosystem, validator };
}

function getLastBlock(state) {
  if (!state.blocks.length) {
    return null;
  }
  return state.blocks[state.blocks.length - 1];
}

function ensureAccount(state, address) {
  if (!state.accounts[address]) {
    state.accounts[address] = {
      balance: 0,
      stake: 0,
      nonce: 0,
      reputation: 0,
    };
  }
  return state.accounts[address];
}

const ALLOWED_ACTIONS = ['transfer', 'stake', 'unstake'];

function validateTransaction(state, transaction) {
  if (!transaction || typeof transaction !== 'object') {
    return { ok: false, reason: 'Invalid transaction payload' };
  }
  const { from, to, amount, fee, memo } = transaction;
  const action = transaction.action || 'transfer';
  if (!ALLOWED_ACTIONS.includes(action)) {
    return { ok: false, reason: 'Invalid action' };
  }
  if (!from) {
    return { ok: false, reason: 'Missing from address' };
  }
  if (action === 'transfer' && !to) {
    return { ok: false, reason: 'Missing to address' };
  }
  if ((action === 'stake' || action === 'unstake') && to && to !== from) {
    return { ok: false, reason: 'Stake/unstake must target own account' };
  }
  if (typeof amount !== 'number' || amount <= 0) {
    return { ok: false, reason: 'Amount must be positive number' };
  }
  if (typeof fee !== 'number' || fee < 0) {
    return { ok: false, reason: 'Fee must be non‑negative number' };
  }
  if (memo !== undefined && typeof memo !== 'string') {
    return { ok: false, reason: 'Memo must be a string when provided' };
  }
  if (memo && memo.length > 256) {
    return { ok: false, reason: 'Memo too long (max 256 chars)' };
  }
  const senderAccount = ensureAccount(state, from);
  const effectiveTo = to || from;
  ensureAccount(state, effectiveTo);
  if (typeof transaction.nonce === 'number') {
    if (!Number.isInteger(transaction.nonce)) {
      return { ok: false, reason: 'Nonce must be integer' };
    }
    if (transaction.nonce <= senderAccount.nonce) {
      return { ok: false, reason: 'Nonce must be greater than current account nonce' };
    }
  }
  if (!state.enableFaucet) {
    if (action === 'transfer' || action === 'stake') {
      const totalCost = amount + fee;
      if (senderAccount.balance < totalCost) {
        return { ok: false, reason: 'Insufficient balance' };
      }
    }
  }
  if (action === 'unstake') {
    if (senderAccount.stake < amount) {
      return { ok: false, reason: 'Insufficient stake to unstake' };
    }
    if (senderAccount.balance < fee) {
      return { ok: false, reason: 'Insufficient balance for fee' };
    }
  }
  return { ok: true };
}

function applyTransaction(state, transaction) {
  const validation = validateTransaction(state, transaction);
  if (!validation.ok) {
    throw new Error(validation.reason);
  }
  const { from, to, amount, fee } = transaction;
  const action = transaction.action || 'transfer';
  const senderAccount = ensureAccount(state, from);
  const receiverAccount = ensureAccount(state, to || from);
  const totalCost = amount + fee;
  if (state.enableFaucet && (action === 'transfer' || action === 'stake')) {
    if (senderAccount.balance < totalCost) {
      // Mint just enough in dev/faucet mode to cover the spend
      senderAccount.balance = totalCost;
    }
  }

  if (action === 'transfer') {
    senderAccount.balance -= totalCost;
    receiverAccount.balance += amount;
  } else if (action === 'stake') {
    senderAccount.balance -= totalCost;
    senderAccount.stake += amount;
  } else if (action === 'unstake') {
    senderAccount.stake -= amount;
    senderAccount.balance += amount;
    senderAccount.balance -= fee;
  }

  if (typeof transaction.nonce === 'number' && Number.isInteger(transaction.nonce)) {
    senderAccount.nonce = Math.max(senderAccount.nonce, transaction.nonce);
  }
}

function distributeProtocolRewards(config, state, block, collectedFees) {
  if (!config || !config.enableProtocolRewards) {
    return;
  }
  const feeSplits = computeFeeSplits(config, collectedFees);
  const blockReward =
    block && block.monetary && typeof block.monetary.minted === 'number'
      ? Number(block.monetary.minted)
      : Number(config.blockReward || 0);
  const validatorPool = feeSplits.validator + blockReward;
  const producerFraction = normalizeFraction(config.blockProducerRewardFraction, 0.4);
  const totalStake = getTotalStake(state);

  const producerPortion = validatorPool * producerFraction;
  creditBalance(state, block.validator, producerPortion);

  const stakePool = validatorPool - producerPortion;
  if (stakePool > 0 && totalStake > 0) {
    for (const [address, account] of Object.entries(state.accounts || {})) {
      const stake = account.stake || 0;
      if (stake <= 0) {
        continue;
      }
      const share = (stake / totalStake) * stakePool;
      creditBalance(state, address, share);
    }
  } else if (stakePool > 0) {
    creditBalance(state, block.validator, stakePool);
  }

  state.feeBurnedTotal = (state.feeBurnedTotal || 0) + feeSplits.burned;
  state.ecosystemPool = (state.ecosystemPool || 0) + feeSplits.ecosystem;
  state.mintedRewardsTotal = (state.mintedRewardsTotal || 0) + blockReward;
}

function applyBlock(config, state, block) {
  const lastBlock = getLastBlock(state);
  if (lastBlock && block.previousHash !== lastBlock.hash) {
    throw new Error('Previous hash mismatch');
  }
  if (lastBlock && block.index !== lastBlock.index + 1) {
    throw new Error('Unexpected block height');
  }
  if (block.chainId && block.chainId !== config.chainId) {
    throw new Error('Block chainId mismatch');
  }

  const expectedHash = computeBlockHash(block);
  if (expectedHash !== block.hash) {
    const allowUnsigned =
      config.allowUnsignedBlocks !== undefined
        ? config.allowUnsignedBlocks
        : process.env.NODE_ENV !== 'production';
    if (!allowUnsigned) {
      throw new Error('Invalid block hash');
    }
    block.hash = expectedHash;
  }

  // Apply transactions
  let collectedFees = 0;
  for (const transaction of block.transactions) {
    // Simple model: skip invalid transactions instead of failing the whole block
    const validation = validateTransaction(state, transaction);
    if (validation.ok) {
      applyTransaction(state, transaction);
      collectedFees += Number(transaction.fee || 0);
    }
  }

  const monetary = computeMonetary(config, block.transactions || []);
  if (block.monetary) {
    if (
      Math.round(block.monetary.totalFees) !== Math.round(monetary.totalFees) ||
      Math.round(block.monetary.burned) !== Math.round(monetary.burned) ||
      Math.round(block.monetary.ecosystem) !== Math.round(monetary.ecosystem)
    ) {
      throw new Error('Monetary summary mismatch');
    }
  }

  distributeProtocolRewards(config, state, block, collectedFees);

  state.blocks.push(block);
}

function createGenesisBlock(config, state) {
  if (state.blocks.length > 0) {
    return;
  }
  const timestamp = config.genesisTimestamp || '2023-01-01T00:00:00.000Z';
  const genesisContent = {
    index: 0,
    previousHash: null,
    chainId: config.chainId,
    timestamp,
    validator: 'genesis',
    validatorStake: 0,
    transactions: [],
    monetary: {
      totalFees: 0,
      burned: 0,
      ecosystem: 0,
      minted: 0,
    },
  };
  const hash = hashObject(genesisContent);
  const genesisBlock = { ...genesisContent, hash };
  state.blocks.push(genesisBlock);
}

function computeMonetary(config, transactions) {
  const totalFees = (transactions || []).reduce(
    (sum, tx) => sum + Number(tx && tx.fee ? tx.fee : 0),
    0,
  );
  const feeSplits = computeFeeSplits(config, totalFees);
  const blockReward = Number(config.blockReward || 0);
  return {
    totalFees,
    burned: feeSplits.burned,
    ecosystem: feeSplits.ecosystem,
    minted: blockReward,
  };
}

function createBlock(config, state, validatorId, transactions, options = {}) {
  const lastBlock = getLastBlock(state);
  const index = lastBlock ? lastBlock.index + 1 : 1;
  const previousHash = lastBlock ? lastBlock.hash : null;
  const timestamp = new Date().toISOString();
  const validatorAccount = ensureAccount(state, validatorId);
  const validatorStake = validatorAccount.stake || 0;
  const blockWithoutHash = {
    index,
    previousHash,
    chainId: config.chainId,
    timestamp,
    validator: validatorId,
    validatorStake,
    transactions,
    committee: options.committee || [],
    monetary: computeMonetary(config, transactions),
    finalityCheckpoint: options.finalityCheckpoint || null,
    slashEvents: options.slashEvents || [],
    producerPublicKey: options.producerPublicKey || null,
  };
  const hash = computeBlockHash(blockWithoutHash);
  return { ...blockWithoutHash, hash };
}

module.exports = {
  createGenesisBlock,
  createBlock,
  applyBlock,
  validateTransaction,
  ensureAccount,
  getLastBlock,
  hashObject,
  getTotalStake,
  distributeProtocolRewards,
  creditBalance,
  computeFeeSplits,
  computeMonetary,
  computeBlockHash,
  canonicalBlockView,
};
