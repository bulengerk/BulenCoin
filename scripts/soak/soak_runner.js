#!/usr/bin/env node
// Simple long-running soak test for BulenNode. Starts a local node, sends transactions,
// health/status calls, and writes a JSON/Markdown report at the end.

const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

// ---- Config -----------------------------------------------------------------
const args = new Map(
  process.argv.slice(2).flatMap((arg) => {
    const [k, v] = arg.split('=');
    return [[k.replace(/^--/, ''), v ?? '']];
  }),
);

const ROOT = path.resolve(__dirname, '..', '..');
const REPORT_DIR = path.join(__dirname, 'reports');
const durationSec = Number(args.get('duration') || 7200); // default 2h
const txPerSecond = Number(args.get('txRate') || 1); // transactions per second
const healthIntervalMs = Number(args.get('healthIntervalMs') || 5000);
const httpPort = args.get('httpPort') || '5510';
const p2pPort = args.get('p2pPort') || '5511';
const apiBase = args.get('apiBase') || `http://127.0.0.1:${httpPort}/api`;
const faucetAmount = Number(args.get('faucetAmount') || 500000);
const accounts = ['soak-alice', 'soak-bob'];
const statusToken = args.get('statusToken') || process.env.BULEN_STATUS_TOKEN || 'status-token';

// ---- Helpers ----------------------------------------------------------------
function nowMs() {
  return Date.now();
}

