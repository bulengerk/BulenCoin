# BulenCoin

Lightweight, multi‑platform crypto network designed to run on everyday hardware (phones, laptops, servers, Raspberry Pi). Built to be accessible, energy‑aware and community‑operated — no mining rigs, no paywalls. This repo ships the prototype node, explorer, status service, rewards hub, SDKs, docs and the public website.

**New:** Age + loyalty multipliers for long‑running nodes (caps, decay) and a production quickstart/runbook are included below.

## What’s inside

- `bulennode/` – prototype node (HTTP API, PoS‑style block production, simple P2P over HTTP).
- `explorer/` – minimal web explorer that reads from a BulenNode.
- `status/` – lightweight status aggregator/HTML summary.
- `rewards-hub/` – telemetry leaderboard + badges with HMAC-protected reports (opt‑in, privacy‑minded).
- `sdk/`, `sdk-rs/` – JS/TS and Rust SDKs for payments/status/payment links.
- `docs/` – spec, deployment/security guides, testing strategy, prod manifests.
- `index.html`, `styles.css`, `script.js` – static multilingual landing page.
- `bulennode-rs/` – early Rust rewrite of the node (API + block production + metrics).
- Payments/micropayments recipes: `docs/payment_integration.md` (link/QR, invoices, webhook HMAC, paywall/tips/donations).

## Highlights (prototype products)

- **BulenNode (JS)**: lightweight PoS-like node with HTTP API, faucet (dev), simple P2P gossip, payments/invoice flow, reward projection, Prometheus metrics. Profiles for laptop/server/gateway/Raspberry Pi/mobile-light/superlight.
- **Explorer**: minimal web UI consuming a BulenNode (`/blocks`, `/accounts/:address`, mempool, rewards leaderboard from rewards-hub).
- **Status service**: aggregates multiple node `/api/status` endpoints into JSON + HTML table (by device class, reward weight, uptime).
- **Rewards hub**: opt-in telemetry + badges with HMAC and token; supports referrals/allowlist, leaderboard, signed share payloads.
- **SDKs**: JS/TS (`sdk/`) and Rust (`sdk-rs/`) helpers for payments, payment links/QR, status polling.

## Quick start (pick your path)

**One-command installers (recommended):**
- Linux desktop/server: `./scripts/install_desktop_node.sh` or `./scripts/install_server_node.sh`
- Raspberry Pi / ARM: `./scripts/install_raspberry_node.sh`
- macOS: `./scripts/install_macos_node.sh desktop-full`
- Windows: `powershell -ExecutionPolicy Bypass -File scripts/install_windows_node.ps1 -Profile desktop-full`

**Source:**  
```bash
cd bulennode
npm install
npm start
```

**Docker (local dev):**  
```bash
cd bulennode && docker compose -f docker-compose.local.yml up --build
```

## Run the full stack in 5 minutes (dev)

```bash
# Prereqs: Node 18+, npm, Docker/compose installed
git clone https://example.com/bulencoin.git
cd bulencoin
(cd bulennode && npm install)
(cd explorer && npm install)
(cd status && npm install)
(cd rewards-hub && npm install)

# Start node + explorer + status + rewards-hub locally
docker-compose up --build
# Then open: http://localhost:4100/api/status, http://localhost:4200, http://localhost:4300/status, http://localhost:4400/leaderboard
```

## Production starter (single host, TLS at proxy)

If you just need a working production-ish setup fast, follow the 10-step runbook in `docs/deployment_guide_en.md` section “Production quickstart” (cliff notes):

1) Ubuntu 22.04 VM, Node 18+, Docker/compose, nginx+certbot.  
2) Clone repo; `npm install` in `bulennode/`, `explorer/`, `status/`, `rewards-hub/`.  
3) Create `.env.prod` (tokens, faucet off, ports, protocol version).  
4) Terminate TLS + HSTS + rate limit in nginx, proxy to 5410/5420/5430/4400.  
5) `BULEN_HTTP_PORT=5410 EXPLORER_PORT=5420 STATUS_PORT=5430 docker-compose up -d`.  
6) Smoke: `/api/status` (with token), explorer, status JSON/HTML, rewards leaderboard.  
7) Prometheus scrape `/metrics` (token), cron backup `data/` to S3, upgrade with `git pull && docker-compose up -d --build`.

## Node profiles (reward weights)

- `desktop-full` (0.8) – laptop/desktop validator  
- `server-full` (1.0) – server validator  
- `gateway` (0.9) – observer/API role (no faucet)  
- `raspberry` (0.75) – Pi/ARM SBC  
- `mobile-light` / `tablet-light` (0.5 / 0.6) – light nodes  
- `phone-superlight` (0.35) – observer with aggressive pruning

Set via `BULEN_NODE_PROFILE`. Profiles pick ports, faucet default and reward weight; override with env vars.

## Minimums & security defaults

- Node.js 18+, Debian/Ubuntu 22.04+; for servers/gateways: 2 vCPU / 4 GB RAM / 40 GB SSD (4 vCPU / 8 GB recommended). Pi: Pi 4 (4 GB) + microSD/SSD.
- Public hosts: `BULEN_REQUIRE_SIGNATURES=true`, `BULEN_ENABLE_FAUCET=false`, `BULEN_P2P_TOKEN`, `BULEN_STATUS_TOKEN`, `BULEN_METRICS_TOKEN`, rate limits tuned.
- Telemetry/reporting HMAC: `BULEN_REWARDS_HMAC_SECRET` (node) / `REWARDS_HMAC_SECRET` (hub).
- Non‑custodial by design: keep keys/seed local, prefer TLS and tokens, and treat everything here as experimental/educational rather than a promise of profit.

## Rewards: age + loyalty multipliers (prototype)

- Age: +2% per month online, capped at 1.5x, 2-day grace, then ‑3% per offline day (floor 0.5x).  
- Loyalty: commit 10–50% stake, matures over 18 months, capped at +50%, resets on withdrawal/slash.  
- Calculator in the landing page (Reward projection) and formulas in `community_logic.js` + `docs/rewards_policy.md`.

## Tests

- BulenNode unit/integration: `cd bulennode && node --test`
- Explorer: `cd explorer && node --test`
- Status: `cd status && node --test`
- Rewards hub: `cd rewards-hub && node --test`
- Full-stack suites (node + explorer + status + payments/security/load): `node --test scripts/tests/*.test.js`
- Installer smoke (Linux-only, needs Docker access): `./scripts/test_installers_in_docker.sh`

Known issues (as of this commit): two full-stack subtests are flaky/time out (`full_stack_smoke.test.js` waiting for block with tx; `payment_webhook_signature.test.js` waiting for signed webhook). Others pass.

## Docs

- Spec (PL): `docs/bulencoin_spec_pl.md`
- Deployment guides: `docs/deployment_guide.md` (PL), `docs/deployment_guide_en.md` (EN)
- Security hardening (PL): `docs/security_hardening_pl.md`
- Prod manifests/topology: `docs/prod_manifests.md`
- Testing strategy: `docs/testing_strategy.md`
- Quickstart: `docs/onboarding_quickstart.md`
- Rewards parameters: `docs/rewards_policy.md`

## Website

Static landing with translations (EN/ES/PL). Serve locally:
```bash
python3 -m http.server 8080
# open http://localhost:8080
```
