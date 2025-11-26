const express = require('express');
const morgan = require('morgan');
const axios = require('axios');

const nodeApiBase =
  process.env.BULENNODE_API_BASE ||
  process.env.BULENNODE_API ||
  'http://localhost:4100/api';
const port = Number(process.env.EXPLORER_PORT || '4200');
const logFormat = process.env.EXPLORER_LOG_FORMAT || 'dev';
const explorerTitle = process.env.EXPLORER_TITLE || 'BulenCoin Explorer';
const rewardsHubBase =
  process.env.REWARDS_HUB_BASE ||
  process.env.REWARDS_HUB ||
  'http://localhost:4400';

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function fetchStatus() {
  const response = await axios.get(`${nodeApiBase}/status`);
  return response.data;
}

async function fetchPeers() {
  try {
    const response = await axios.get(`${nodeApiBase}/status`);
    return response.data.peers || [];
  } catch (error) {
    return [];
  }
}

async function fetchMempool() {
  try {
    const response = await axios.get(`${nodeApiBase}/mempool`);
    return response.data || [];
  } catch (error) {
    return [];
  }
}

async function fetchBlocks(limit, offset) {
  const response = await axios.get(`${nodeApiBase}/blocks`, {
    params: { limit, offset },
  });
  return response.data;
}

async function fetchBlock(height) {
  const response = await axios.get(`${nodeApiBase}/blocks/${height}`);
  return response.data;
}

async function fetchAccount(address) {
  const response = await axios.get(`${nodeApiBase}/accounts/${address}`);
  return response.data;
}

async function fetchLeaderboard() {
  try {
    const response = await axios.get(`${rewardsHubBase}/leaderboard`);
    return response.data.entries || [];
  } catch (error) {
    return [];
  }
}

function summarizeValidators(blocks) {
  const map = new Map();
  blocks.forEach((block) => {
    const entry = map.get(block.validator) || { count: 0, last: block.index };
    entry.count += 1;
    entry.last = Math.max(entry.last, block.index);
    map.set(block.validator, entry);
  });
  return Array.from(map.entries()).map(([validator, info]) => ({
    validator,
    produced: info.count,
    lastHeight: info.last,
  }));
}

function renderLayout(title, bodyHtml) {
  return `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; background: #020617; color: #e5e7eb; }
      a { color: #93c5fd; text-decoration: none; }
      a:hover { text-decoration: underline; }
      header, footer { background: #020617; border-bottom: 1px solid #1f2937; padding: 0.75rem 1.5rem; }
      footer { border-top: 1px solid #1f2937; border-bottom: none; margin-top: 2rem; font-size: 0.85rem; color: #9ca3af; }
      .container { max-width: 960px; margin: 0 auto; padding: 1.5rem; }
      h1, h2, h3 { color: #f9fafb; margin-top: 0; }
      table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
      th, td { padding: 0.4rem 0.5rem; border-bottom: 1px solid #111827; text-align: left; }
      tr:nth-child(even) { background: #020617; }
      tr:nth-child(odd) { background: #030712; }
      input[type="text"] { padding: 0.25rem 0.4rem; border-radius: 0.25rem; border: 1px solid #4b5563; background: #020617; color: #e5e7eb; }
      button { padding: 0.3rem 0.6rem; border-radius: 0.25rem; border: none; background: #2563eb; color: white; cursor: pointer; }
      button:hover { background: #1d4ed8; }
      .meta { font-size: 0.9rem; color: #9ca3af; margin-bottom: 1rem; }
      .error { color: #fecaca; margin: 1rem 0; }
      .badge { display: inline-block; padding: 0.15rem 0.45rem; border-radius: 999px; background: #111827; color: #bfdbfe; font-size: 0.75rem; margin-right: 0.2rem; border: 1px solid #1f2937; }
      .pill { display: inline-block; padding: 0.15rem 0.45rem; border-radius: 0.25rem; background: #0b1224; color: #cbd5e1; font-size: 0.8rem; border: 1px solid #1e293b; margin-left: 0.35rem; }
    </style>
  </head>
  <body>
    <header>
      <div class="container">
        <strong>${escapeHtml(explorerTitle)}</strong>
        <span style="margin-left: 1rem; font-size: 0.85rem;"><a href="/">Latest blocks</a></span>
      </div>
    </header>
    <main class="container">
      ${bodyHtml}
    </main>
    <footer>
      <div class="container">
        Connected to node API at ${escapeHtml(nodeApiBase)}
      </div>
    </footer>
  </body>
</html>
`;
}

