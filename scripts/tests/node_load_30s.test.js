/* eslint-disable no-console */
const test = require('node:test');
const assert = require('node:assert');
const { spawn } = require('node:child_process');
const { setTimeout: delay } = require('node:timers/promises');
const path = require('node:path');
const fs = require('node:fs');

const ROOT = path.resolve(__dirname, '..', '..');
const WORKDIR = path.join(ROOT, 'data', 'load-30s');

function startProcess(label, cwd, args, env) {
  const child = spawn('node', args, {
    cwd,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', (chunk) => console.log(`[${label}] ${chunk.toString().trim()}`));
  child.stderr.on('data', (chunk) => console.error(`[${label}][err] ${chunk.toString().trim()}`));
  const stop = () => {
    if (!child.killed) child.kill();
  };
  return { child, stop };
}

async function fetchJson(url, options) {
  const resp = await fetch(url, options);
  let body = null;
  try {
    body = await resp.json();
  } catch (error) {
    body = null;
  }
  return { status: resp.status, body };
}

test(
  '30s load: status + tx submission stay healthy',
  { timeout: 70000 },
  async (t) => {
    fs.rmSync(WORKDIR, { recursive: true, force: true });
    fs.mkdirSync(WORKDIR, { recursive: true });

    const env = {
      ...process.env,
      NODE_ENV: 'test',
      BULEN_HTTP_PORT: '5510',
      BULEN_P2P_PORT: '5511',
      BULEN_DATA_DIR: path.join(WORKDIR, 'node'),
      BULEN_NODE_ID: 'load-node',
      BULEN_ENABLE_FAUCET: 'true',
      BULEN_BLOCK_INTERVAL_MS: '400',
      BULEN_LOG_FORMAT: 'tiny',
      BULEN_ALLOW_UNSIGNED_BLOCKS: 'true',
    };
    const nodeProc = startProcess('bulennode', path.join(ROOT, 'bulennode'), ['src/index.js'], env);
    t.after(() => nodeProc.stop());
    t.after(() => fs.rmSync(WORKDIR, { recursive: true, force: true }));

    // wait for node
    let ready = false;
    for (let i = 0; i < 20; i += 1) {
      try {
        const r = await fetchJson('http://127.0.0.1:5510/api/health');
        if (r.status === 200) {
          ready = true;
          break;
        }
      } catch (error) {
        // ignore
      }
      await delay(300);
    }
    assert.ok(ready, 'node did not become ready for load test');

    const start = Date.now();
    let statusCount = 0;
    let txCount = 0;
    const errors = [];
    let faucetDone = false;

    while (Date.now() - start < 30000) {
      const health = await fetchJson('http://127.0.0.1:5510/api/health');
      if (health.status >= 500) errors.push(`health ${health.status}`);

      const status = await fetchJson('http://127.0.0.1:5510/api/status');
      if (status.status >= 500) errors.push(`status ${status.status}`);
      statusCount += 1;

      const now = Date.now();
      if (!faucetDone || now - start > 5000) {
        await fetchJson('http://127.0.0.1:5510/api/faucet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: 'load-user', amount: 10 }),
        });
        faucetDone = true;
        const txResp = await fetchJson('http://127.0.0.1:5510/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'load-user',
            to: 'sink',
            amount: 1,
            fee: 0,
          }),
        });
        if (txResp.status < 500) {
          txCount += 1;
        } else {
          errors.push(`tx ${txResp.status}`);
        }
      }
      await delay(600);
    }

    assert.ok(statusCount >= 30, 'Expected at least 30 status/health cycles');
    assert.ok(txCount >= 5, 'Expected at least 5 transaction submissions');
    assert.strictEqual(errors.length, 0, `Errors during load: ${errors.join('; ')}`);
  },
);
