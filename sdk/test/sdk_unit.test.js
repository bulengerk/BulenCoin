const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const { BulenSdk } = require('../bulencoin-sdk');

test('buildPaymentLink validates input and truncates memo', () => {
  const sdk = new BulenSdk({ apiBase: 'http://example.com/api' });
  assert.throws(() => sdk.buildPaymentLink({ to: '', amount: 10 }), /Missing/);
  assert.throws(() => sdk.buildPaymentLink({ to: 'merchant', amount: 0 }), /Invalid amount/);
  const longMemo = 'a'.repeat(80);
  const link = sdk.buildPaymentLink({ to: 'merchant', amount: 5, memo: longMemo });
  const memoParam = decodeURIComponent(link.split('memo=')[1]);
  assert.strictEqual(memoParam.length, 64);
});

test('createPaymentLink surfaces server errors', async () => {
  let server;
  await new Promise((resolve) => {
    server = http.createServer((req, res) => {
      if (req.url === '/payment-link') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'bad-request' }));
      } else {
        res.writeHead(404);
        res.end();
      }
    });
    server.listen(0, '127.0.0.1', () => resolve());
  });
  const port = server.address().port;
  const sdk = new BulenSdk({ apiBase: `http://127.0.0.1:${port}` });
  let threw = false;
  try {
    await sdk.createPaymentLink({ address: 'merchant', amount: 1 });
  } catch (error) {
    threw = true;
    assert.ok(/bad-request/.test(error.message));
  } finally {
    server.close();
  }
  assert.ok(threw, 'should throw on server 400');
});
