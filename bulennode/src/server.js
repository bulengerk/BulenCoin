const fs = require('fs');
const http = require('http');
const https = require('https');
const express = require('express');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const cors = require('cors');
const {
  validateTransaction,
  createBlock,
  createGenesisBlock,
  ensureAccount,
} = require('./chain');
const { loadState, saveState, computeSnapshotHash } = require('./storage');
const {
  broadcastTransaction,
  broadcastBlock,
  startQuicListener,
  fetchBlockFromPeer,
  loadPeerBook,
} = require('./p2p');
const {
  verifyTransactionSignature,
  createRateLimiter,
  verifyP2PToken,
  verifyProtocolVersion,
  verifyPeerSession,
  verifyHandshake,
  signBlockHash,
  verifyBlockSignature,
} = require('./security');
const {
  ensureConsensusState,
  handleIncomingBlock,
  selectCommittee,
  snapshotAtHeight,
} = require('./consensus');
const {
  createMetrics,
  computeRewardEstimate,
  computeRewardProjection,
  computeEfficiencyBoost,
} = require('./rewards');
const payments = require('./payments');
const wallets = require('./wallets');
const QRCode = require('qrcode');
const { ensureNodeKeys } = require('./identity');

function requireOptionalToken(token, headerName, request, response) {
  if (!token) {
    return true;
  }
  const provided = request.headers[headerName];
  if (provided !== token) {
    response.status(403).json({ error: 'Forbidden' });
    return false;
  }
  return true;
}

function createNodeContext(config) {
  const identity = ensureNodeKeys(config);
  if (!config.nodeId) {
    config.nodeId = identity.address;
  }
  config.nodePublicKey = identity.publicKeyPem;
  config.validatorAddress = identity.address;
  const state = loadState(config);
  state.enableFaucet = config.enableFaucet;
  if (Array.isArray(config.genesisValidators) && config.genesisValidators.length) {
    for (const { address, stake } of config.genesisValidators) {
      const acc = ensureAccount(state, address);
      if (!acc.stake || acc.stake < stake) {
        acc.stake = stake;
      }
    }
  }
  createGenesisBlock(config, state);
  ensureConsensusState(state);
  const mempool = [];
  const context = {
    config,
    state,
    mempool,
    payments: payments.loadPayments(config),
    walletStore: wallets.loadStore(config),
    metrics: createMetrics(config),
    timers: [],
    peerSessions: new Map(),
    superLightSleeping: false,
    lastBatteryLevel: null,
    identity,
    peerBook: loadPeerBook(config),
    p2pInFlight: 0,
    securityStats: { invalidSignatures: 0, rejectedP2P: 0 },
  };
  return context;
}

function pruneForSuperLight(context) {
  const { config, state } = context;
  if (!config.superLightMode) {
    return;
  }
  const keep = Math.max(64, Number(config.superLightKeepBlocks || 0) || 256);
  const buffer = Math.max(0, Number(config.superLightFinalityBuffer || 0) || 2);
  const finalizedHeight = state.finalizedHeight || 0;
  const cutoff = Math.max(0, finalizedHeight - buffer);
  const sorted = (state.blocks || []).slice().sort((a, b) => a.index - b.index);
  const trimmed = sorted.filter((block, idx) => {
    if (block.index <= cutoff) {
      return false;
    }
    const keepStart = Math.max(0, sorted.length - keep);
    return idx >= keepStart;
  });
  state.blocks = trimmed;
  state.blockIndex = {};
  for (const block of state.blocks) {
    state.blockIndex[block.hash] = block;
  }
}

async function fetchBlockFromPeers(context, hash) {
  const { config } = context;
  const peers = Array.isArray(config.peers) ? config.peers : [];
  for (const peer of peers) {
    try {
      const block = await fetchBlockFromPeer(context, peer, hash);
      if (block) {
        return block;
      }
    } catch (error) {
      // ignore and try next
    }
  }
  return null;
}

