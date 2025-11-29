# Testing strategy

This document describes the current test levels for BulenCoin services.

## Levels

1. **Service-level tests** (existing):
   - `bulennode`: `cd bulennode && npm install && node --test`
   - `status`: `cd status && npm install && node --test`
   - Explorer currently relies on manual verification; add `node --test` when routes grow.

2. **Full-stack smoke:** spins up BulenNode, Explorer and Status together with
   dedicated ports and data directories, seeds test accounts, produces a block and checks
   that all three HTTP endpoints respond with real data.

3. **Full-stack (all components):** adds payments + wallet session flow on top of node +
   explorer + status. Creates an invoice, pays it, verifies explorer HTML, status
   aggregation and wallet challenge/verify with a real signature.

4. **Security guardrails:** ensures HTTP guardrails are enforced when security flags
   are on:
   - signatures are required (unsigned tx rejected, signed tx accepted),
   - P2P token is enforced on gossip endpoints,
   - rate limiter returns 429 on bursts.

5. **Docker-based check:** `docker-compose up --build` for a containerised stack; useful
   for verifying build contexts and environment variables.

6. **Soak/perf (to add):** long-running node(s) with metrics scraping (CPU/RAM/disk, mempool size, height drift, 5xx), packet loss/latency scenarios, and adversarial P2P peers (drop/delay/double-sign).

7. **Upgrade/backward-compat (to add):** rolling restart of mixed versions with protocol-version warnings, data-dir migration tests, snapshot verification signatures.

8. **UI/UX (to add):** automated browser tests for landing/Explorer basic flows; visual/snapshot checks for regressions.

## Running the full-stack smoke test

Prerequisites:

- Node.js 18+ (for `node --test` and built-in `fetch`),
- dependencies installed in `bulennode/`, `explorer/`, `status/` (run `npm install` in
  each once).

Command (from repository root):

```bash
node --test scripts/tests/full_stack_smoke.test.js
```

What it does:

- starts BulenNode on ports 5210/5211 with a clean data directory under `data/fullstack-smoke`,
- seeds a faucet account, submits a transaction and waits for a block including it,
- launches Explorer (5220) and Status service (5230) against the same node,
- asserts that Explorer renders HTML, Status aggregates at least one node, and the target
  account balance reflects the transaction.

Processes are stopped automatically after the test finishes.

## Running the full-stack (all components) test

```bash
node --test scripts/tests/full_stack_integration_all.test.js
```

What it does:

- launches BulenNode, Explorer and Status on isolated ports,
- creates and pays a payment invoice (with memo),
- verifies explorer homepage and status aggregation,
- performs wallet challenge/verify using a real signature and checks session retrieval.

## Running the node drop resilience test

```bash
node --test scripts/tests/node_drop_resilience.test.js
```

What it does:

- starts three BulenNodes on isolated ports with fast block intervals,
- seeds a transaction, then starts the Status service pointed at all three nodes,
- abruptly stops two nodes and asserts the Status service gracefully reports the single survivor,
- submits another transaction post-drop to ensure the surviving node continues to produce blocks (height keeps advancing).

Result (last local run): passes; surviving node produced a new block after the drop and the status aggregator returned `nodeCount=1` without errors.

## Running the finality/committee resilience test (3-node)

```bash
node --test scripts/tests/finality_drop_resilience.test.js
```

What it does:

- starts 3 validators with committee size 3, unsigned blocks disallowed, signatures on,
- seeds a transaction, waits for height/finality to advance, then kills 2 validators,
- submits another transaction and checks the surviving validator keeps producing blocks and does not regress finalized height.

Result (last local run): passes; surviving node advanced height after the drop (warnings about P2P broadcast failures are expected in the single-host test net).

## Running the security guardrails test

Command (from repository root):

```bash
node --test scripts/tests/security_guardrails.test.js
```

What it does:

- starts BulenNode on ports 5310/5311 with signatures, faucet and P2P token enabled,
- funds a test account and verifies unsigned tx are rejected while signed tx are accepted,
- checks P2P gossip endpoint requires the shared token,
- sends a burst of requests to confirm the rate limiter returns HTTP 429.

## Running the 30s node load test

```bash
node --test scripts/tests/node_load_30s.test.js
```

What it does:

- starts BulenNode on dedicated ports,
- for 30 seconds polls health/status and periodically sends faucet + transaction requests,
- ensures no errors occur and a minimum number of cycles/transactions complete.

## Protocol compatibility (major version)

Command:

```bash
node --test scripts/tests/protocol_version_compat.test.js
```

What it does:

- starts a node with `protocolVersion=1.2.0` and P2P token set,
- sends P2P gossip with protocol header `1.4.3` (accepted), missing header (accepted for backward-compat), and `2.0.0` (rejected with 400).

Result (last local run): passes.

## Running the churn/chaos soak (local)

Script: `scripts/soak/soak_churn.sh` (bare metal, no Docker). Example (4 validators, 50s):

```bash
NODES=4 DURATION_SEC=50 CHURN_INTERVAL_SEC=10 RESTART_DELAY_SEC=3 BASE_HTTP_PORT=7610 COMMITTEE_SIZE=3 scripts/soak/soak_churn.sh
```

What it does:

- generates deterministic validator keys + genesis, starts validators on sequential ports,
- enforces signatures + strict preset with tokens/webhook secret,
- every `CHURN_INTERVAL_SEC` kills/restarts a subset of nodes (keeps at least one alive),
- writes a status summary to `scripts/soak/reports/`.

Last local run (Nov 29 2025): 4 iterations completed; height advanced to 4 while nodes were churned, two nodes were restarting during the summary (ECONNREFUSED). Details: `docs/test_reports/soak_churn_local.md`.

## Running the HTTP load benchmark

Script: `scripts/load/tx_benchmark.js`. Target an existing node; default uses `/api/transactions` with faucet funding (if enabled).

Example (single dev node on 7710):

```bash
node scripts/load/tx_benchmark.js --base http://127.0.0.1:7710/api --duration 30 --rate 12 --concurrency 6 --memoPrefix churn --report scripts/soak/reports/tx_benchmark_20251129.json
```

Outputs success/failure counts, latency summary, and optional JSON report. Last local run hit HTTP 429 rate limits at ~12 tps (172 ok / 359 total); latency p50 1.97 ms, p90 3.56 ms. See `docs/test_reports/soak_churn_local.md` for details.
