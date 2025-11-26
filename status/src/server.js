const express = require('express');
const morgan = require('morgan');
const axios = require('axios');

const defaultPort = Number(process.env.STATUS_PORT || '4300');
const nodesEnv = process.env.STATUS_NODES || '';

const nodeStatusUrls = nodesEnv
  .split(',')
  .map((value) => value.trim())
  .filter((value) => value.length > 0);

async function fetchStatus(url) {
  const response = await axios.get(url, { timeout: 3000 });
  return response.data;
}

function aggregateStatuses(statuses) {
  const byDeviceClass = {};
  let totalBlocks = 0;

  for (const status of statuses) {
    const deviceClass = status.deviceClass || 'unknown';
    if (!byDeviceClass[deviceClass]) {
      byDeviceClass[deviceClass] = {
        deviceClass,
        count: 0,
        totalRewardWeight: 0,
        totalUptimeSeconds: 0,
      };
    }
    const bucket = byDeviceClass[deviceClass];
    bucket.count += 1;
    bucket.totalRewardWeight += status.rewardWeight || 0;
    if (status.metrics && typeof status.metrics.uptimeSeconds === 'number') {
      bucket.totalUptimeSeconds += status.metrics.uptimeSeconds;
    }
    if (typeof status.height === 'number') {
      totalBlocks += status.height;
    }
  }

  return {
    nodeCount: statuses.length,
    totalBlocks,
    byDeviceClass: Object.values(byDeviceClass),
  };
}

function renderHtmlSummary(aggregate, details) {
  const rows = aggregate.byDeviceClass
    .map(
      (item) => `
      <tr>
        <td>${item.deviceClass}</td>
        <td>${item.count}</td>
        <td>${item.totalRewardWeight.toFixed(2)}</td>
        <td>${Math.round(item.totalUptimeSeconds / 3600 * 10) / 10}</td>
      </tr>
    `,
    )
    .join('');

  const nodeRows = details
    .map(
      (status) => `
      <tr>
        <td>${status.nodeId}</td>
        <td>${status.nodeProfile}</td>
        <td>${status.deviceClass}</td>
        <td>${status.height}</td>
        <td>${status.metrics ? status.metrics.producedBlocks : '-'}</td>
      </tr>
    `,
    )
    .join('');

  return `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>BulenCoin Status</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; background: #020617; color: #e5e7eb; }
      .container { max-width: 960px; margin: 0 auto; padding: 1.5rem; }
      h1, h2 { color: #f9fafb; margin-top: 0; }
      table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
      th, td { padding: 0.4rem 0.5rem; border-bottom: 1px solid #111827; text-align: left; }
      tr:nth-child(even) { background: #020617; }
      tr:nth-child(odd) { background: #030712; }
    </style>
  </head>
  <body>
    <main class="container">
      <h1>BulenCoin Status</h1>
      <p>Total nodes: ${aggregate.nodeCount}, total reported blocks (sum of heights): ${aggregate.totalBlocks}</p>
      <h2>By device class</h2>
      <table>
        <thead>
          <tr>
            <th>Device class</th>
            <th>Nodes</th>
            <th>Total reward weight</th>
            <th>Total uptime (hours)</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      <h2>Nodes</h2>
      <table>
        <thead>
          <tr>
            <th>Node ID</th>
            <th>Profile</th>
            <th>Device class</th>
            <th>Height</th>
            <th>Produced blocks</th>
          </tr>
        </thead>
        <tbody>
          ${nodeRows}
        </tbody>
      </table>
    </main>
  </body>
</html>
`;
}

function createServer(options = {}) {
  const { port = defaultPort, statusUrls = nodeStatusUrls } = options;
  const app = express();
  app.use(morgan('dev'));

  app.get('/status', async (request, response) => {
    try {
      if (!statusUrls.length) {
        response.json({ nodeCount: 0, byDeviceClass: [] });
        return;
      }
      const results = await Promise.allSettled(statusUrls.map(fetchStatus));
      const statuses = results
        .filter((item) => item.status === 'fulfilled')
        .map((item) => item.value);
      const aggregate = aggregateStatuses(statuses);
      response.json({
        aggregate,
        nodes: statuses,
      });
    } catch (error) {
      console.error(error);
      response.status(500).json({ error: 'Failed to aggregate node statuses' });
    }
  });

  app.get('/', async (request, response) => {
    try {
      if (!statusUrls.length) {
        response.send('<p>No nodes configured. Set STATUS_NODES env variable.</p>');
        return;
      }
      const results = await Promise.allSettled(statusUrls.map(fetchStatus));
      const statuses = results
        .filter((item) => item.status === 'fulfilled')
        .map((item) => item.value);
      const aggregate = aggregateStatuses(statuses);
      response.send(renderHtmlSummary(aggregate, statuses));
    } catch (error) {
      console.error(error);
      response.status(500).send('<p>Failed to aggregate node statuses.</p>');
    }
  });

  const server = app.listen(port, () => {
    console.log(`BulenCoin status service listening on http://localhost:${port}`);
    if (!statusUrls.length) {
      console.log('No STATUS_NODES configured; aggregation endpoints will be empty.');
    }
  });
  return server;
}

if (require.main === module) {
  createServer();
}

module.exports = {
  fetchStatus,
  aggregateStatuses,
  renderHtmlSummary,
  createServer,
};
