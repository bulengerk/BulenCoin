const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

process.env.BULEN_NODE_PROFILE = 'desktop-full';
process.env.BULEN_HTTP_PORT = '0';
process.env.BULEN_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'bulen-wallets-cross-a-'));
process.env.BULEN_WALLET_REQUIRE_PASSPHRASE = '1';
process.env.BULEN_WALLET_PASSPHRASE_MIN_LENGTH = '8';

const baseConfig = require('../src/config');
const { createNodeContext, createServer } = require('../src/server');

function cloneConfig(overrides = {}) {
  return {
    ...baseConfig,
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
  let body = null;
  try {
    body = await response.json();
  } catch (error) {
    body = null;
  }
  return { status: response.status, body };
}

test('wallet can be created on one node and imported on another (migration)', async (t) => {
  const dataDirA = fs.mkdtempSync(path.join(os.tmpdir(), 'bulen-wallets-cross-a-'));
  const dataDirB = fs.mkdtempSync(path.join(os.tmpdir(), 'bulen-wallets-cross-b-'));

  const configA = cloneConfig({
    dataDir: dataDirA,
    httpPort: 0,
    enableFaucet: false,
    requireSignatures: false,
  });
  const ctxA = createNodeContext(configA);
  const serverA = createServer(ctxA);
  const baseA = `http://127.0.0.1:${serverA.address().port}`;

  const configB = cloneConfig({
    dataDir: dataDirB,
    httpPort: 0,
    enableFaucet: false,
    requireSignatures: false,
  });
  const ctxB = createNodeContext(configB);
  const serverB = createServer(ctxB);
  const baseB = `http://127.0.0.1:${serverB.address().port}`;

  t.after(() => {
    serverA.close();
    serverB.close();
  });

  const created = await fetchJson(`${baseA}/api/wallets/create`, {
    method: 'POST',
    body: JSON.stringify({ label: 'origin', profile: 'desktop', passphrase: 'secretpass' }),
  });
  assert.strictEqual(created.status, 201);
  const backupPem = created.body.backup.privateKeyPem;

  const imported = await fetchJson(`${baseB}/api/wallets/import`, {
    method: 'POST',
    body: JSON.stringify({ backup: backupPem, passphrase: 'secretpass', label: 'migrated' }),
  });
  assert.strictEqual(imported.status, 201);
  assert.strictEqual(imported.body.address, created.body.address);

  const listB = await fetchJson(`${baseB}/api/wallets`);
  assert.strictEqual(listB.status, 200);
  const entry = (listB.body.wallets || []).find((w) => w.address === created.body.address);
  assert.ok(entry, 'imported wallet present on node B');
  assert.ok(entry.passphraseProtected);

  // Ensure keystore file exists on node B
  const keyPathB = path.join(configB.dataDir, 'wallets', `${created.body.address}.pem`);
  assert.ok(fs.existsSync(keyPathB));
});
