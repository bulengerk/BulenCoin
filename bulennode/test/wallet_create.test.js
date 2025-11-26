const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

process.env.BULEN_NODE_PROFILE = 'desktop-full';
process.env.BULEN_HTTP_PORT = '0';
process.env.BULEN_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'bulen-wallets-'));
process.env.BULEN_WALLET_REQUIRE_PASSPHRASE = '1';
process.env.BULEN_WALLET_PASSPHRASE_MIN_LENGTH = '8';

const config = require('../src/config');
const { createNodeContext, createServer } = require('../src/server');

const context = createNodeContext(config);
config.enableFaucet = false;
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

test('create wallet, store keystore and confirm backup', async (t) => {
  t.after(() => server.close());

  const missing = await fetchJson(`${baseUrl}/api/wallets/create`, {
    method: 'POST',
    body: JSON.stringify({ label: 'no-pass' }),
  });
  assert.strictEqual(missing.status, 400);

  const create = await fetchJson(`${baseUrl}/api/wallets/create`, {
    method: 'POST',
    body: JSON.stringify({ label: 'test-wallet', profile: 'desktop', passphrase: 'supersecret' }),
  });
  assert.strictEqual(create.status, 201);
  assert.ok(create.body.address, 'address returned');
  assert.ok(
    create.body.backup && create.body.backup.privateKeyPem.includes('ENCRYPTED'),
    'backup pem encrypted',
  );

  const keyPath = path.join(config.dataDir, 'wallets', `${create.body.address}.pem`);
  assert.ok(fs.existsSync(keyPath), 'keystore file written');
  const pem = fs.readFileSync(keyPath, 'utf-8');
  assert.ok(pem.includes('ENCRYPTED'), 'keystore is encrypted');

  const confirm = await fetchJson(`${baseUrl}/api/wallets/backup-confirm`, {
    method: 'POST',
    body: JSON.stringify({ address: create.body.address }),
  });
  assert.strictEqual(confirm.status, 200);
  assert.ok(confirm.body.backedUpAt);

  const list = await fetchJson(`${baseUrl}/api/wallets`);
  assert.strictEqual(list.status, 200);
  const entry = (list.body.wallets || []).find((w) => w.address === create.body.address);
  assert.ok(entry, 'wallet listed');
  assert.ok(entry.backedUpAt, 'backup telemetry persisted');
});
