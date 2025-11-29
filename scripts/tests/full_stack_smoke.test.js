/* eslint-disable no-console */
const test = require('node:test');
const assert = require('node:assert');
const { spawn } = require('node:child_process');
const { setTimeout: delay } = require('node:timers/promises');
const path = require('node:path');
const fs = require('node:fs');

const ROOT = path.resolve(__dirname, '..', '..');
const WORKDIR = path.join(ROOT, 'data', 'fullstack-smoke');
const STATUS_TOKEN = 'status-token';
const METRICS_TOKEN = 'metrics-token';
const P2P_TOKEN = 'p2p-token';

function startProcess(label, cwd, args, env) {
  const child = spawn('node', args, {
    cwd,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', (chunk) => {
    console.log(`[${label}] ${chunk.toString().trim()}`);
  });
  child.stderr.on('data', (chunk) => {
    console.error(`[${label}][err] ${chunk.toString().trim()}`);
  });
  const stop = () => {
    if (!child.killed) {
      child.kill();
    }
  };
  return { child, stop };
}

async function waitFor(fn, { timeoutMs = 20000, intervalMs = 400, label = 'condition' } = {}) {
  const started = Date.now();
  let lastError;
  while (Date.now() - started < timeoutMs) {
    try {
      const result = await fn();
      if (result) {
        return result;
      }
    } catch (error) {
      lastError = error;
    }
    await delay(intervalMs);
  }
  const error = new Error(`Timed out waiting for ${label}`);
  if (lastError) {
    error.cause = lastError;
  }
  throw error;
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const body = await response.json();
  return { status: response.status, body };
}

test(
  'full stack: bulennode + explorer + status launch together and serve data',
  { timeout: 60000 },
  async (t) => {
    fs.rmSync(WORKDIR, { recursive: true, force: true });
    fs.mkdirSync(WORKDIR, { recursive: true });

    const envBase = { ...process.env, NODE_ENV: 'test' };
    const nodeEnv = {
      ...envBase,
      BULEN_HTTP_PORT: '5210',
      BULEN_P2P_PORT: '5211',
      BULEN_DATA_DIR: path.join(WORKDIR, 'node'),
      BULEN_NODE_ID: 'fullstack-node',
      BULEN_ENABLE_FAUCET: 'true',
      BULEN_BLOCK_INTERVAL_MS: '800',
      BULEN_LOG_FORMAT: 'tiny',
      BULEN_ALLOW_UNSIGNED_BLOCKS: 'true',
      BULEN_STATUS_TOKEN: STATUS_TOKEN,
      BULEN_METRICS_TOKEN: METRICS_TOKEN,
      BULEN_P2P_TOKEN: P2P_TOKEN,
    };
    const explorerEnv = {
      ...envBase,
      EXPLORER_PORT: '5220',
      BULENNODE_API_BASE: 'http://127.0.0.1:5210/api',
      EXPLORER_TITLE: 'Fullstack Test Explorer',
      EXPLORER_LOG_FORMAT: 'tiny',
      EXPLORER_STATUS_TOKEN: STATUS_TOKEN,
    };
    const statusEnv = {
      ...envBase,
      STATUS_PORT: '5230',
      STATUS_NODES: 'http://127.0.0.1:5210/api/status',
      STATUS_TOKEN,
    };

    const nodeProc = startProcess('bulennode', path.join(ROOT, 'bulennode'), ['src/index.js'], nodeEnv);
    t.after(() => nodeProc.stop());

    await waitFor(
      async () => {
        const result = await fetchJson('http://127.0.0.1:5210/api/status', {
          headers: { 'x-bulen-status-token': STATUS_TOKEN },
        });
        return result.body && result.body.height === 0 ? result : result;
      },
      { label: 'bulennode status endpoint' },
    );

    // Seed balances and a transaction to force block production.
    const headers = { 'Content-Type': 'application/json' };
    const faucet = await fetchJson('http://127.0.0.1:5210/api/faucet', {
      method: 'POST',
      headers,
      body: JSON.stringify({ address: 'alice-fullstack', amount: 5000 }),
    });
    assert.strictEqual(faucet.status, 200);

    const txResponse = await fetchJson('http://127.0.0.1:5210/api/transactions', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        from: 'alice-fullstack',
        to: 'bob-fullstack',
        amount: 120,
        fee: 1,
        nonce: 1,
      }),
    });
    assert.strictEqual(txResponse.status, 202);

    // Wait for at least one produced block containing the transaction.
    const blockPage = await waitFor(
      async () => {
        const result = await fetchJson('http://127.0.0.1:5210/api/blocks?limit=5&offset=0');
        if (result.body && result.body.blocks && result.body.blocks.length > 0) {
          const foundTx = result.body.blocks.some((block) =>
            (block.transactions || []).some((tx) => tx.from === 'alice-fullstack'),
          );
          if (foundTx) {
            return result;
          }
        }
        return null;
      },
      { label: 'block with test transaction', timeoutMs: 20000 },
    );
    assert.ok(blockPage.body.blocks.length >= 1);

    const explorerProc = startProcess(
      'explorer',
      path.join(ROOT, 'explorer'),
      ['src/server.js'],
      explorerEnv,
    );
    t.after(() => explorerProc.stop());

    const statusProc = startProcess('status', path.join(ROOT, 'status'), ['src/server.js'], statusEnv);
    t.after(() => statusProc.stop());

    const explorerReady = await waitFor(
      async () => {
        const response = await fetch('http://127.0.0.1:5220/');
        if (response.status === 200) {
          const html = await response.text();
          return html.includes('BulenCoin Explorer') ? html : null;
        }
        return null;
      },
      { label: 'explorer homepage' },
    );
    assert.ok(explorerReady.includes('Latest blocks'));

    const statusResult = await waitFor(
      async () => {
        const result = await fetchJson('http://127.0.0.1:5230/status');
        return result.body && result.body.nodes && result.body.nodes.length > 0 ? result : null;
      },
      { label: 'status aggregation', timeoutMs: 15000 },
    );
    assert.strictEqual(statusResult.status, 200);
    assert.ok(statusResult.body.aggregate);

    const accountBob = await fetchJson('http://127.0.0.1:5210/api/accounts/bob-fullstack');
    assert.ok(accountBob.body.balance >= 120);
  },
);
