const crypto = require('crypto');
const { deriveServerNonce } = require('./consensus');

function hmac(secret, data) {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

function canonicalTransactionPayload(transaction) {
  return JSON.stringify({
    from: transaction.from,
    to: transaction.to,
    amount: transaction.amount,
    fee: transaction.fee,
    nonce: transaction.nonce,
    action: transaction.action || 'transfer',
    memo: transaction.memo || null,
    timestamp: transaction.timestamp || null,
  });
}

function deriveAddressFromPublicKey(publicKey) {
  const hash = crypto.createHash('sha256').update(publicKey).digest('hex');
  return `addr_${hash.slice(0, 40)}`;
}

function verifyTransactionSignature(config, account, transaction) {
  if (!config.requireSignatures) {
    return { ok: true, reason: 'Signature verification disabled (dev mode)' };
  }

  if (!transaction.publicKey || !transaction.signature) {
    return { ok: false, reason: 'Missing publicKey or signature' };
  }

  const derivedAddress = deriveAddressFromPublicKey(transaction.publicKey);
  if (transaction.from !== derivedAddress) {
    return { ok: false, reason: 'From address does not match publicKey' };
  }

  const verifier = crypto.createVerify('sha256');
  const payloads = [
    canonicalTransactionPayload(transaction),
    // Legacy payload for backwards compatibility (action/memo/timestamp omitted)
    JSON.stringify({
      from: transaction.from,
      to: transaction.to,
      amount: transaction.amount,
      fee: transaction.fee,
      nonce: transaction.nonce,
    }),
  ];

  let validSignature = false;
  for (const payload of payloads) {
    const v = crypto.createVerify('sha256');
    v.update(payload);
    v.end();
    try {
      if (v.verify(transaction.publicKey, transaction.signature, 'base64')) {
        validSignature = true;
        break;
      }
    } catch (error) {
      // continue to next payload variant
    }
  }

  if (!validSignature) {
    return { ok: false, reason: 'Invalid signature' };
  }

  const expectedNonce = (account ? account.nonce : 0) + 1;
  if (typeof transaction.nonce !== 'number' || !Number.isInteger(transaction.nonce)) {
    return { ok: false, reason: 'Nonce must be an integer' };
  }
  if (transaction.nonce !== expectedNonce) {
    return {
      ok: false,
      reason: `Invalid nonce (expected ${expectedNonce}, got ${transaction.nonce})`,
    };
  }

  return { ok: true };
}

function createRateLimiter(options) {
  const windowMs = options.windowMs;
  const maxRequests = options.max;
  const buckets = new Map();

  return function rateLimiter(request, response, next) {
    const now = Date.now();
    const ip =
      request.ip || request.headers['x-forwarded-for'] || request.connection.remoteAddress;

    const entry = buckets.get(ip) || { count: 0, resetAt: now + windowMs };
    if (now > entry.resetAt) {
      entry.count = 0;
      entry.resetAt = now + windowMs;
    }
    entry.count += 1;
    buckets.set(ip, entry);

    if (entry.count > maxRequests) {
      response.status(429).json({ error: 'Too many requests, slow down' });
      return;
    }
    next();
  };
}

function verifyP2PToken(config, request, response) {
  if (!config.p2pToken) {
    return true;
  }
  const headerName = 'x-bulen-p2p-token';
  const token = request.headers[headerName];
  if (token !== config.p2pToken) {
    response.status(403).json({ error: 'Forbidden' });
    return false;
  }
  return true;
}

function shouldRequireHandshake(config) {
  return Boolean(config.p2pToken) && config.p2pRequireHandshake !== false;
}

function createPeerProof(config, nodeId, chainId, nonce) {
  if (!config.p2pToken) {
    return null;
  }
  const payload = `${nodeId}|${chainId}|${nonce}`;
  return hmac(config.p2pToken, payload);
}

function createPeerSessionToken(config, nodeId, chainId, clientNonce) {
  if (!config.p2pToken) {
    return null;
  }
  const serverNonce = deriveServerNonce(config, nodeId);
  return hmac(config.p2pToken, `${nodeId}|${chainId}|${clientNonce}|${serverNonce}`);
}

function verifyHandshake(config, request, response) {
  if (!shouldRequireHandshake(config)) {
    return { ok: true, sessionToken: null, serverNonce: null };
  }
  const { nodeId, chainId, nonce } = request.body || {};
  if (!nodeId || !chainId || !nonce) {
    response.status(400).json({ error: 'Missing handshake parameters' });
    return { ok: false };
  }
  const peerProof = request.headers['x-bulen-peer-proof'];
  const expected = createPeerProof(config, nodeId, chainId, nonce);
  if (!peerProof || peerProof !== expected) {
    response.status(403).json({ error: 'Invalid handshake proof' });
    return { ok: false };
  }
  const serverNonce = deriveServerNonce(config, nodeId);
  const sessionToken = createPeerSessionToken(config, nodeId, chainId, nonce);
  return { ok: true, sessionToken, serverNonce };
}

function verifyPeerSession(config, request, response, sessionStore) {
  if (!shouldRequireHandshake(config)) {
    return true;
  }
  const peerId = request.headers['x-bulen-peer-id'];
  const nonce = request.headers['x-bulen-peer-nonce'];
  const sessionToken = request.headers['x-bulen-peer-session'];

  if (!peerId || !nonce || !sessionToken) {
    response.status(403).json({ error: 'Missing peer session headers' });
    return false;
  }
  if (sessionStore && sessionStore.has(sessionToken)) {
    const entry = sessionStore.get(sessionToken);
    if (entry.peerId === peerId && (!entry.expiresAt || entry.expiresAt > Date.now())) {
      return true;
    }
  }

  const serverNonce = deriveServerNonce(config, peerId);
  const expected = hmac(config.p2pToken, `${peerId}|${config.chainId}|${nonce}|${serverNonce}`);
  if (expected !== sessionToken) {
    response.status(403).json({ error: 'Invalid peer session' });
    return false;
  }
  return true;
}

function getProtocolMajor(version) {
  const match = String(version).match(/^(\d+)\./);
  if (!match) {
    return 0;
  }
  const value = Number(match[1]);
  return Number.isNaN(value) ? 0 : value;
}

function verifyProtocolVersion(config, request, response) {
  const headerName = 'x-bulen-protocol-version';
  const remoteVersion = request.headers[headerName];
  if (!remoteVersion) {
    // Allow missing header for backwards compatibility
    return true;
  }
  const localMajor = getProtocolMajor(config.protocolVersion);
  const remoteMajor = getProtocolMajor(remoteVersion);
  if (localMajor !== remoteMajor) {
    response.status(400).json({ error: 'Incompatible protocol version' });
    return false;
  }
  return true;
}

module.exports = {
  canonicalTransactionPayload,
  deriveAddressFromPublicKey,
  verifyTransactionSignature,
  createRateLimiter,
  verifyP2PToken,
  verifyProtocolVersion,
  createPeerProof,
  createPeerSessionToken,
  verifyHandshake,
  verifyPeerSession,
  shouldRequireHandshake,
};