async function fetchWithTimeout(url, opts = {}, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...opts, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function waitForHealth(maxMs = 30000) {
  const start = nowMs();
  while (nowMs() - start < maxMs) {
    try {
      const res = await fetchWithTimeout(`${apiBase}/health`, {}, 3000);
      if (res.ok) return true;
    } catch (_err) {
      // swallow
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

// ---- Runner -----------------------------------------------------------------
async function main() {
  fs.mkdirSync(REPORT_DIR, { recursive: true });

  const env = {
    ...process.env,
    NODE_ENV: 'test',
    BULEN_HTTP_PORT: httpPort,
    BULEN_P2P_PORT: p2pPort,
    BULEN_DATA_DIR: path.join(ROOT, 'data', 'soak-node'),
    BULEN_ENABLE_FAUCET: 'true',
    BULEN_BLOCK_INTERVAL_MS: '800',
    BULEN_STATUS_TOKEN: statusToken,
    BULEN_METRICS_TOKEN: process.env.BULEN_METRICS_TOKEN || 'metrics-token',
    BULEN_P2P_TOKEN: process.env.BULEN_P2P_TOKEN || 'p2p-token',
  };

  const node = spawn('node', ['src/index.js'], {
    cwd: path.join(ROOT, 'bulennode'),
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  node.stdout.on('data', (buf) => process.stdout.write(`[node] ${buf}`));
  node.stderr.on('data', (buf) => process.stderr.write(`[node][err] ${buf}`));

  const stats = {
    start: new Date().toISOString(),
    durationSec,
    txPerSecond,
    apiBase,
    requests: [],
    health: [],
    errors: [],
  };

  const healthy = await waitForHealth();
  if (!healthy) {
    throw new Error('Node failed health check start-up');
  }

  // Fund accounts
  for (const acct of accounts) {
    try {
      await fetchWithTimeout(`${apiBase}/faucet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: acct, amount: faucetAmount }),
      });
    } catch (err) {
      stats.errors.push(`faucet ${acct}: ${err.message}`);
    }
  }

  let sent = 0;
  let failed = 0;
  let stop = false;

  const txIntervalMs = Math.max(50, 1000 / Math.max(txPerSecond, 0.1));
  const txTimer = setInterval(async () => {
    if (stop) return;
    const from = accounts[sent % accounts.length];
    const to = accounts[(sent + 1) % accounts.length];
    const payload = {
      from,
      to,
      amount: 1 + (sent % 5),
      fee: 0,
      memo: `soak-${sent}`,
    };
    const start = nowMs();
    try {
      const res = await fetchWithTimeout(`${apiBase}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const ok = res.ok || res.status === 202 || res.status === 200;
      stats.requests.push({
        type: 'tx',
        status: res.status,
        ok,
        latencyMs: nowMs() - start,
      });
      if (ok) sent += 1;
      else failed += 1;
    } catch (err) {
      failed += 1;
      stats.errors.push(`tx err: ${err.message}`);
    }
  }, txIntervalMs);

  const healthTimer = setInterval(async () => {
    if (stop) return;
    try {
      const t0 = nowMs();
      const res = await fetchWithTimeout(`${apiBase}/status`, {
        headers: statusToken ? { 'x-bulen-status-token': statusToken } : {},
      }, 4000);
      const json = res.ok ? await res.json() : null;
      stats.health.push({
        ts: new Date().toISOString(),
        ok: res.ok,
        status: res.status,
        latencyMs: nowMs() - t0,
        height: json?.height,
        peers: json?.peers?.length,
        mempool: json?.mempoolSize,
      });
    } catch (err) {
      stats.health.push({
        ts: new Date().toISOString(),
        ok: false,
        error: err.message,
      });
    }
  }, healthIntervalMs);

  await new Promise((r) => setTimeout(r, durationSec * 1000));
  stop = true;
  clearInterval(txTimer);
  clearInterval(healthTimer);

  node.kill();

  stats.end = new Date().toISOString();
  stats.summary = {
    sent,
    failed,
    totalRequests: stats.requests.length,
    txLatencyMs: summarizeLatency(stats.requests.map((r) => r.latencyMs)),
    healthLatencyMs: summarizeLatency(stats.health.filter((h) => h.ok).map((h) => h.latencyMs)),
  };

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const jsonPath = path.join(REPORT_DIR, `soak_report_${stamp}.json`);
  const mdPath = path.join(REPORT_DIR, `soak_report_${stamp}.md`);
  fs.writeFileSync(jsonPath, JSON.stringify(stats, null, 2));
  fs.writeFileSync(mdPath, renderMarkdown(stats));
  console.log(`Soak complete. Reports:\n- ${jsonPath}\n- ${mdPath}`);
}

function summarizeLatency(arr) {
  const vals = arr.filter((v) => typeof v === 'number').sort((a, b) => a - b);
  if (!vals.length) return null;
  const pct = (p) => vals[Math.min(vals.length - 1, Math.floor((p / 100) * vals.length))];
  const sum = vals.reduce((a, b) => a + b, 0);
  return {
    count: vals.length,
    min: vals[0],
    p50: pct(50),
    p90: pct(90),
    p99: pct(99),
    max: vals[vals.length - 1],
    avg: Number((sum / vals.length).toFixed(2)),
  };
}

function renderMarkdown(stats) {
  const { summary } = stats;
  return [
    '# BulenCoin soak test report',
    '',
    `- Start: ${stats.start}`,
    `- End: ${stats.end}`,
    `- Duration (s): ${stats.durationSec}`,
    `- API: ${stats.apiBase}`,
    `- tx/s target: ${stats.txPerSecond}`,
    '',
    '## Summary',
    `- Sent OK: ${summary.sent}`,
    `- Failed: ${summary.failed}`,
    `- Total requests: ${summary.totalRequests}`,
    `- TX latency (ms): ${latencyLine(summary.txLatencyMs)}`,
    `- Health latency (ms): ${latencyLine(summary.healthLatencyMs)}`,
    '',
    '## Errors (sample, first 10)',
    ...(stats.errors.slice(0, 10).map((e) => `- ${e}`)),
    '',
    '## Notes',
    '- Reports are also available in JSON for deeper analysis.',
  ].join('\n');
}

function latencyLine(obj) {
  if (!obj) return 'n/a';
  return `min ${obj.min} | p50 ${obj.p50} | p90 ${obj.p90} | p99 ${obj.p99} | max ${obj.max} | avg ${obj.avg}`;
}

main().catch((err) => {
  console.error('Soak test failed:', err);
  process.exit(1);
});
