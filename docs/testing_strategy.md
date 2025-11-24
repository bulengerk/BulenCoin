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

3. **Security guardrails (new):** ensures HTTP guardrails are enforced when security flags
   are on:
   - signatures are required (unsigned tx rejected, signed tx accepted),
   - P2P token is enforced on gossip endpoints,
   - rate limiter returns 429 on bursts.

4. **Docker-based check:** `docker-compose up --build` for a containerised stack; useful
   for verifying build contexts and environment variables.

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
