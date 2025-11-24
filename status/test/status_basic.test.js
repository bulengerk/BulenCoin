const test = require('node:test');
const assert = require('node:assert');

// Simple integration test that assumes STATUS_NODES points to at least one node.

const port = Number(process.env.STATUS_PORT || '0');
const baseUrl = port === 0 ? null : `http://127.0.0.1:${port}`;

async function fetchJson(url) {
  const response = await fetch(url);
  const body = await response.json();
  return { status: response.status, body };
}

test('status service returns aggregate JSON (when configured)', async () => {
  if (!baseUrl) {
    // No status service port set for tests; skip.
    return;
  }
  const result = await fetchJson(baseUrl + '/status');
  assert.strictEqual(result.status, 200);
  assert.ok(result.body);
  assert.ok('aggregate' in result.body);
});

