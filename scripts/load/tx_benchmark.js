#!/usr/bin/env node
// Lightweight HTTP load generator for BulenNode. Sends transactions at a target rate,
// measures latency and success ratio, and optionally writes a JSON report.

const fs = require('node:fs');
const path = require('node:path');
const { performance } = require('node:perf_hooks');

function parseArgs(raw) {
  const args = {};
  for (let i = 0; i < raw.length; i += 1) {
    const arg = raw[i];
    if (arg.startsWith('--') && arg.includes('=')) {
      const [k, v] = arg.slice(2).split('=');
      args[k] = v;
    } else if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = raw[i + 1];
      if (next && !next.startsWith('--')) {
        args[key] = next;
        i += 1;
      } else {
        args[key] = true;
      }
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));

const apiBase = args.base || process.env.BULEN_API_BASE || 'http://127.0.0.1:6810/api';
const durationSec = Number(args.duration ?? process.env.DURATION_SEC ?? 60);
const targetTps = Number(args.rate ?? process.env.TPS ?? 5);
const concurrency = Number(args.concurrency ?? process.env.CONCURRENCY ?? 4);
const statusToken = args.statusToken || process.env.BULEN_STATUS_TOKEN || '';
const faucetAmount = Number(args.faucetAmount ?? process.env.FAUCET_AMOUNT ?? 10000);
const reportPath = args.report || process.env.REPORT_PATH || '';
const memoPrefix = args.memoPrefix || 'bench';
const faucetEnabled = args.faucet !== 'false';

const headersBase = statusToken ? { 'x-bulen-status-token': statusToken } : {};
const accounts = Array.from({ length: Math.max(concurrency + 1, 4) }, (_, i) => `${memoPrefix}-acct-${i}`);

const stats = {
  start: new Date().toISOString(),
  apiBase,
  durationSec,
  targetTps,
  concurrency,
  sent: 0,
  failed: 0,
  latencies: [],
  errors: [],
};

function latencySummary(values) {
  const arr = values.slice().sort((a, b) => a - b);
  if (!arr.length) return null;
  const pct = (p) => arr[Math.min(arr.length - 1, Math.floor((p / 100) * arr.length))];
  const sum = arr.reduce((a, b) => a + b, 0);
  return {
    count: arr.length,
    min: arr[0],
    p50: pct(50),
    p90: pct(90),
    p99: pct(99),
    max: arr[arr.length - 1],
    avg: Number((sum / arr.length).toFixed(2)),
  };
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

async function fundAccounts() {
  if (!faucetEnabled) return;
  const tasks = accounts.map(async (acct) => {
    try {
      await fetchWithTimeout(`${apiBase}/faucet`, {
        method: 'POST',
        headers: { ...headersBase, 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: acct, amount: faucetAmount }),
      });
    } catch (err) {
      stats.errors.push(`faucet ${acct}: ${err.message}`);
    }
  });
  await Promise.all(tasks);
}

async function sendTx(seq) {
  const from = accounts[seq % accounts.length];
  const to = accounts[(seq + 1) % accounts.length];
  const body = JSON.stringify({
    from,
    to,
    amount: 1 + (seq % 5),
    fee: 0,
    memo: `${memoPrefix}-${seq}`,
  });
  const start = performance.now();
  try {
    const res = await fetchWithTimeout(`${apiBase}/transactions`, {
      method: 'POST',
      headers: { ...headersBase, 'Content-Type': 'application/json' },
      body,
    });
    const ok = res.ok || res.status === 202;
    const latency = Number((performance.now() - start).toFixed(2));
    stats.latencies.push(latency);
    if (ok) stats.sent += 1;
    else {
      stats.failed += 1;
      stats.errors.push(`status ${res.status}`);
    }
  } catch (err) {
    stats.failed += 1;
    stats.errors.push(err.message);
  }
}

async function run() {
  await fundAccounts();
  const intervalMs = Math.max(10, 1000 / Math.max(targetTps, 0.1));
  let inFlight = 0;
  let seq = 0;
  let stop = false;

  const tick = () => {
    if (stop) return;
    if (inFlight >= concurrency) return;
    inFlight += 1;
    sendTx(seq)
      .catch((err) => stats.errors.push(err.message))
      .finally(() => {
        inFlight -= 1;
      });
    seq += 1;
  };

  const timer = setInterval(tick, intervalMs);
  await new Promise((r) => setTimeout(r, durationSec * 1000));
  stop = true;
  clearInterval(timer);
  while (inFlight > 0) {
    // wait for outstanding requests to finish
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, 50));
  }

  stats.end = new Date().toISOString();
  stats.latencySummary = latencySummary(stats.latencies);
  stats.totalRequests = stats.sent + stats.failed;
  if (reportPath) {
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(stats, null, 2));
  }

  console.log(
    [
      `Bench complete ${stats.sent}/${stats.totalRequests} ok (fail=${stats.failed})`,
      `latency ms: ${stats.latencySummary ? `p50 ${stats.latencySummary.p50}, p90 ${stats.latencySummary.p90}, max ${stats.latencySummary.max}` : 'n/a'}`,
      `api: ${apiBase}`,
      `duration: ${durationSec}s, target tps: ${targetTps}, concurrency: ${concurrency}`,
      reportPath ? `report: ${reportPath}` : '',
    ]
      .filter(Boolean)
      .join(' | '),
  );
}

run().catch((err) => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
