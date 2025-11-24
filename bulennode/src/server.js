const express = require('express');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const cors = require('cors');
const {
  validateTransaction,
  applyBlock,
  createBlock,
  createGenesisBlock,
  ensureAccount,
} = require('./chain');
const { loadState, saveState } = require('./storage');
const { broadcastTransaction, broadcastBlock } = require('./p2p');
const {
  verifyTransactionSignature,
  createRateLimiter,
  verifyP2PToken,
  verifyProtocolVersion,
} = require('./security');
const { createMetrics, computeRewardEstimate } = require('./rewards');
const payments = require('./payments');
const wallets = require('./wallets');

function createNodeContext(config) {
  const state = loadState(config);
  createGenesisBlock(config, state);
  const mempool = [];
  const context = {
    config,
    state,
    mempool,
    payments: payments.loadPayments(config),
    walletStore: wallets.loadStore(config),
    metrics: createMetrics(config),
    timers: [],
  };
  return context;
}

function startBlockProducer(context) {
  const { config, state, mempool } = context;
  if (config.nodeRole !== 'validator') {
    console.log('Node role is observer; automatic block production disabled');
    return;
  }
  const intervalHandle = setInterval(async () => {
    if (!mempool.length) {
      return;
    }
    const transactionsToInclude = mempool.splice(0, mempool.length);
    const block = createBlock(config, state, config.nodeId, transactionsToInclude);
    try {
      applyBlock(state, block);
      saveState(config, state);
      await broadcastBlock(config, block);
      const { onBlockProduced } = require('./rewards'); // lazy require to avoid cycles
      onBlockProduced(context);
      payments.onBlockAccepted(context, block);
      console.log(
        `Produced block #${block.index} with ${block.transactions.length} txs (hash=${block.hash.slice(
          0,
          10,
        )}...)`,
      );
    } catch (error) {
      console.error('Failed to apply produced block', error.message);
      // Return transactions back to mempool if block application fails
      mempool.unshift(...transactionsToInclude);
    }
  }, config.blockIntervalMs);
  if (Array.isArray(context.timers)) {
    context.timers.push(intervalHandle);
  }
}