function createServer() {
  const app = express();
  app.use(morgan(logFormat));

  app.get('/', async (request, response) => {
    try {
      const [status, blocksPage, mempool, peers, leaderboard] =
        await Promise.all([
          fetchStatus(),
          fetchBlocks(20, 0),
          fetchMempool(),
          fetchPeers(),
          fetchLeaderboard(),
        ]);
      const rows = blocksPage.blocks
        .map(
          (block) => `
        <tr>
          <td><a href="/blocks/${block.index}">#${block.index}</a></td>
          <td>${escapeHtml(block.hash.slice(0, 16))}…</td>
          <td>${escapeHtml(block.validator)}</td>
          <td>${block.transactions.length}</td>
          <td>${escapeHtml(block.timestamp)}</td>
        </tr>`,
        )
        .join('');
      const validatorRows = summarizeValidators(blocksPage.blocks)
        .map(
          (item) => `
          <tr>
            <td>${escapeHtml(item.validator)}</td>
            <td>${item.produced}</td>
            <td>${item.lastHeight}</td>
          </tr>`,
        )
        .join('');
      const peerRows = peers
        .map((peer) => `<li>${escapeHtml(String(peer))}</li>`)
        .join('');
      const mempoolRows = mempool
        .slice(0, 20)
        .map(
          (tx) => `
        <tr>
          <td>${escapeHtml(tx.id || '')}</td>
          <td>${escapeHtml(tx.from || '')}</td>
          <td>${escapeHtml(tx.to || '')}</td>
          <td>${tx.amount}</td>
          <td>${tx.fee}</td>
        </tr>`,
        )
        .join('');
      const bodyHtml = `
        <h1>BulenCoin Explorer</h1>
        <div class="meta">
          chainId: <strong>${escapeHtml(status.chainId)}</strong>,
          height: <strong>${status.height}</strong>,
          node: <strong>${escapeHtml(status.nodeId)}</strong> (${escapeHtml(
            status.nodeProfile,
          )}, ${escapeHtml(status.nodeRole)}), finality: <strong>${escapeHtml(
            String(status.finalizedHeight || 0),
          )}</strong>, total stake: <strong>${escapeHtml(String(status.totalStake || 0))}</strong>, mempool: ${
            status.mempoolSize
          }
        </div>
        <form method="get" action="/accounts" style="margin-bottom: 1rem;">
          <label for="address" style="font-size: 0.85rem;">Account address:</label>
          <input type="text" id="address" name="address" placeholder="addr1..." />
          <button type="submit">Show account</button>
        </form>
        <h2>Latest blocks</h2>
        <table>
          <thead>
            <tr>
              <th>Height</th>
              <th>Hash</th>
              <th>Validator</th>
              <th>Txs</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
        <h2>Top validators (recent 20 blocks)</h2>
        <table>
          <thead>
            <tr><th>Validator</th><th>Produced</th><th>Last height</th></tr>
          </thead>
          <tbody>${validatorRows || '<tr><td colspan="3">No data</td></tr>'}</tbody>
        </table>
        <h2>Rewards leaderboard (telemetry)</h2>
        <div class="meta">Source: ${escapeHtml(rewardsHubBase)}</div>
        <table>
          <thead><tr><th>Node</th><th>Score</th><th>Stake</th><th>Uptime</th><th>Badges</th></tr></thead>
          <tbody>
            ${
              leaderboard.length
                ? leaderboard
                    .slice(0, 10)
                    .map(
                      (entry) => `<tr>
                        <td>${escapeHtml(entry.nodeId || '')} <span class="pill">${escapeHtml(
                          entry.deviceClass || '',
                        )}</span></td>
                        <td>${Number(entry.score || 0).toFixed(2)}</td>
                        <td>${escapeHtml(String(entry.stake || 0))}</td>
                        <td>${Math.round((entry.uptimePercent || 0) * 100)}%</td>
                        <td>${
                          (entry.badges || []).length
                            ? entry.badges
                                .map(
                                  (b) =>
                                    `<span class="badge">${escapeHtml(b)}</span>`,
                                )
                                .join(' ')
                            : '<span class="badge">none</span>'
                        }</td>
                      </tr>`,
                    )
                    .join('')
                : '<tr><td colspan="5">No telemetry yet</td></tr>'
            }
          </tbody>
        </table>
        <h2>Peers (reported)</h2>
        <ul>${peerRows || '<li>No peers reported</li>'}</ul>
        <h2>Live mempool (sample)</h2>
        <table>
          <thead><tr><th>ID</th><th>From</th><th>To</th><th>Amount</th><th>Fee</th></tr></thead>
          <tbody>${mempoolRows || '<tr><td colspan="5">Empty</td></tr>'}</tbody>
        </table>
      `;
      response.send(renderLayout('BulenCoin Explorer', bodyHtml));
    } catch (error) {
      console.error(error);
      response
        .status(500)
        .send(
          renderLayout(
            'Error',
            '<div class="error">Failed to load data from node API.</div>',
          ),
        );
    }
  });

  app.get('/blocks/:height', async (request, response) => {
    const height = request.params.height;
    try {
      const block = await fetchBlock(height);
      const transactionsRows = block.transactions
        .map(
          (transaction) => `
        <tr>
          <td>${escapeHtml(transaction.id)}</td>
          <td><a href="/accounts/${encodeURIComponent(
            transaction.from,
          )}">${escapeHtml(transaction.from)}</a></td>
          <td><a href="/accounts/${encodeURIComponent(
            transaction.to,
          )}">${escapeHtml(transaction.to)}</a></td>
          <td>${transaction.amount}</td>
          <td>${transaction.fee}</td>
          <td>${escapeHtml(transaction.timestamp)}</td>
        </tr>`,
        )
        .join('');
      const bodyHtml = `
        <h1>Block #${block.index}</h1>
        <div class="meta">
          Hash: <code>${escapeHtml(block.hash)}</code><br />
          Previous hash: <code>${escapeHtml(block.previousHash)}</code><br />
          Validator: <strong>${escapeHtml(block.validator)}</strong><br />
          Timestamp: ${escapeHtml(block.timestamp)}<br />
          Transactions: ${block.transactions.length}
        </div>
        <h2>Transactions</h2>
        ${
          block.transactions.length === 0
            ? '<p>No transactions in this block.</p>'
            : `<table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>From</th>
                    <th>To</th>
                    <th>Amount</th>
                    <th>Fee</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>${transactionsRows}</tbody>
               </table>`
        }
        <p><a href="/">Back to latest blocks</a></p>
      `;
      response.send(renderLayout(`Block #${block.index}`, bodyHtml));
    } catch (error) {
      console.error(error);
      response
        .status(500)
        .send(
          renderLayout(
            'Block not found',
            `<div class="error">Failed to load block ${height} from node API.</div>`,
          ),
        );
    }
  });

  app.get('/accounts', async (request, response) => {
    const address = request.query.address;
    if (!address) {
      response.redirect('/');
      return;
    }
    response.redirect(`/accounts/${encodeURIComponent(address)}`);
  });

  app.get('/accounts/:address', async (request, response) => {
    const address = request.params.address;
    try {
      const account = await fetchAccount(address);
      const bodyHtml = `
        <h1>Account ${escapeHtml(account.address)}</h1>
        <div class="meta">
          Balance: <strong>${account.balance}</strong><br />
          Stake: ${account.stake}<br />
          Reputation: ${account.reputation}
        </div>
        <p><a href="/">Back to latest blocks</a></p>
      `;
      response.send(renderLayout(`Account ${account.address}`, bodyHtml));
    } catch (error) {
      console.error(error);
      response
        .status(500)
        .send(
          renderLayout(
            'Account not found',
            `<div class="error">Failed to load account ${address} from node API.</div>`,
          ),
        );
    }
  });

  app.listen(port, () => {
    console.log(`BulenCoin Explorer listening on http://localhost:${port}`);
  });
}

createServer();
