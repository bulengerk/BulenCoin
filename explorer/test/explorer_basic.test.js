const test = require('node:test');
const assert = require('node:assert');

// Simple integration test that assumes a BulenNode is running on localhost:4100.

const port = Number(process.env.EXPLORER_PORT || '0');
const baseUrl = port === 0 ? null : `http://127.0.0.1:${port}`;

async function fetchHtml(url) {
  const response = await fetch(url);
  const text = await response.text();
  return { status: response.status, text };
}

test('explorer root renders HTML (when configured)', async () => {
  if (!baseUrl) {
    // No explorer port set for tests; skip.
    return;
  }
  const result = await fetchHtml(baseUrl + '/');
  assert.strictEqual(result.status, 200);
  assert.ok(result.text.includes('<html'));
});

