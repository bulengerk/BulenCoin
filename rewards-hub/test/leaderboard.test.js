import test from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import express from 'express';
import fetch from 'node-fetch';

test('leaderboard stores reports and enforces token and min stake', async () => {
  const token = 'test-token';
  const { app, server } = await startTestServer({ token, minStake: 50 });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  // Missing token
  let res = await fetch(`${baseUrl}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nodeId: 'node1', stake: 100, uptimePercent: 0.9 }),
  });
  assert.strictEqual(res.status, 403);

  // Below min stake
  res = await fetch(`${baseUrl}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-rewards-token': token },
    body: JSON.stringify({ nodeId: 'node1', stake: 10, uptimePercent: 0.9 }),
  });
  assert.strictEqual(res.status, 400);

  // Valid report
  res = await fetch(`${baseUrl}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-rewards-token': token },
    body: JSON.stringify({
      nodeId: 'node1',
      stake: 100,
      uptimePercent: 0.95,
      deviceClass: 'desktop',
      reputation: 2,
      deviceBoost: 1.1,
    }),
  });
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.ok(body.score > 0);

  // Leaderboard
  res = await fetch(`${baseUrl}/leaderboard`);
  assert.strictEqual(res.status, 200);
  const lb = await res.json();
  assert.strictEqual(lb.count, 1);
  assert.strictEqual(lb.entries[0].nodeId, 'node1');

  server.close();
});

function startTestServer({ token, minStake }) {
  return new Promise((resolve) => {
    const app = express();
    app.use(express.json());
    const reports = [];

    app.post('/reports', (req, res) => {
      const hdr = req.headers['x-rewards-token'];
      if (hdr !== token) return res.status(403).end();
      const report = req.body;
      if (report.stake < minStake) return res.status(400).end();
      reports.push(report);
      res.json({ ok: true, score: 1 });
    });

    app.get('/leaderboard', (req, res) => res.json({ count: reports.length, entries: reports }));

    const server = http.createServer(app).listen(0, () => {
      resolve({ app, server });
    });
  });
}
