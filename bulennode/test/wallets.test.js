const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const crypto = require('node:crypto');
const fs = require('fs');
const os = require('os');

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

test('wallet challenge + verify returns session', async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bulen-wallets-'));
  const config = cloneConfig({
    nodeId: 'node-wallets',
    dataDir,
    httpPort: 0,
  });

  const context = createNodeContext(config);
  const server = createServer(context);
  const addressInfo = server.address();
  const baseUrl = `http://127.0.0.1:${addressInfo.port}`;

  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'secp256k1' });
  const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' });
  const address = `addr_${crypto.randomBytes(8).toString('hex')}`;

  try {
    const challengeRes = await fetchJson(`${baseUrl}/api/wallets/challenge`, {
      method: 'POST',
      body: JSON.stringify({ address, publicKey: publicKeyPem, walletType: 'metamask' }),
    });
    assert.strictEqual(challengeRes.status, 201);
    const signature = signMessage(privateKey.export({ type: 'pkcs8', format: 'pem' }), challengeRes.body.message);

    const verifyRes = await fetchJson(`${baseUrl}/api/wallets/verify`, {
      method: 'POST',
      body: JSON.stringify({ challengeId: challengeRes.body.id, signature }),
    });
    assert.strictEqual(verifyRes.status, 200);
    assert.ok(verifyRes.body.sessionId);

    const sessionRes = await fetchJson(`${baseUrl}/api/wallets/session/${verifyRes.body.sessionId}`, {
      method: 'GET',
    });
    assert.strictEqual(sessionRes.status, 200);
    assert.strictEqual(sessionRes.body.address, address);
  } finally {
    server.close();
  }
});
