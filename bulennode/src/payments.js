const fs = require('fs');
const path = require('path');

function paymentsFile(config) {
  return path.join(config.dataDir, 'payments.json');
}

function loadPayments(config) {
  try {
    const file = paymentsFile(config);
    const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
    if (Array.isArray(data.payments)) {
      return data.payments;
    }
  } catch (error) {
    // ignore and return empty
  }
  return [];
}

function savePayments(config, payments) {
  const file = paymentsFile(config);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ payments }, null, 2));
}

function normalizeMemo(memo) {
  if (memo === undefined || memo === null) {
    return undefined;
  }
  return String(memo).slice(0, 256);
}

function createPayment(context, payload) {
  const now = Date.now();
  const expiresIn = Number(payload.expiresInSeconds || 900);
  const expiresAt = new Date(now + Math.max(60, expiresIn) * 1000).toISOString();
  const memo = normalizeMemo(payload.memo);
  const payment = {
    id: payload.id || `pay_${now.toString(16)}_${Math.random().toString(16).slice(2, 8)}`,
    to: payload.to,
    amount: Number(payload.amount),
    memo,
    createdAt: new Date(now).toISOString(),
    expiresAt,
    status: 'pending',
    transactionId: null,
  };
  context.payments.push(payment);
  savePayments(context.config, context.payments);
  return payment;
}

function findMatchingTransaction(payment, state, mempool) {
  const matchFn = (tx) =>
    tx &&
    tx.to === payment.to &&
    Number(tx.amount) >= payment.amount &&
    (payment.memo ? tx.memo === payment.memo : true);

  for (const block of state.blocks) {
    const found = block.transactions.find(matchFn);
    if (found) {
      return { type: 'confirmed', txId: found.id, blockIndex: block.index };
    }
  }
  const pendingTx = mempool.find(matchFn);
  if (pendingTx) {
    return { type: 'mempool', txId: pendingTx.id, blockIndex: null };
  }
  return null;
}

function computePaymentStatus(payment, state, mempool) {
  const now = Date.now();
  const isExpired = now > Date.parse(payment.expiresAt || 0);
  const match = findMatchingTransaction(payment, state, mempool);
  if (match && match.type === 'confirmed') {
    return { status: 'paid', transactionId: match.txId, blockIndex: match.blockIndex };
  }
  if (isExpired) {
    return { status: 'expired', transactionId: null, blockIndex: null };
  }
  if (match && match.type === 'mempool') {
    return { status: 'pending_block', transactionId: match.txId, blockIndex: null };
  }
  return { status: 'pending', transactionId: null, blockIndex: null };
}

function updatePaymentStatus(context, payment) {
  const { status, transactionId, blockIndex } = computePaymentStatus(
    payment,
    context.state,
    context.mempool,
  );
  if (payment.status !== status || payment.transactionId !== transactionId) {
    payment.status = status;
    payment.transactionId = transactionId;
    if (blockIndex !== undefined) {
      payment.blockIndex = blockIndex;
    }
    savePayments(context.config, context.payments);
  }
  return payment;
}

function onBlockAccepted(context, block) {
  // Only re-evaluate payments that are not yet paid/expired
  let mutated = false;
  for (const payment of context.payments) {
    if (payment.status === 'paid' || payment.status === 'expired') {
      continue;
    }
    const statusBefore = payment.status;
    updatePaymentStatus(context, payment);
    if (payment.status !== statusBefore) {
      mutated = true;
    }
  }
  if (mutated) {
    savePayments(context.config, context.payments);
  }
}

function getPayment(context, id) {
  return context.payments.find((p) => p.id === id);
}

function paymentSummary(payment) {
  return {
    id: payment.id,
    to: payment.to,
    amount: payment.amount,
    memo: payment.memo,
    createdAt: payment.createdAt,
    expiresAt: payment.expiresAt,
    status: payment.status,
    transactionId: payment.transactionId || null,
    blockIndex: payment.blockIndex || null,
  };
}

module.exports = {
  loadPayments,
  savePayments,
  createPayment,
  updatePaymentStatus,
  onBlockAccepted,
  getPayment,
  paymentSummary,
};
