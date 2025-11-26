const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const { createServer, summarizeValidators } = require('../src/server');

function startMockNode() {
  const blocks = [
    {
      index: 5,
      hash: 'hash-5',
      previousHash: 'hash-4',
      validator: 'val-1',
      transactions: [{ id: 'tx-1', from: 'alice', to: 'bob', amount: 10, fee: 1, timestamp: 't1' }],
      timestamp: 't1',
    },
    {
      index: 4,
      hash: 'hash-4',
      previousHash: 'hash-3',
      validator: 'val-2',
      transactions: [],
      timestamp: 't0',
    },
  ];
  const accounts = {
    'addr-test': { address: 'addr-test', balance: 123, stake: 45, reputation: 2 },
  };
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://localhost');
      res.setHeader('Content-Type', 'application/json');
      if (url.pathname === '/api/status') {
        res.end(
          JSON.stringify({
            chainId: 'test-chain',
            height: 5,
            nodeId: 'node-1',
            nodeProfile: 'desktop-full',
            nodeRole: 'validator',
            finalizedHeight: 4,
            totalStake: 999,
            mempoolSize: 1,
            peers: ['peer-a', 'peer-b'],
          }),
        );
      } else if (url.pathname === '/api/blocks') {
        res.end(JSON.stringify({ blocks }));
      } else if (url.pathname.startsWith('/api/blocks/')) {
        const height = Number(url.pathname.split('/').pop());
        const block = blocks.find((b) => b.index === height);
        res.end(JSON.stringify(block));
      } else if (url.pathname === '/api/mempool') {
        res.end(JSON.stringify([{ id: 'mempool-1', from: 'carol', to: 'dan', amount: 3, fee: 0.1 }]));
      } else if (url.pathname.startsWith('/api/accounts/')) {
        const addr = decodeURIComponent(url.pathname.split('/').pop());
        res.end(JSON.stringify(accounts[addr] || { address: addr, balance: 0, stake: 0, reputation: 0 }));
      } else {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: 'not found' }));
      }
    });
    server.listen(0, () => {
      const port = server.address().port;
      resolve({ baseUrl: `http://127.0.0.1:${port}/api`, close: () => server.close() });
    });
  });
}

function startMockRewardsHub() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      res.setHeader('Content-Type', 'application/json');
      if (req.url === '/leaderboard') {
        res.end(
          JSON.stringify({
            entries: [
              {
                nodeId: 'node-1',
                score: 12.34,
                stake: 1000,
                uptimePercent: 0.995,
                badges: ['uptime-99', 'staker-1k'],
                deviceClass: 'desktop',
              },
            ],
          }),
        );
      } else {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: 'not found' }));
      }
    });
    server.listen(0, () => {
      resolve({
        baseUrl: `http://127.0.0.1:${server.address().port}`,
        close: () => server.close(),
      });
    });
  });
}

test('summarizeValidators groups blocks by validator', () => {
  const summary = summarizeValidators([
    { index: 1, validator: 'a' },
    { index: 2, validator: 'a' },
    { index: 3, validator: 'b' },
  ]);
  const a = summary.find((s) => s.validator === 'a');
  const b = summary.find((s) => s.validator === 'b');
  assert.deepStrictEqual({ produced: a.produced, lastHeight: a.lastHeight }, { produced: 2, lastHeight: 2 });
  assert.deepStrictEqual({ produced: b.produced, lastHeight: b.lastHeight }, { produced: 1, lastHeight: 3 });
});

test('explorer renders homepage and account page using mock node APIs', async () => {
  const node = await startMockNode();
  const rewards = await startMockRewardsHub();
  const server = createServer({
    nodeApiBase: node.baseUrl,
    rewardsHubBase: rewards.baseUrl,
    port: 0,
    logFormat: 'none',
    explorerTitle: 'Test Explorer',
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const home = await fetch(baseUrl + '/');
  const html = await home.text();
  assert.strictEqual(home.status, 200);
  assert.ok(html.includes('Test Explorer'));
  assert.ok(html.includes('Latest blocks'));
  assert.ok(html.includes('Rewards leaderboard'));

  const account = await fetch(`${baseUrl}/accounts/addr-test`);
  const accountHtml = await account.text();
  assert.strictEqual(account.status, 200);
  assert.ok(accountHtml.includes('addr-test'));
  assert.ok(accountHtml.includes('Balance:'));

  server.close();
  node.close();
  rewards.close();
});
