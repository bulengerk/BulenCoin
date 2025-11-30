const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
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
  let body = null;
  try {
    body = await response.json();
  } catch (error) {
    body = null;
  }
  return { status: response.status, body };
}

test('CORS, max body size and rate limiting work as expected', async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bulen-additional-'));
  const config = cloneConfig({
    nodeId: 'node-additional-security',
    dataDir,
    httpPort: 0,
    maxBodySize: '64b',
    statusToken: '',
    metricsToken: '',
    bulcosSupplyCap: 0,
    bulcosDailyMintCap: 0,
    bulcosMinReserveRatio: 0,
  });
  // Restrict CORS to a single allowed origin; explicit status token empty to avoid 403
  config.corsOrigins = ['https://allowed.example'];
  config.statusToken = '';

  const context = createNodeContext(config);
  const server = createServer(context);
  const addressInfo = server.address();
  const baseUrl = `http://127.0.0.1:${addressInfo.port}`;
  const statusHeaders = config.statusToken ? { 'x-bulen-status-token': config.statusToken } : {};

  try {
    // 1. CORS: allowed origin should succeed
    const allowed = await fetchJson(`${baseUrl}/api/status`, {
      method: 'GET',
      headers: { Origin: 'https://allowed.example', ...statusHeaders },
    });
    assert.strictEqual(allowed.status, 200);

    // 2. CORS: disallowed origin should be rejected by CORS middleware
    const disallowed = await fetchJson(`${baseUrl}/api/status`, {
      method: 'GET',
      headers: { Origin: 'https://evil.example' },
    });
    assert.ok(
      disallowed.status >= 400,
      `Expected disallowed origin to receive error status, got ${disallowed.status}`,
    );

    // 3. Max body size: large payload should be rejected
    const largePayload = { from: 'a', to: 'b', amount: 1, fee: 0, padding: 'x'.repeat(1024) };
    const tooBig = await fetchJson(`${baseUrl}/api/transactions`, {
      method: 'POST',
      body: JSON.stringify(largePayload),
    });
    assert.ok(
      tooBig.status >= 400,
      `Expected large body to cause client error, got ${tooBig.status}`,
    );

    // 4. Rate limiting: many rapid requests should trigger HTTP 429
    let lastStatus = 200;
    for (let index = 0; index < 65; index += 1) {
      const result = await fetchJson(`${baseUrl}/api/health`, { method: 'GET' });
      lastStatus = result.status;
      if (lastStatus === 429) {
        break;
      }
    }
    assert.strictEqual(lastStatus, 429);
  } finally {
    server.close();
  }
});
