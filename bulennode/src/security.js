const crypto = require('crypto');
const {
  deriveServerNonce,
  deriveAddressFromPublicKey,
  verifyPayload,
  signPayload,
} = require('./identity');

function hmac(secret, data) {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

function canonicalTransactionPayload(transaction, chainId) {
  return JSON.stringify({
    chainId: chainId || transaction.chainId || null,
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

  if (!transaction.chainId || transaction.chainId !== config.chainId) {
    return { ok: false, reason: 'Invalid or missing chainId in transaction' };
  }

  const verifier = crypto.createVerify('sha256');
  const payloads = [canonicalTransactionPayload(transaction, config.chainId)];

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
  const tokens = Array.isArray(config.p2pTokens) && config.p2pTokens.length
    ? config.p2pTokens
    : (config.p2pToken ? [config.p2pToken] : []);
  if (!tokens.length) {
    return true;
  }
  const headerName = 'x-bulen-p2p-token';
  const token = request.headers[headerName];
  if (!token || !tokens.includes(token)) {
    response.status(403).json({ error: 'Forbidden' });
    return false;
  }
  return true;
}

function shouldRequireHandshake(config) {
  return config.p2pRequireHandshake !== false;
}

function createPeerProof(config, nodeId, chainId, nonce) {
  const token = config.p2pToken;
  if (!token) {
    return null;
  }
  const payload = `${nodeId}|${chainId}|${nonce}`;
  return hmac(token, payload);
}

function createPeerSessionToken(config, nodeId, chainId, clientNonce) {
  const token = config.p2pToken;
  if (!token) {
    return null;
  }
  const serverNonce = deriveServerNonce(config, nodeId);
  return hmac(token, `${nodeId}|${chainId}|${clientNonce}|${serverNonce}`);
}

function verifyHandshake(config, request, response) {
  const { nodeId, chainId, nonce, publicKey, signature } = request.body || {};
  if (!nodeId || !chainId || !nonce) {
    response.status(400).json({ error: 'Missing handshake parameters' });
    return { ok: false };
  }
  if (chainId !== config.chainId) {
    response.status(400).json({ error: 'ChainId mismatch' });
    return { ok: false };
  }

  if (!config.p2pToken) {
    if (!publicKey || !signature) {
      response.status(400).json({ error: 'Missing publicKey or signature' });
      return { ok: false };
    }
    const payload = `${nodeId}|${chainId}|${nonce}`;
    const ok = verifyPayload(publicKey, payload, signature);
    if (!ok) {
      response.status(403).json({ error: 'Invalid handshake signature' });
      return { ok: false };
    }
    const serverNonce = deriveServerNonce(config, nodeId);
    const sessionToken = crypto.randomBytes(24).toString('hex');
    return { ok: true, sessionToken, serverNonce, peerPublicKey: publicKey };
  }

  const peerProof = request.headers['x-bulen-peer-proof'];
  const expected = createPeerProof(config, nodeId, chainId, nonce);
  if (!peerProof || peerProof !== expected) {
    response.status(403).json({ error: 'Invalid handshake proof' });
    return { ok: false };
  }
  const serverNonce = deriveServerNonce(config, nodeId);
  const sessionToken = createPeerSessionToken(config, nodeId, chainId, nonce);
  return { ok: true, sessionToken, serverNonce, peerPublicKey: publicKey || null };
}

function verifyPeerSession(config, request, response, sessionStore) {
  const peerId = request.headers['x-bulen-peer-id'];
  const nonce = request.headers['x-bulen-peer-nonce'];
  const sessionToken = request.headers['x-bulen-peer-session'];

  if (!peerId || !nonce || !sessionToken) {
    response.status(403).json({ error: 'Missing peer session headers' });
    return false;
  }

  if (!config.p2pToken) {
    if (sessionStore && sessionStore.has(sessionToken)) {
      const entry = sessionStore.get(sessionToken);
      if (entry.peerId === peerId && (!entry.expiresAt || entry.expiresAt > Date.now())) {
        return true;
      }
    }
    response.status(403).json({ error: 'Invalid peer session' });
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

function signBlockHash(identity, hash) {
  if (!identity || !identity.privateKeyPem) {
    throw new Error('Missing node identity for signing');
  }
  return signPayload(identity.privateKeyPem, hash);
}

function verifyBlockSignature(publicKeyPem, hash, signature) {
  return verifyPayload(publicKeyPem, hash, signature);
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
  signBlockHash,
  verifyBlockSignature,
};
