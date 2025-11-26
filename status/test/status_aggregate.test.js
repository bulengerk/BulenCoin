const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const { aggregateStatuses, createServer } = require('../src/server');

function startMockNode(status) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(status));
    });
    server.listen(0, () => {
      const port = server.address().port;
      resolve({ url: `http://127.0.0.1:${port}`, server });
    });
  });
}

test('aggregateStatuses sums reward weights and uptime across device classes', () => {
  const agg = aggregateStatuses([
    { deviceClass: 'desktop', rewardWeight: 0.8, metrics: { uptimeSeconds: 3600 }, height: 5 },
    { deviceClass: 'desktop', rewardWeight: 1.0, metrics: { uptimeSeconds: 1800 }, height: 7 },
    { deviceClass: 'raspberry', rewardWeight: 0.75, metrics: { uptimeSeconds: 900 }, height: 2 },
  ]);
  assert.strictEqual(agg.nodeCount, 3);
  assert.strictEqual(agg.totalBlocks, 14);
  const desktop = agg.byDeviceClass.find((b) => b.deviceClass === 'desktop');
  const raspberry = agg.byDeviceClass.find((b) => b.deviceClass === 'raspberry');
  assert.deepStrictEqual(
    { count: desktop.count, weight: desktop.totalRewardWeight, uptime: desktop.totalUptimeSeconds },
    { count: 2, weight: 1.8, uptime: 5400 },
  );
  assert.deepStrictEqual(
    { count: raspberry.count, weight: raspberry.totalRewardWeight, uptime: raspberry.totalUptimeSeconds },
    { count: 1, weight: 0.75, uptime: 900 },
  );
});

test('status service aggregates multiple nodes into JSON and HTML', async () => {
  const nodeA = await startMockNode({
    nodeId: 'node-a',
    nodeProfile: 'desktop-full',
    deviceClass: 'desktop',
    rewardWeight: 0.8,
    metrics: { uptimeSeconds: 7200, producedBlocks: 3 },
    height: 4,
  });
  const nodeB = await startMockNode({
    nodeId: 'node-b',
    nodeProfile: 'raspberry',
    deviceClass: 'raspberry',
    rewardWeight: 0.75,
    metrics: { uptimeSeconds: 3600, producedBlocks: 1 },
    height: 2,
  });

  const server = createServer({ port: 0, statusUrls: [nodeA.url, nodeB.url] });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const resJson = await fetch(`${baseUrl}/status`);
  assert.strictEqual(resJson.status, 200);
  const body = await resJson.json();
  assert.strictEqual(body.nodes.length, 2);
  assert.strictEqual(body.aggregate.nodeCount, 2);
  assert.ok(body.aggregate.byDeviceClass.some((c) => c.deviceClass === 'raspberry'));

  const resHtml = await fetch(baseUrl + '/');
  const html = await resHtml.text();
  assert.ok(html.includes('BulenCoin Status'));
  assert.ok(html.includes('raspberry'));

  server.close();
  nodeA.server.close();
  nodeB.server.close();
});
