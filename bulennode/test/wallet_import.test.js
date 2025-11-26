const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

process.env.BULEN_NODE_PROFILE = 'desktop-full';
process.env.BULEN_HTTP_PORT = '0';
process.env.BULEN_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'bulen-wallets-import-'));
process.env.BULEN_WALLET_REQUIRE_PASSPHRASE = '1';
process.env.BULEN_WALLET_PASSPHRASE_MIN_LENGTH = '8';

const config = require('../src/config');
const { createNodeContext, createServer } = require('../src/server');

const context = createNodeContext(config);
const server = createServer(context);
const baseUrl = `http://127.0.0.1:${server.address().port}`;

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

test('import encrypted backup recreates wallet and rejects missing passphrase', async (t) => {
  t.after(() => server.close());

  const created = await fetchJson(`${baseUrl}/api/wallets/create`, {
    method: 'POST',
    body: JSON.stringify({ label: 'origin', profile: 'desktop', passphrase: 'supersecret' }),
  });
  assert.strictEqual(created.status, 201);
  const backupPem = created.body.backup.privateKeyPem;
  const keyPath = path.join(config.dataDir, 'wallets', `${created.body.address}.pem`);
  assert.ok(fs.existsSync(keyPath));

  // Remove local files to simulate migration to another node
  fs.rmSync(path.join(config.dataDir, 'wallets'), { recursive: true, force: true });

  const missingPass = await fetchJson(`${baseUrl}/api/wallets/import`, {
    method: 'POST',
    body: JSON.stringify({ backup: backupPem }),
  });
  assert.strictEqual(missingPass.status, 400);

  const imported = await fetchJson(`${baseUrl}/api/wallets/import`, {
    method: 'POST',
    body: JSON.stringify({ backup: backupPem, passphrase: 'supersecret', label: 'migrated' }),
  });
  assert.strictEqual(imported.status, 201);
  assert.strictEqual(imported.body.address, created.body.address);
  const newKeyPath = path.join(config.dataDir, 'wallets', `${created.body.address}.pem`);
  assert.ok(fs.existsSync(newKeyPath));
});