async function syncAncestors(context, block, maxDepth = 5) {
  const { state } = context;
  let currentHash = block.previousHash;
  let depth = 0;
  while (currentHash && (!state.blockIndex || !state.blockIndex[currentHash]) && depth < maxDepth) {
    const fetched = await fetchBlockFromPeers(context, currentHash);
    if (!fetched) {
      return { ok: false, reason: 'Missing parent' };
    }
    const result = handleIncomingBlock(context, fetched, { source: 'sync' });
    if (!result.accepted) {
      return { ok: false, reason: result.reason || 'Failed to sync ancestor' };
    }
    currentHash = fetched.previousHash;
    depth += 1;
  }
  return { ok: true };
}

function startBlockProducer(context) {
  const { config, state, mempool } = context;
  if (config.nodeRole !== 'validator') {
    console.log('Node role is observer; automatic block production disabled');
    return;
  }
  const intervalHandle = setInterval(async () => {
    if (context.superLightSleeping) {
      return;
    }
    if (!mempool.length && !config.allowEmptyBlocks) {
      return;
    }
    const validatorAddress = config.validatorAddress || config.nodeId;
    const validatorAccount = ensureAccount(state, validatorAddress);
    if (!validatorAccount.stake || validatorAccount.stake <= 0) {
      validatorAccount.stake = Math.max(1, config.minimumValidatorWeight || 1);
    }
    const pending = mempool.splice(0, mempool.length);
    const transactionsToInclude = [];
    for (const tx of pending) {
      const validation = validateTransaction(state, tx);
      if (!validation.ok) {
        continue;
      }
      const senderAccount = ensureAccount(state, tx.from);
      const signatureCheck = verifyTransactionSignature(config, senderAccount, tx);
      if (!signatureCheck.ok) {
        continue;
      }
      transactionsToInclude.push(tx);
    }
    let committee = selectCommittee(config, state, state.bestTipHash);
    if (!committee || !committee.length) {
      committee = [{ address: validatorAddress, stake: validatorAccount.stake }];
    }
    const checkpointHeight = state.finalizedHeight || 0;
    const checkpointHash = state.finalizedHash || null;
    let finalityCertificate = null;
    if (checkpointHash && context.identity && checkpointHeight > 0) {
      const snapshotToSign = snapshotAtHeight(config, state, checkpointHeight);
      const snapshotHash = snapshotToSign && snapshotToSign.hash
        ? snapshotToSign.hash
        : computeSnapshotHash(snapshotToSign || { chainId: state.chainId, blocks: [], accounts: {} });
      if (snapshotToSign) {
        snapshotToSign.hash = snapshotHash || snapshotToSign.hash;
        state.finalizedSnapshot = snapshotToSign;
      }
      const checkpointPayload = JSON.stringify({ height: checkpointHeight, hash: checkpointHash, snapshotHash });
      finalityCertificate = {
        height: checkpointHeight,
        hash: checkpointHash,
        signer: context.identity.address,
        publicKey: context.identity.publicKeyPem,
        snapshotHash,
        signature: signBlockHash(context.identity, checkpointPayload),
      };
    }
    const block = createBlock(
      config,
      state,
      validatorAddress,
      transactionsToInclude,
      {
        committee,
        certificate: [],
        producerPublicKey: context.identity.publicKeyPem,
        finalityCheckpoint: finalityCertificate,
      },
    );
    const producerSignature = signBlockHash(context.identity, block.hash);
    const certificate = Array.isArray(block.certificate) ? block.certificate.slice() : [];
    const isInCommittee = committee.some((member) => member.address === block.validator);
    if (isInCommittee) {
      certificate.push({
        validator: block.validator,
        publicKey: context.identity.publicKeyPem,
        signature: producerSignature,
      });
    }
    const signedBlock = { ...block, producerSignature, certificate };
    try {
      const result = handleIncomingBlock(context, signedBlock, { source: 'local' });
      if (!result.accepted) {
        throw new Error(result.reason || 'Block rejected by consensus');
      }
      saveState(config, state);
      await broadcastBlock(context, signedBlock);
      const { onBlockProduced } = require('./rewards'); // lazy require to avoid cycles
      onBlockProduced(context);
      for (const newBlock of result.newBlocks || [signedBlock]) {
        payments.onBlockAccepted(context, newBlock);
      }
      pruneForSuperLight(context);
      console.log(
        `Produced block #${signedBlock.index} with ${signedBlock.transactions.length} txs (hash=${signedBlock.hash.slice(
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
    createRateLimiter({
      windowMs: config.rateLimitWindowMs,
      max: config.rateLimitMaxRequests,
    }),
  );
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

  app.get('/healthz', (request, response) => {
    response.json({ status: 'ok' });
  });

  app.get('/api/health', (request, response) => {
    response.json({ status: 'ok' });
  });

  app.get('/api/checkpoint', (request, response) => {
    if (!state.finalizedSnapshot) {
      response.status(404).json({ error: 'No checkpoint yet' });
      return;
    }
    response.json({
      height: state.finalizedHeight || 0,
      hash: state.finalizedHash || null,
      snapshotHash: state.finalizedSnapshot.hash || null,
    });
  });

  const guardP2P = (handler) => async (request, response) => {
    if (context.p2pInFlight >= config.p2pMaxConcurrent) {
      response.status(503).json({ error: 'P2P busy, backpressure engaged' });
      return;
    }
    context.p2pInFlight += 1;
    try {
      await handler(request, response);
    } finally {
      context.p2pInFlight -= 1;
    }
  };

  app.get('/api/status', (request, response) => {
    if (!requireOptionalToken(config.statusToken, 'x-bulen-status-token', request, response)) {
      return;
    }
    const latest = state.blocks[state.blocks.length - 1];
    const reward = computeRewardEstimate(config, metrics);
    const projection = computeRewardProjection(config, metrics, {
      stake: Number(request.query.stake || 1000),
      uptimeHoursPerDay: Number(request.query.uptimeHours || 24),
      days: Number(request.query.days || 7),
    });
    response.json({
      chainId: state.chainId,
      nodeId: config.nodeId,
      validatorAddress: config.validatorAddress || config.nodeId,
      nodeRole: config.nodeRole,
      nodeProfile: config.nodeProfile,
      deviceClass: config.deviceClass,
      rewardWeight: config.rewardWeight,
      height: latest ? latest.index : 0,
      latestHash: latest ? latest.hash : null,
      bestChainWeight: state.bestChainWeight || 0,
      finalizedHeight: state.finalizedHeight || 0,
      finalizedHash: state.finalizedHash || null,
      peers: config.peers,
      mempoolSize: mempool.length,
      accountsCount: Object.keys(state.accounts).length,
      totalStake: Object.values(state.accounts).reduce((sum, acc) => sum + (acc.stake || 0), 0),
      protocolVersion: config.protocolVersion,
      protocolMajor: config.protocolMajor,
      metrics: {
        startedAt: metrics.startedAt,
        uptimeSeconds: metrics.uptimeSeconds,
        producedBlocks: metrics.producedBlocks,
        powerWatts: metrics.powerWatts || null,
        uptimeRewardEstimateHourly: reward.hourly,
        uptimeRewardEstimateTotal: reward.total,
        loyaltyBoost: reward.loyaltyBoost,
        deviceBoost: reward.deviceBoost,
        efficiencyBoost: reward.efficiencyBoost,
      },
      rewardProjection: {
        hourly: projection.hourly,
        daily: projection.daily,
        weekly: projection.weekly,
        periodTotal: projection.periodTotal,
        stakeWeight: projection.stakeWeight,
        uptimeHoursPerDay: projection.uptimeHoursPerDay,
        days: projection.days,
      },
      monetary: {
        feeBurnedTotal: state.feeBurnedTotal || 0,
        ecosystemPool: state.ecosystemPool || 0,
        mintedRewardsTotal: state.mintedRewardsTotal || 0,
        blockReward: config.blockReward,
        protocolRewardsEnabled: config.enableProtocolRewards,
        blockProducerRewardFraction: config.blockProducerRewardFraction,
        feeBurnFraction: config.feeBurnFraction,
        feeEcosystemFraction: config.feeEcosystemFraction,
      },
      payments: {
        total: context.payments.length,
        pending: context.payments.filter((p) => p.status === 'pending').length,
      },
      peers: config.peers,
      reputation:
        state.accounts[config.validatorAddress || config.nodeId]?.reputation || 0,
      superLight: config.superLightMode,
      superLightSleeping: context.superLightSleeping || false,
      superLightKeepBlocks: config.superLightKeepBlocks,
      checkpoint: state.finalizedSnapshot
        ? {
            height: state.finalizedHeight || 0,
            hash: state.finalizedHash || null,
            snapshotHash: state.finalizedSnapshot.hash || null,
          }
        : null,
    });
  });

  app.get('/metrics', (request, response) => {
    if (!requireOptionalToken(config.metricsToken, 'x-bulen-metrics-token', request, response)) {
      return;
    }
    const latest = state.blocks[state.blocks.length - 1];
    const reward = computeRewardEstimate(config, metrics);
    const projection = computeRewardProjection(config, metrics, {
      stake: 1000,
      uptimeHoursPerDay: 24,
      days: 7,
    });
    const baseLabels = {
      chain_id: config.chainId,
      node_id: config.nodeId,
      role: config.nodeRole,
      profile: config.nodeProfile,
      device_class: config.deviceClass,
    };

    const escapeLabel = (value) => String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const formatLabels = (extra = {}) => {
      const entries = { ...baseLabels, ...extra };
      const parts = Object.entries(entries).map(
        ([key, value]) => `${key}="${escapeLabel(value)}"`,
      );
      return parts.length ? `{${parts.join(',')}}` : '';
    };

    const lines = [];
    lines.push(
      `bulen_node_info${formatLabels({
        protocol_version: config.protocolVersion,
      })} 1`,
    );
    lines.push(
      `bulen_blocks_height${formatLabels()} ${latest ? latest.index : 0}`,
    );
    lines.push(`bulen_blocks_total${formatLabels()} ${state.blocks.length}`);
    lines.push(
      `bulen_blocks_finalized_height${formatLabels()} ${state.finalizedHeight || 0}`,
    );
    lines.push(`bulen_chain_weight${formatLabels()} ${state.bestChainWeight || 0}`);
    lines.push(`bulen_mempool_size${formatLabels()} ${mempool.length}`);
    lines.push(`bulen_accounts_total${formatLabels()} ${Object.keys(state.accounts).length}`);
    lines.push(
      `bulen_total_stake${formatLabels()} ${Object.values(state.accounts).reduce(
        (sum, acc) => sum + (acc.stake || 0),
        0,
      )}`,
    );
    lines.push(`bulen_protocol_major${formatLabels()} ${config.protocolMajor}`);
    lines.push(`bulen_reward_weight${formatLabels()} ${config.rewardWeight}`);
    lines.push(`bulen_uptime_seconds${formatLabels()} ${metrics.uptimeSeconds}`);
    lines.push(`bulen_blocks_produced${formatLabels()} ${metrics.producedBlocks}`);
    lines.push(
      `bulen_reward_estimate_hourly${formatLabels()} ${reward.hourly}`,
    );
    lines.push(`bulen_reward_estimate_total${formatLabels()} ${reward.total}`);
    lines.push(`bulen_loyalty_boost${formatLabels()} ${reward.loyaltyBoost}`);
    lines.push(`bulen_device_boost${formatLabels()} ${reward.deviceBoost}`);
    lines.push(`bulen_efficiency_boost${formatLabels()} ${reward.efficiencyBoost}`);
    if (typeof metrics.powerWatts === 'number') {
      lines.push(`bulen_power_watts${formatLabels()} ${metrics.powerWatts}`);
    }
    lines.push(`bulen_reward_projection_weekly${formatLabels()} ${projection.weekly}`);
    lines.push(
      `bulen_payments_total${formatLabels()} ${context.payments.length}`,
    );
    lines.push(
      `bulen_payments_pending${formatLabels()} ${
        context.payments.filter((p) => p.status === 'pending').length
      }`,
    );
    lines.push(
      `bulen_slash_events_total${formatLabels()} ${
        Array.isArray(state.slashEvents) ? state.slashEvents.length : 0
      }`,
    );
    lines.push(
      `bulen_config_rate_limit_window_ms${formatLabels()} ${config.rateLimitWindowMs}`,
    );
    lines.push(
      `bulen_config_rate_limit_max_requests${formatLabels()} ${config.rateLimitMaxRequests}`,
    );
    lines.push(
      `bulen_fee_burned_total${formatLabels()} ${state.feeBurnedTotal || 0}`,
    );
    lines.push(
      `bulen_ecosystem_pool${formatLabels()} ${state.ecosystemPool || 0}`,
    );
    lines.push(
      `bulen_rewards_minted_total${formatLabels()} ${state.mintedRewardsTotal || 0}`,
    );
    lines.push(
      `bulen_block_reward${formatLabels()} ${config.blockReward || 0}`,
    );
    lines.push(
      `bulen_protocol_rewards_enabled${formatLabels()} ${config.enableProtocolRewards ? 1 : 0}`,
    );
    lines.push(
      `bulen_block_producer_fraction${formatLabels()} ${config.blockProducerRewardFraction || 0}`,
    );
    lines.push(
      `bulen_fee_burn_fraction${formatLabels()} ${config.feeBurnFraction || 0}`,
    );
    lines.push(
      `bulen_fee_ecosystem_fraction${formatLabels()} ${config.feeEcosystemFraction || 0}`,
    );
    lines.push(
      `bulen_security_invalid_signatures_total${formatLabels()} ${context.securityStats.invalidSignatures || 0}`,
    );
    lines.push(
      `bulen_security_p2p_rejected_total${formatLabels()} ${context.securityStats.rejectedP2P || 0}`,
    );

    response.set('Content-Type', 'text/plain; version=0.0.4');
    response.send(`${lines.join('\n')}\n`);
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
      securityPreset: config.securityPreset,
      enableProtocolRewards: config.enableProtocolRewards,
      protocolVersion: config.protocolVersion,
      protocolMajor: config.protocolMajor,
      p2pHandshakeRequired: config.p2pRequireHandshake,
      p2pTlsEnabled: config.p2pTlsEnabled,
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

  app.get('/api/mempool', (request, response) => {
    response.json(mempool);
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
    if (mempool.length >= config.mempoolMaxSize) {
      response.status(429).json({ error: 'Mempool full, try later' });
      return;
    }
    const transaction = request.body || {};
    const preparedTransaction = {
      id: transaction.id || `tx-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      chainId: config.chainId,
      from: transaction.from,
      to: transaction.to,
      amount: Number(transaction.amount),
      fee: Number(transaction.fee || 0),
      nonce: typeof transaction.nonce === 'number' ? transaction.nonce : undefined,
      publicKey: transaction.publicKey,
      signature: transaction.signature,
      action: transaction.action || 'transfer',
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
    await broadcastTransaction(context, preparedTransaction);
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
    const targetAccount = ensureAccount(state, address);
    targetAccount.balance += amount;
    saveState(config, state);
    response.json({ ok: true, address, newBalance: targetAccount.balance });
  });

  app.post('/api/payments', (request, response) => {
    try {
      const { to, amount, memo, expiresInSeconds, webhookUrl } = request.body || {};
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
        webhookUrl,
      });
      response.status(201).json(payments.paymentSummary(payment));
    } catch (error) {
      response.status(400).json({ error: error.message || 'Invalid payment payload' });
    }
  });

  app.post('/api/rewards/estimate', (request, response) => {
    if (!request.body || typeof request.body !== 'object') {
      response.status(400).json({ error: 'Invalid payload' });
      return;
    }
    const { stake, uptimeHoursPerDay, days, deviceClass } = request.body;
    const projection = computeRewardProjection(config, { ...metrics, deviceClass }, { stake, uptimeHoursPerDay, days, deviceClass });
    response.json({
      ok: true,
      projection,
    });
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

  app.post('/api/payment-link', async (request, response) => {
    try {
      const { address, amount, memo } = request.body || {};
      const numericAmount = Number(amount);
      if (!address || typeof address !== 'string') {
        response.status(400).json({ error: 'Missing address' });
        return;
      }
      if (Number.isNaN(numericAmount) || numericAmount <= 0) {
        response.status(400).json({ error: 'Invalid amount' });
        return;
      }
      const link = `bulen:${address}?amount=${numericAmount}${memo ? `&memo=${encodeURIComponent(String(memo).slice(0, 64))}` : ''}`;
      let qrDataUrl = null;
      try {
        qrDataUrl = await QRCode.toDataURL(link, { margin: 1, scale: 4 });
      } catch (error) {
        qrDataUrl = null;
      }
      response.json({ ok: true, link, qrDataUrl });
    } catch (error) {
      response.status(400).json({ error: 'Invalid payload' });
    }
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

  app.get('/api/wallets', (request, response) => {
    response.json({ ok: true, wallets: wallets.listWallets(config) });
  });

  app.post('/api/wallets/create', (request, response) => {
    try {
      const { label, passphrase, profile } = request.body || {};
      if (config.walletRequirePassphrase && (!passphrase || passphrase.length < config.walletPassphraseMinLength)) {
        response
          .status(400)
          .json({ error: 'Passphrase required', minLength: config.walletPassphraseMinLength });
        return;
      }
      if (passphrase && passphrase.length < config.walletPassphraseMinLength) {
        response
          .status(400)
          .json({ error: 'Passphrase too short', minLength: config.walletPassphraseMinLength });
        return;
      }
      const wallet = wallets.createLocalWallet(config, { label, passphrase, profile });
      response.status(201).json({
        ok: true,
        address: wallet.address,
        publicKey: wallet.publicKeyPem,
        backup: { privateKeyPem: wallet.privateKeyPem, passphraseUsed: Boolean(passphrase) },
        createdAt: wallet.createdAt,
        keyPath: wallet.keyPath,
        passphraseRequired: config.walletRequirePassphrase,
      });
    } catch (error) {
      response.status(400).json({ error: 'Could not create wallet', details: error.message });
    }
  });

  app.post('/api/wallets/import', (request, response) => {
    try {
      const { backup, passphrase, label, profile } = request.body || {};
      const wallet = wallets.importWallet(config, { backup, passphrase, label, profile });
      response.status(201).json({ ok: true, address: wallet.address, importedAt: wallet.importedAt, keyPath: wallet.keyPath });
    } catch (error) {
      response.status(400).json({ error: 'Could not import wallet', details: error.message });
    }
  });

  app.post('/api/wallets/backup-confirm', (request, response) => {
    const address = request.body && request.body.address;
    if (!address) {
      response.status(400).json({ error: 'Missing address' });
      return;
    }
    const updated = wallets.markBackedUp(config, address);
    if (!updated) {
      response.status(404).json({ error: 'Wallet not found' });
      return;
    }
    response.json({ ok: true, address, backedUpAt: updated.backedUpAt });
  });

  app.post('/api/device/energy', (request, response) => {
    const requireToken = Boolean(config.deviceControlToken) || process.env.NODE_ENV === 'production';
    if (requireToken) {
      const token = request.headers['x-bulen-device-token'];
      if (!token || token !== config.deviceControlToken) {
        response.status(403).json({ error: 'Forbidden' });
        return;
      }
    }
    const powerWatts = Number((request.body && request.body.powerWatts) || 0);
    const batteryLevel = request.body && request.body.batteryLevel;
    if (powerWatts && (Number.isNaN(powerWatts) || powerWatts < 0 || powerWatts > 500)) {
      response.status(400).json({ error: 'Invalid powerWatts (0..500)' });
      return;
    }
    if (batteryLevel !== undefined) {
      const level = Number(batteryLevel);
      if (Number.isNaN(level) || level < 0 || level > 1) {
        response.status(400).json({ error: 'Invalid batteryLevel (0..1)' });
        return;
      }
      context.lastBatteryLevel = level;
    }
    if (powerWatts > 0) {
      context.metrics.powerWatts = powerWatts;
      context.metrics.efficiencyBoost = rewards.computeEfficiencyBoost(context.metrics);
    }
    response.json({
      ok: true,
      powerWatts: powerWatts > 0 ? powerWatts : null,
      efficiencyBoost: context.metrics.efficiencyBoost || 1,
      batteryLevel: context.lastBatteryLevel ?? null,
    });
  });

  app.post('/api/device/battery', (request, response) => {
    if (!config.superLightMode) {
      response.status(400).json({ error: 'Super-light mode disabled' });
      return;
    }
    const requireToken = Boolean(config.deviceControlToken) || process.env.NODE_ENV === 'production';
    if (requireToken) {
      const token = request.headers['x-bulen-device-token'];
      if (!token || token !== config.deviceControlToken) {
        response.status(403).json({ error: 'Forbidden' });
        return;
      }
    }
    const level = Number((request.body && request.body.level) || -1);
    if (Number.isNaN(level) || level < 0 || level > 1) {
      response.status(400).json({ error: 'Invalid level (0..1)' });
      return;
    }
    context.lastBatteryLevel = level;
    if (level < config.superLightBatteryThreshold) {
      context.superLightSleeping = true;
    } else if (context.superLightSleeping) {
      context.superLightSleeping = false;
    }
    response.json({
      ok: true,
      sleeping: context.superLightSleeping,
      threshold: config.superLightBatteryThreshold,
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

  // P2P endpoints (authenticated, handshake-first gossip)
  app.post('/p2p/handshake', guardP2P((request, response) => {
    if (!verifyProtocolVersion(config, request, response)) {
      return;
    }
    if (config.p2pRequireTls && !request.socket.encrypted) {
      response.status(400).json({ error: 'TLS is required for P2P' });
      return;
    }
    const result = verifyHandshake(config, request, response);
    if (!result.ok) {
      return;
    }
    if (result.sessionToken && context.peerSessions) {
      context.peerSessions.set(result.sessionToken, {
        peerId: request.body && request.body.nodeId,
        publicKey: result.peerPublicKey || (request.body ? request.body.publicKey : null),
        expiresAt: Date.now() + 10 * 60 * 1000,
      });
    }
    response.json({
      ok: true,
      nodeId: config.nodeId,
      protocolVersion: config.protocolVersion,
      sessionToken: result.sessionToken,
      serverNonce: result.serverNonce,
      publicKey: config.nodePublicKey,
    });
  }));

  app.post('/p2p/tx', guardP2P((request, response) => {
    if (!verifyProtocolVersion(config, request, response)) {
      return;
    }
    if (config.p2pRequireHandshake) {
      if (!verifyPeerSession(config, request, response, context.peerSessions)) {
        return;
      }
    } else if (!verifyP2PToken(config, request, response)) {
      return;
    }
    const remoteTransaction = request.body.transaction;
    if (!remoteTransaction || !remoteTransaction.id) {
      response.status(400).json({ error: 'Invalid transaction payload' });
      return;
    }
    if (!remoteTransaction.chainId) {
      remoteTransaction.chainId = config.chainId;
    }
    const alreadyPresent = mempool.some((item) => item.id === remoteTransaction.id);
    if (!alreadyPresent) {
      if (mempool.length >= config.mempoolMaxSize) {
        response.status(429).json({ error: 'Mempool full, try later' });
        return;
      }
      mempool.push(remoteTransaction);
    }
    response.json({ ok: true });
  }));

  app.get('/p2p/peers', guardP2P((request, response) => {
    if (!verifyProtocolVersion(config, request, response)) {
      return;
    }
    if (config.p2pRequireHandshake) {
      if (!verifyPeerSession(config, request, response, context.peerSessions)) {
        return;
      }
    }
    const peers = new Set(config.peers || []);
    if (context.peerBook) {
      for (const peer of context.peerBook.keys()) {
        peers.add(peer);
      }
    }
    response.json({ ok: true, peers: Array.from(peers) });
  }));

  app.post('/p2p/block', guardP2P(async (request, response) => {
    if (!verifyProtocolVersion(config, request, response)) {
      return;
    }
    if (config.p2pRequireHandshake) {
      if (!verifyPeerSession(config, request, response, context.peerSessions)) {
        return;
      }
    } else if (!verifyP2PToken(config, request, response)) {
      return;
    }
    const remoteBlock = request.body.block;
    if (!remoteBlock) {
      response.status(400).json({ error: 'Invalid block payload' });
      return;
    }
    if (state.blockIndex && state.blockIndex[remoteBlock.hash]) {
      response.json({ ok: true, ignored: true });
      return;
    }
    try {
      const syncResult = await syncAncestors(context, remoteBlock, 5);
      if (!syncResult.ok) {
        response.status(400).json({ error: syncResult.reason || 'Missing parent' });
        return;
      }
      const result = handleIncomingBlock(context, remoteBlock, { source: 'p2p' });
      if (!result.accepted) {
        response.status(400).json({ error: result.reason || 'Invalid block' });
        return;
      }
      saveState(config, state);
      for (const newBlock of result.newBlocks || []) {
        payments.onBlockAccepted(context, newBlock);
      }
      // Re-gossip accepted blocks to peers to improve propagation under limited fanout
      await broadcastBlock(context, remoteBlock);
      response.json({ ok: true, reorg: result.reorg || false });
    } catch (error) {
      console.error('Failed to apply remote block', error.message);
      response.status(400).json({ error: 'Invalid block' });
    }
  }));

  app.get('/p2p/block/:hash', guardP2P((request, response) => {
    if (!verifyProtocolVersion(config, request, response)) {
      return;
    }
    if (config.p2pRequireHandshake) {
      if (!verifyPeerSession(config, request, response, context.peerSessions)) {
        return;
      }
    } else if (!verifyP2PToken(config, request, response)) {
      return;
    }
    const hash = request.params.hash;
    const block = state.blockIndex ? state.blockIndex[hash] : null;
    if (!block) {
      response.status(404).json({ error: 'Not found' });
      return;
    }
    response.json({ ok: true, block, peers: Array.from(context.peerBook ? context.peerBook.keys() : []) });
  }));

  if (config.p2pQuicEnabled) {
    startQuicListener(context, {
      onTransaction(payload) {
        if (!payload || !payload.id) {
          return;
        }
        if (mempool.length >= config.mempoolMaxSize) {
          return;
        }
        const alreadyPresent = mempool.some((item) => item.id === payload.id);
        if (!alreadyPresent) {
          mempool.push(payload);
        }
      },
      onBlock(payload) {
        if (!payload || (state.blockIndex && state.blockIndex[payload.hash])) {
          return;
        }
        const result = handleIncomingBlock(context, payload, { source: 'quic' });
      if (!result.accepted) {
        return;
      }
      saveState(config, state);
      for (const newBlock of result.newBlocks || []) {
        payments.onBlockAccepted(context, newBlock);
      }
      broadcastBlock(context, payload).catch(() => {});
    },
  });
}

  app.get('/', (request, response) => {
    response.json({
      message: 'BulenNode HTTP API',
      docs: '/api/status, /api/blocks, /api/blocks/:height, /api/accounts/:address, /api/transactions, /api/faucet, /api/payments',
    });
  });

  let server;
  if (config.p2pTlsEnabled && config.p2pTlsKeyFile && config.p2pTlsCertFile) {
    try {
      const tlsOptions = {
        key: fs.readFileSync(config.p2pTlsKeyFile, 'utf8'),
        cert: fs.readFileSync(config.p2pTlsCertFile, 'utf8'),
        requestCert: false,
        rejectUnauthorized: false,
      };
      server = https.createServer(tlsOptions, app).listen(config.httpPort, () => {
        console.log(
          `BulenNode listening with TLS on https://localhost:${config.httpPort} ` +
            `(role=${config.nodeRole}, profile=${config.nodeProfile})`,
        );
      });
    } catch (error) {
      console.warn('Failed to start TLS listener, falling back to HTTP:', error.message);
    }
  }

  if (!server) {
    server = http.createServer(app).listen(config.httpPort, () => {
      console.log(
        `BulenNode listening on http://localhost:${config.httpPort} ` +
          `(role=${config.nodeRole}, profile=${config.nodeProfile})`,
      );
    });
  }

  return server;
}

module.exports = {
  createNodeContext,
  startBlockProducer,
  createServer,
};
