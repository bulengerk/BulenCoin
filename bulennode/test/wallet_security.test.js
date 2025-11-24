const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('node:crypto');

const baseConfig = require('../src/config');
const { createNodeContext, createServer } = require('../src/server');

function cloneConfig(overrides) {
  return {
    ...baseConfig,
    peers: [],
    ...overrides,
  };
}

async function fetchJson(url, options) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options && options.headers ? options.headers : {}),
    },
  });
  const body = await response.json();
  return { status: response.status, body };
}

function signMessage(privateKeyPem, message) {
  const signer = crypto.createSign('sha256');
  signer.update(message);
  signer.end();
  return signer.sign(privateKeyPem, 'base64');
}

test('wallet challenge rejects invalid signature and prevents reuse', async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bulen-wallet-security-'));
  const config = cloneConfig({
    nodeId: 'node-wallet-security',
    dataDir,
    httpPort: 0,
  });
  const context = createNodeContext(config);
  const server = createServer(context);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'secp256k1' });
  const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' });
  const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' });
  const address = `addr_${crypto.randomBytes(6).toString('hex')}`;

  try {
    const challenge = await fetchJson(`${baseUrl}/api/wallets/challenge`, {
      method: 'POST',
      body: JSON.stringify({ address, publicKey: publicKeyPem, walletType: 'metamask' }),
    });
    assert.strictEqual(challenge.status, 201);

    // Wrong signature
    const wrongSignature = signMessage(privateKeyPem, 'tampered');
    const badVerify = await fetchJson(`${baseUrl}/api/wallets/verify`, {
      method: 'POST',
      body: JSON.stringify({ challengeId: challenge.body.id, signature: wrongSignature }),
    });
    assert.strictEqual(badVerify.status, 400);

    // Correct signature succeeds
    const correctSignature = signMessage(privateKeyPem, challenge.body.message);
    const verify = await fetchJson(`${baseUrl}/api/wallets/verify`, {
      method: 'POST',
      body: JSON.stringify({ challengeId: challenge.body.id, signature: correctSignature }),
    });
    assert.strictEqual(verify.status, 200);
    const sessionId = verify.body.sessionId;
    assert.ok(sessionId);

    // Reuse of the same challenge should fail
    const reuse = await fetchJson(`${baseUrl}/api/wallets/verify`, {
      method: 'POST',
      body: JSON.stringify({ challengeId: challenge.body.id, signature: correctSignature }),
    });
    assert.strictEqual(reuse.status, 400);

    // Session retrieval works
    const session = await fetchJson(`${baseUrl}/api/wallets/session/${sessionId}`);
    assert.strictEqual(session.status, 200);
    assert.strictEqual(session.body.address, address);
  } finally {
    server.close();
  }
});
