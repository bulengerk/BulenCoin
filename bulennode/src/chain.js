const crypto = require('crypto');

function hashObject(object) {
  const canonical = JSON.stringify(object);
  return crypto.createHash('sha256').update(canonical).digest('hex');
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
  if (action === 'transfer' || action === 'stake') {
    const totalCost = amount + fee;
    if (senderAccount.balance < totalCost) {
      return { ok: false, reason: 'Insufficient balance' };
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

  if (action === 'transfer') {
    senderAccount.balance -= amount + fee;
    receiverAccount.balance += amount;
  } else if (action === 'stake') {
    senderAccount.balance -= amount + fee;
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

function applyBlock(state, block) {
  const lastBlock = getLastBlock(state);
  if (lastBlock && block.previousHash !== lastBlock.hash) {
    throw new Error('Previous hash mismatch');
  }

  const blockWithoutHash = {
    index: block.index,
    previousHash: block.previousHash,
    timestamp: block.timestamp,
    validator: block.validator,
    transactions: block.transactions,
  };
  const expectedHash = hashObject(blockWithoutHash);
  if (expectedHash !== block.hash) {
    throw new Error('Invalid block hash');
  }

  // Apply transactions
  for (const transaction of block.transactions) {
    // Simple model: skip invalid transactions instead of failing the whole block
    const validation = validateTransaction(state, transaction);
    if (validation.ok) {
      applyTransaction(state, transaction);
    }
  }

  state.blocks.push(block);
}

function createGenesisBlock(config, state) {
  if (state.blocks.length > 0) {
    return;
  }
  const timestamp = new Date().toISOString();
  const genesisContent = {
    index: 0,
    previousHash: null,
    timestamp,
    validator: 'genesis',
    transactions: [],
  };
  const hash = hashObject(genesisContent);
  const genesisBlock = { ...genesisContent, hash };
  state.blocks.push(genesisBlock);
}

function createBlock(config, state, validatorId, transactions) {
  const lastBlock = getLastBlock(state);
  const index = lastBlock ? lastBlock.index + 1 : 1;
  const previousHash = lastBlock ? lastBlock.hash : null;
  const timestamp = new Date().toISOString();
  const blockWithoutHash = {
    index,
    previousHash,
    timestamp,
    validator: validatorId,
    transactions,
  };
  const hash = hashObject(blockWithoutHash);
  return { ...blockWithoutHash, hash };
}

module.exports = {
  createGenesisBlock,
  createBlock,
  applyBlock,
  validateTransaction,
  ensureAccount,
  getLastBlock,
};
