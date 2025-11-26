const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

process.env.BULEN_NODE_PROFILE = 'desktop-full';
process.env.BULEN_HTTP_PORT = '0';
process.env.BULEN_DATA_DIR = path.join(__dirname, '..', 'test-data-protocol');

const config = require('../src/config');
const { createNodeContext, createServer } = require('../src/server');

test('P2P accepts matching protocol major version and rejects mismatched major', async () => {
  config.protocolVersion = '1.2.0';
  config.p2pRequireHandshake = false;
  config.p2pToken = 'compat-token';
  const context = createNodeContext(config);
  const server = createServer(context);
  const addressInfo = server.address();
  const baseUrl = `http://127.0.0.1:${addressInfo.port}`;

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

  // Compatible protocol version (same major: 1.x)
  let result = await fetchJson(`${baseUrl}/p2p/tx`, {
    method: 'POST',
    headers: {
      'x-bulen-p2p-token': 'compat-token',
      'x-bulen-protocol-version': '1.5.3',
    },
    body: JSON.stringify({ transaction: { id: 'compat-tx' } }),
  });
  assert.strictEqual(result.status, 200);

  // Incompatible protocol version (different major: 2.x)
  result = await fetchJson(`${baseUrl}/p2p/tx`, {
    method: 'POST',
    headers: {
      'x-bulen-p2p-token': 'compat-token',
      'x-bulen-protocol-version': '2.0.0',
    },
    body: JSON.stringify({ transaction: { id: 'compat-tx-2' } }),
  });
  assert.strictEqual(result.status, 400);
  assert.ok(result.body && typeof result.body.error === 'string');

  server.close();
});
