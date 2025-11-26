const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { hashObject } = require('./chain');

function deriveAddressFromPublicKey(publicKeyPem) {
  const hash = crypto.createHash('sha256').update(publicKeyPem).digest('hex');
  return `addr_${hash.slice(0, 40)}`;
}

function ensureNodeKeys(config) {
  const keyPath = config.nodeKeyPath || path.join(config.dataDir, 'node_key.pem');
  const rotateDays = Number(config.nodeKeyRotateDays || 0);
  let privateKeyPem;
  let shouldRotate = false;
  try {
    const stats = fs.statSync(keyPath);
    if (rotateDays > 0) {
      const ageDays = (Date.now() - stats.mtimeMs) / (24 * 3600 * 1000);
      shouldRotate = ageDays >= rotateDays;
    }
    if (!shouldRotate) {
      privateKeyPem = fs.readFileSync(keyPath, 'utf8');
    }
  } catch (error) {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'secp256k1' });
    privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' });
    const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' });
    fs.mkdirSync(path.dirname(keyPath), { recursive: true });
    fs.writeFileSync(keyPath, privateKeyPem, { mode: 0o600 });
    return {
      privateKeyPem,
      publicKeyPem,
      address: deriveAddressFromPublicKey(publicKeyPem),
      keyPath,
    };
  }
  if (shouldRotate) {
    const backupPath = `${keyPath}.${new Date().toISOString().replace(/[:.]/g, '-')}.bak`;
    try {
      fs.copyFileSync(keyPath, backupPath);
    } catch (error) {
      // best-effort backup
    }
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'secp256k1' });
    privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' });
    const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' });
    fs.writeFileSync(keyPath, privateKeyPem, { mode: 0o600 });
    return {
      privateKeyPem,
      publicKeyPem,
      address: deriveAddressFromPublicKey(publicKeyPem),
      keyPath,
    };
  }
  const publicKeyPem = crypto.createPublicKey(privateKeyPem).export({ type: 'spki', format: 'pem' });
  return {
    privateKeyPem,
    publicKeyPem,
    address: deriveAddressFromPublicKey(publicKeyPem),
    keyPath,
  };
}

function signPayload(privateKeyPem, payload) {
  const signer = crypto.createSign('sha256');
  signer.update(payload);
  signer.end();
  return signer.sign(privateKeyPem, 'base64');
}

function verifyPayload(publicKeyPem, payload, signature) {
  const verifier = crypto.createVerify('sha256');
  verifier.update(payload);
  verifier.end();
  try {
    return verifier.verify(publicKeyPem, signature, 'base64');
  } catch (error) {
    return false;
  }
}

function deriveServerNonce(config, peerId) {
  const seed = `${config.nodePublicKey || config.nodeId}:${peerId}`;
  return hashObject({ seed }).slice(0, 32);
}

module.exports = {
  deriveAddressFromPublicKey,
  ensureNodeKeys,
  signPayload,
  verifyPayload,
  deriveServerNonce,
};
