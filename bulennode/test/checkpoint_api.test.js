const test = require('node:test');
const assert = require('node:assert');

const baseConfig = require('../src/config');
const { createNodeContext, createServer } = require('../src/server');

test('checkpoint API exposes finalized snapshot hash and height', async () => {
  const config = {
    ...baseConfig,
    httpPort: 0,
    enableFaucet: false,
  };
  const context = createNodeContext(config);
  const server = createServer(context);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const res = await fetch(`${baseUrl}/api/checkpoint`);
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.ok(typeof body.height === 'number');
  assert.ok(body.hash);
  assert.ok(body.snapshotHash);

  server.close();
  if (Array.isArray(context.timers)) {
    context.timers.forEach((t) => clearInterval(t));
  }
});
