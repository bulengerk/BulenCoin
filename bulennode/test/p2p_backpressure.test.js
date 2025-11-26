const test = require('node:test');
const assert = require('node:assert');

const baseConfig = require('../src/config');
const { createNodeContext, createServer } = require('../src/server');

test('P2P backpressure returns 503 when max concurrent is reached', async () => {
  const config = {
    ...baseConfig,
    httpPort: 0,
    p2pRequireHandshake: false,
    p2pToken: 'bp-token',
    p2pMaxConcurrent: 1,
  };
  const context = createNodeContext(config);
  const server = createServer(context);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  // Simulate busy P2P by pre-setting in-flight counter
  context.p2pInFlight = config.p2pMaxConcurrent;

  const res = await fetch(`${baseUrl}/p2p/tx`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-bulen-p2p-token': 'bp-token',
      'x-bulen-protocol-version': config.protocolVersion,
    },
    body: JSON.stringify({ transaction: { id: 'tx-busy' } }),
  });

  assert.strictEqual(res.status, 503);

  server.close();
  if (Array.isArray(context.timers)) {
    context.timers.forEach((t) => clearInterval(t));
  }
});
