const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { deriveAddressFromPublicKey } = require('./identity');

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

function walletDir(config) {
  return path.join(config.dataDir, 'wallets');
}

function walletMetaPath(config) {
  return path.join(walletDir(config), 'wallets_meta.json');
}

function loadWalletMeta(config) {
  try {
    const data = JSON.parse(fs.readFileSync(walletMetaPath(config), 'utf-8'));
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.wallets)) return data.wallets;
  } catch (error) {
    // ignore
  }
  return [];
}

function saveWalletMeta(config, meta) {
  fs.mkdirSync(walletDir(config), { recursive: true });
  fs.writeFileSync(walletMetaPath(config), JSON.stringify({ wallets: meta }, null, 2));
}

function randomId(prefix) {
  return `${prefix}_${Date.now().toString(16)}_${crypto.randomBytes(6).toString('hex')}`;
}

function recordWalletMeta(config, entry) {
  const list = loadWalletMeta(config);
  const existing = list.find((w) => w.address === entry.address);
  if (existing) {
    Object.assign(existing, entry);
  } else {
    list.push(entry);
  }
  saveWalletMeta(config, list);
  return entry;
}

function markBackedUp(config, address) {
  const list = loadWalletMeta(config);
  const item = list.find((w) => w.address === address);
  if (!item) return null;
  item.backedUpAt = new Date().toISOString();
  saveWalletMeta(config, list);
  return item;
}

function createLocalWallet(config, payload = {}) {
  const label = payload.label || '';
  const passphrase = payload.passphrase || '';
  const profile = payload.profile || 'generic';
  if (config.walletRequirePassphrase && (!passphrase || passphrase.length < config.walletPassphraseMinLength)) {
    throw new Error(
      `Passphrase required (min length ${config.walletPassphraseMinLength || 1})`,
    );
  }
  if (passphrase && passphrase.length < (config.walletPassphraseMinLength || 1)) {
    throw new Error(
      `Passphrase too short (min length ${config.walletPassphraseMinLength || 1})`,
    );
  }
  const keyEncoding = {
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  };
  if (passphrase) {
    keyEncoding.privateKeyEncoding.cipher = 'aes-256-cbc';
    keyEncoding.privateKeyEncoding.passphrase = passphrase;
  }
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'secp256k1' });
  const privateKeyPem = privateKey.export(keyEncoding.privateKeyEncoding);
  const publicKeyPem = publicKey.export(keyEncoding.publicKeyEncoding);
  const address = deriveAddressFromPublicKey(publicKeyPem);
  const dir = walletDir(config);
  fs.mkdirSync(dir, { recursive: true });
  const keyPath = path.join(dir, `${address}.pem`);
  fs.writeFileSync(keyPath, privateKeyPem, { mode: 0o600 });
  const createdAt = new Date().toISOString();
  recordWalletMeta(config, {
    address,
    label,
    profile,
    keyPath,
    createdAt,
    passphraseProtected: Boolean(passphrase),
  });
  return {
    address,
    publicKeyPem,
    privateKeyPem,
    keyPath,
    createdAt,
  };
}

function listWallets(config) {
  return loadWalletMeta(config);
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
  createLocalWallet,
  listWallets,
  markBackedUp,
  loadWalletMeta,
};
