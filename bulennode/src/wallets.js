const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function storagePath(config) {
  return path.join(config.dataDir, 'wallet_sessions.json');
}

function loadStore(config) {
  try {
    const data = JSON.parse(fs.readFileSync(storagePath(config), 'utf-8'));
    return {
      challenges: Array.isArray(data.challenges) ? data.challenges : [],
      sessions: Array.isArray(data.sessions) ? data.sessions : [],
    };
  } catch (error) {
    return { challenges: [], sessions: [] };
  }
}

function saveStore(config, store) {
  fs.mkdirSync(path.dirname(storagePath(config)), { recursive: true });
  fs.writeFileSync(storagePath(config), JSON.stringify(store, null, 2));
}

function randomId(prefix) {
  return `${prefix}_${Date.now().toString(16)}_${crypto.randomBytes(6).toString('hex')}`;
}

function createChallenge(context, payload) {
  const { config, walletStore } = context;
  const now = Date.now();
  const expiresAt = new Date(now + 10 * 60 * 1000).toISOString(); // 10 minutes
  const nonce = crypto.randomBytes(8).toString('hex');
  const message = [
    'Sign this message to prove wallet ownership for BulenCoin.',
    `Address: ${payload.address}`,
    `Wallet: ${payload.walletType || 'unknown'}`,
    `Nonce: ${nonce}`,
    `Issued At: ${new Date(now).toISOString()}`,
  ].join('\n');

  const challenge = {
    id: randomId('chal'),
    address: payload.address,
    publicKey: payload.publicKey,
    walletType: payload.walletType || 'unknown',
    nonce,
    message,
    createdAt: new Date(now).toISOString(),
    expiresAt,
    status: 'pending',
  };
  walletStore.challenges.push(challenge);
  saveStore(config, walletStore);
  return challenge;
}

function pruneExpired(store) {
  const now = Date.now();
  store.challenges = store.challenges.filter((c) => Date.parse(c.expiresAt || 0) > now);
  store.sessions = store.sessions.filter((s) => Date.parse(s.expiresAt || 0) > now);
}

function verifySignature(challenge, signature) {
  const verifier = crypto.createVerify('sha256');
  verifier.update(challenge.message);
  verifier.end();
  try {
    return verifier.verify(challenge.publicKey, signature, 'base64');
  } catch (error) {
    return false;
  }
}

function createSession(context, challenge) {
  const { config, walletStore } = context;
  const now = Date.now();
  const expiresAt = new Date(now + 24 * 60 * 60 * 1000).toISOString(); // 24h
  const session = {
    id: randomId('sess'),
    address: challenge.address,
    publicKey: challenge.publicKey,
    walletType: challenge.walletType,
    createdAt: new Date(now).toISOString(),
    expiresAt,
  };
  walletStore.sessions.push(session);
  saveStore(config, walletStore);
  return session;
}

function verifyChallenge(context, challengeId, signature) {
  const { walletStore, config } = context;
  pruneExpired(walletStore);
  const challenge = walletStore.challenges.find((c) => c.id === challengeId);
  if (!challenge) {
    return { ok: false, reason: 'Challenge not found or expired' };
  }
  if (challenge.status === 'verified') {
    return { ok: false, reason: 'Challenge already used' };
  }
  const valid = verifySignature(challenge, signature);
  if (!valid) {
    return { ok: false, reason: 'Invalid signature' };
  }
  challenge.status = 'verified';
  saveStore(config, walletStore);
  const session = createSession(context, challenge);
  return { ok: true, session };
}

function getSession(context, sessionId) {
  pruneExpired(context.walletStore);
  return context.walletStore.sessions.find((s) => s.id === sessionId);
}

module.exports = {
  loadStore,
  saveStore,
  createChallenge,
  verifyChallenge,
  getSession,
  pruneExpired,
};
