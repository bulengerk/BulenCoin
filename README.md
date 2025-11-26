# BulenCoin

Lightweight, multi‑platform crypto network designed to run on everyday hardware (phones, laptops, servers, Raspberry Pi). Built to be accessible, energy‑aware and community‑operated — no mining rigs, no paywalls. This repo ships the prototype node, explorer, status service, rewards hub, SDKs, docs and the public website.

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

## Current prototype products

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

## Tests

- BulenNode unit/integration: `cd bulennode && node --test`
- Explorer: `cd explorer && node --test`
- Status: `cd status && node --test`
- Rewards hub: `cd rewards-hub && node --test`
- Full-stack suites (node + explorer + status + payments/security/load): `node --test scripts/tests/*.test.js`
- Installer smoke (Linux-only, needs Docker access): `./scripts/test_installers_in_docker.sh`

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
