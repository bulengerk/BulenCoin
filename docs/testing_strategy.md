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