function createServer(context) {
  const { config, state, mempool, metrics } = context;
  const app = express();

  app.use(
    cors({
      origin(origin, callback) {
        if (!config.corsOrigins.length) {
          callback(null, true);
          return;
        }
        if (!origin) {
          callback(null, true);
          return;
        }
        if (config.corsOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
    }),
  );
  app.use(morgan(config.logFormat || 'dev'));
  app.use(bodyParser.json({ limit: config.maxBodySize }));
  app.use(
    createRateLimiter({
      windowMs: 15 * 1000,
      max: 60,
    }),
  );

  app.get('/healthz', (request, response) => {
    response.json({ status: 'ok' });
  });

  app.get('/api/health', (request, response) => {
    response.json({ status: 'ok' });
  });

  app.get('/api/status', (request, response) => {
    const latest = state.blocks[state.blocks.length - 1];
    const reward = computeRewardEstimate(config, metrics);
    response.json({
      chainId: state.chainId,
      nodeId: config.nodeId,
      nodeRole: config.nodeRole,
      nodeProfile: config.nodeProfile,
      deviceClass: config.deviceClass,
      rewardWeight: config.rewardWeight,
      height: latest ? latest.index : 0,
      latestHash: latest ? latest.hash : null,
      peers: config.peers,
      mempoolSize: mempool.length,
      accountsCount: Object.keys(state.accounts).length,
      protocolVersion: config.protocolVersion,
      protocolMajor: config.protocolMajor,
      metrics: {
        startedAt: metrics.startedAt,
        uptimeSeconds: metrics.uptimeSeconds,
        producedBlocks: metrics.producedBlocks,
        uptimeRewardEstimateHourly: reward.hourly,
        uptimeRewardEstimateTotal: reward.total,
        loyaltyBoost: reward.loyaltyBoost,
        deviceBoost: reward.deviceBoost,
      },
      payments: {
        total: context.payments.length,
        pending: context.payments.filter((p) => p.status === 'pending').length,
      },
    });
  });

  app.get('/api/info', (request, response) => {
    // Lazy require to avoid issues if package.json cannot be loaded for some reason
    let version = '0.0.0';
    try {
      // eslint-disable-next-line global-require, import/no-dynamic-require
      version = require('../package.json').version || version;
    } catch (error) {
      // Ignore and keep default version
    }
    response.json({
      version,
      chainId: state.chainId,
      nodeId: config.nodeId,
      nodeRole: config.nodeRole,
      nodeProfile: config.nodeProfile,
      deviceClass: config.deviceClass,
      requireSignatures: config.requireSignatures,
      enableFaucet: config.enableFaucet,
      protocolVersion: config.protocolVersion,
      protocolMajor: config.protocolMajor,
    });
  });

  app.get('/api/blocks', (request, response) => {
    const limit = Math.min(Number(request.query.limit) || 20, 100);
    const offset = Number(request.query.offset) || 0;
    const sortedBlocks = [...state.blocks].sort((a, b) => b.index - a.index);
    const page = sortedBlocks.slice(offset, offset + limit);
    response.json({
      total: state.blocks.length,
      offset,
      limit,
      blocks: page,
    });
  });

  app.get('/api/blocks/:height', (request, response) => {
    const height = Number(request.params.height);
    const block = state.blocks.find((item) => item.index === height);
    if (!block) {
      response.status(404).json({ error: 'Block not found' });
      return;
    }
    response.json(block);
  });

  app.get('/api/accounts/:address', (request, response) => {
    const address = request.params.address;
    const account = state.accounts[address] || {
      balance: 0,
      stake: 0,
      nonce: 0,
      reputation: 0,
    };
    response.json({ address, ...account });
  });

  app.post('/api/transactions', async (request, response) => {
    const transaction = request.body || {};
    const preparedTransaction = {
      id: transaction.id || `tx-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      from: transaction.from,
      to: transaction.to,
      amount: Number(transaction.amount),
      fee: Number(transaction.fee || 0),
      nonce: typeof transaction.nonce === 'number' ? transaction.nonce : undefined,
      publicKey: transaction.publicKey,
      signature: transaction.signature,
      memo: transaction.memo ? String(transaction.memo).slice(0, 256) : undefined,
      timestamp: transaction.timestamp || new Date().toISOString(),
    };

    const validation = validateTransaction(state, preparedTransaction);
    if (!validation.ok) {
      response.status(400).json({ error: validation.reason });
      return;
    }

    const senderAccount = ensureAccount(state, preparedTransaction.from);
    const signatureCheck = verifyTransactionSignature(config, senderAccount, preparedTransaction);
    if (!signatureCheck.ok) {
      response.status(400).json({ error: signatureCheck.reason });
      return;
    }

    mempool.push(preparedTransaction);
    await broadcastTransaction(config, preparedTransaction);
    response.status(202).json({ accepted: true, transaction: preparedTransaction });
  });

  app.post('/api/faucet', (request, response) => {
    if (!config.enableFaucet) {
      response.status(403).json({ error: 'Faucet disabled on this node' });
      return;
    }
    const { address } = request.body;
    const amount = Number(request.body.amount || 1000);
    if (!address || typeof address !== 'string') {
      response.status(400).json({ error: 'Missing address' });
      return;
    }
    if (Number.isNaN(amount) || amount <= 0) {
      response.status(400).json({ error: 'Invalid amount' });
      return;
    }
    if (!state.accounts[address]) {
      state.accounts[address] = {
        balance: 0,
        stake: 0,
        nonce: 0,
        reputation: 0,
      };
    }
    state.accounts[address].balance += amount;
    saveState(config, state);
    response.json({ ok: true, address, newBalance: state.accounts[address].balance });
  });

  app.post('/api/payments', (request, response) => {
    try {
      const { to, amount, memo, expiresInSeconds } = request.body || {};
      const numericAmount = Number(amount);
      if (!to || typeof to !== 'string') {
        response.status(400).json({ error: 'Missing destination address' });
        return;
      }
      if (Number.isNaN(numericAmount) || numericAmount <= 0) {
        response.status(400).json({ error: 'Invalid amount' });
        return;
      }
      const payment = payments.createPayment(context, {
        to,
        amount: numericAmount,
        memo,
        expiresInSeconds,
      });
      response.status(201).json(payments.paymentSummary(payment));
    } catch (error) {
      response.status(400).json({ error: error.message || 'Invalid payment payload' });
    }
  });

  app.get('/api/payments/:id', (request, response) => {
    const payment = payments.getPayment(context, request.params.id);
    if (!payment) {
      response.status(404).json({ error: 'Payment not found' });
      return;
    }
    const updated = payments.updatePaymentStatus(context, payment);
    response.json(payments.paymentSummary(updated));
  });

  app.get('/api/wallets/info', (request, response) => {
    response.json({
      chainId: config.chainId,
      chainName: 'BulenCoin Devnet',
      rpcUrl: `http://localhost:${config.httpPort}/api`,
      connectors: [
        {
          type: 'metamask',
          addNetwork: {
            chainId: `0x${Buffer.from(config.chainId).toString('hex').slice(0, 8)}`,
            chainName: 'BulenCoin Devnet',
            rpcUrls: [`http://localhost:${config.httpPort}/api`],
            nativeCurrency: { name: 'BULEN', symbol: 'BULEN', decimals: 18 },
          },
        },
        { type: 'walletconnect', projectId: 'demo-bulencoin', rpcUrl: `http://localhost:${config.httpPort}/api` },
        { type: 'ledger', transport: 'usb', note: 'Use message signing to submit tx' },
      ],
    });
  });

  app.post('/api/wallets/challenge', (request, response) => {
    const { address, publicKey, walletType } = request.body || {};
    if (!address || !publicKey) {
      response.status(400).json({ error: 'Missing address or publicKey' });
      return;
    }
    const challenge = wallets.createChallenge(context, { address, publicKey, walletType });
    response.status(201).json({ id: challenge.id, message: challenge.message, expiresAt: challenge.expiresAt });
  });

  app.post('/api/wallets/verify', (request, response) => {
    const { challengeId, signature } = request.body || {};
    if (!challengeId || !signature) {
      response.status(400).json({ error: 'Missing challengeId or signature' });
      return;
    }
    const result = wallets.verifyChallenge(context, challengeId, signature);
    if (!result.ok) {
      response.status(400).json({ error: result.reason });
      return;
    }
    response.json({
      sessionId: result.session.id,
      address: result.session.address,
      expiresAt: result.session.expiresAt,
    });
  });

  app.get('/api/wallets/session/:id', (request, response) => {
    const session = wallets.getSession(context, request.params.id);
    if (!session) {
      response.status(404).json({ error: 'Session not found or expired' });
      return;
    }
    response.json(session);
  });

  // P2P endpoints (simple HTTP‑based gossip)
  app.post('/p2p/tx', (request, response) => {
    if (!verifyP2PToken(config, request, response)) {
      return;
    }
    if (!verifyProtocolVersion(config, request, response)) {
      return;
    }
    const remoteTransaction = request.body.transaction;
    if (!remoteTransaction || !remoteTransaction.id) {
      response.status(400).json({ error: 'Invalid transaction payload' });
      return;
    }
    const alreadyPresent = mempool.some((item) => item.id === remoteTransaction.id);
    if (!alreadyPresent) {
      mempool.push(remoteTransaction);
    }
    response.json({ ok: true });
  });

  app.post('/p2p/block', (request, response) => {
    if (!verifyP2PToken(config, request, response)) {
      return;
    }
    if (!verifyProtocolVersion(config, request, response)) {
      return;
    }
    const remoteBlock = request.body.block;
    if (!remoteBlock) {
      response.status(400).json({ error: 'Invalid block payload' });
      return;
    }
    const existing = state.blocks.find((item) => item.hash === remoteBlock.hash);
    if (existing) {
      response.json({ ok: true, ignored: true });
      return;
    }
    try {
      applyBlock(state, remoteBlock);
      saveState(config, state);
      payments.onBlockAccepted(context, remoteBlock);
      // Remove included transactions from mempool
      const includedIds = new Set(remoteBlock.transactions.map((tx) => tx.id));
      for (let index = mempool.length - 1; index >= 0; index -= 1) {
        if (includedIds.has(mempool[index].id)) {
          mempool.splice(index, 1);
        }
      }
      response.json({ ok: true });
    } catch (error) {
      console.error('Failed to apply remote block', error.message);
      response.status(400).json({ error: 'Invalid block' });
    }
  });

  app.get('/', (request, response) => {
    response.json({
      message: 'BulenNode HTTP API',
      docs: '/api/status, /api/blocks, /api/blocks/:height, /api/accounts/:address, /api/transactions, /api/faucet, /api/payments',
    });
  });

  const server = app.listen(config.httpPort, () => {
    console.log(
      `BulenNode listening on http://localhost:${config.httpPort} ` +
        `(role=${config.nodeRole}, profile=${config.nodeProfile})`,
    );
  });

  return server;
}

module.exports = {
  createNodeContext,
  startBlockProducer,
  createServer,
};
