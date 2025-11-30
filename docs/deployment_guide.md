---
title: BulenCoin – deployment guide (English)
language: en
---

# 1. What this guide covers

- Deploying the static BulenCoin website.
- Deploying the prototype BulenNode + explorer + status service (local, Docker, server/cloud).
- Operational guidance for testnet → mainnet bootstrap.

It is not an exhaustive developer reference; it focuses on ops, configuration, and safety.

# 2. Website deployment

Repo ships a static multilingual site:

- `index.html` – structure (EN/ES/PL translations handled in JS),
- `styles.css` – visuals,
- `script.js` – language switching and translation injection.

## 2.1 Run locally

- Any browser works; optional simple HTTP server.
- Example:

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

## 2.2 Host on a server or cloud

Any static hosting (GitHub Pages, Netlify, Vercel, S3+CloudFront) works. For a simple
server with nginx:

```bash
sudo apt-get update && sudo apt-get install -y nginx
sudo cp index.html styles.css script.js /var/www/html/
```

Reload nginx and point DNS to the host. For GitHub Pages: Settings → Pages → branch `main`
and root `/`.

# 3. Prototype services (Node.js)

Repo includes BulenNode (HTTP API + simple P2P), explorer, and status service. They run
locally or in Docker.

## 3.1 Local dev

```bash
cd bulennode && npm install && npm start  # API on http://localhost:4100
cd explorer && npm install && npm start   # explorer on http://localhost:4200
cd status && npm install && npm start     # status on http://localhost:4300
```

BulenNode stores state in `data/<profile>/state.json` and produces blocks when txs enter
the mempool.

## 3.2 Docker (local)

```bash
cd bulennode
docker compose -f docker-compose.local.yml up --build
```

Explorer and status can be containerised similarly; adjust API URLs via env vars.

## 3.3 Key configuration (BulenNode)

- `BULEN_NODE_PROFILE` – predefined profiles: `desktop-full`, `server-full`, `gateway`,
  `raspberry`, `mobile-light`, `tablet-light`, `phone-superlight`.
- `BULEN_REQUIRE_SIGNATURES` – enforce signed tx (true in production).
- `BULEN_ENABLE_FAUCET` – faucet for dev/test (disable in prod).
- `BULEN_P2P_TOKEN` – shared secret for P2P `/p2p/tx` and `/p2p/block`.
- `BULEN_STATUS_TOKEN`, `BULEN_METRICS_TOKEN` – protect `/api/status` and `/metrics`.
- `BULEN_MAX_BODY_SIZE` – JSON body limit (default 128kb).
- `BULEN_RATE_LIMIT_WINDOW_MS` / `BULEN_RATE_LIMIT_MAX` – per-IP limiter.
- `BULEN_REWARDS_HMAC_SECRET` – signs telemetry to rewards-hub if used.
- `BULEN_WEBHOOK_SECRET` – signs payment webhooks (HMAC header `x-bulen-signature`).
- `BULEN_SUPERLIGHT_MODE` and `BULEN_SUPERLIGHT_BATTERY_THRESHOLD` – aggressive pruning
  and sleep on low battery (phone-superlight profile).

Explorer defaults to `http://localhost:4100/api`; override with env `API_BASE`. Status
aggregator expects a list of node URLs in `NODES` env.

## 3.4 Security posture

For public/gateway nodes set:

- `BULEN_REQUIRE_SIGNATURES=true`, `BULEN_ENABLE_FAUCET=false`.
- P2P/Status/Metrics tokens required.
- TLS via reverse proxy (nginx/Caddy) and firewall/WAF.
- Tighten rate limits compared to defaults.

## 3.5 Profiles (reward weights)

- `desktop-full` (0.8), `server-full` (1.0), `gateway` (0.9), `raspberry` (0.75),
  `mobile-light` (0.5), `tablet-light` (0.6), `phone-superlight` (0.35). Profiles tune
  ports, faucet defaults, reward weight, and timing.

# 4. Installation scripts and systemd

One-command installers in `scripts/`:

- `install_desktop_node.sh`, `install_server_node.sh`, `install_raspberry_node.sh`,
  `install_gateway_node.sh`, `install_macos_node.sh`, `install_windows_node.ps1`.

They install Node.js, pull the repo, configure ports/profile, and set up systemd units.
Review scripts before running in production.

Systemd template (conceptual):

```
[Service]
User=bulen
WorkingDirectory=/opt/bulencoin/bulennode
Environment=BULEN_NODE_PROFILE=server-full
ExecStart=/usr/bin/node src/index.js
Restart=always
``` 

Gateway quick start (API observer, bez faucet):

- Skopiuj env: `cp bulennode/.env.gateway.example bulennode/.env.gateway` i uzupełnij tokeny/porty/CORS.
- Skopiuj usługę: `sudo cp scripts/systemd/bulennode-gateway.service /etc/systemd/system/` (dostosuj ścieżki jeśli instalujesz poza `/opt/bulencoin`).
- Kopiuj kod: `sudo rsync -av bulennode/ /opt/bulencoin/bulennode/ && sudo systemctl daemon-reload && sudo systemctl enable --now bulennode-gateway`.
- Wystaw przez nginx/caddy z TLS + rate limit; do status/metrics dodaj nagłówki tokenów (`x-bulen-status-token`, `x-bulen-metrics-token`); faucet off.

# 5. Observability and metrics

- Prometheus metrics at `/metrics` (protected by token): chain height, mempool, reward
  counters, slashing, fee burn, protocol rewards, request rates.
- Grafana dashboard provided in `docs/grafana-dashboard.json`.
- Alerts: node down, low peers, rising 5xx/429, chain height lag, failed blocks, high
  mempool size.

# 6. Testing

- BulenNode: `cd bulennode && node --test`
- Explorer: `cd explorer && node --test`
- Status: `cd status && node --test`
- Rewards hub: `cd rewards-hub && node --test`
- Full-stack: `node --test scripts/tests/*.test.js` (smoke, integration, load, webhook HMAC,
  super-light).
- Installers (Linux-only, Docker needed): `./scripts/test_installers_in_docker.sh`
- Rust SDK: `cd sdk-rs && cargo test`
- JS SDK: `cd sdk && npm test`

# 7. Testnet → mainnet bootstrap (ops checklist)

1. **Testnet:** faucet on, profiles relaxed, public explorer/status, telemetry optional but
   anonymised.
2. **Hardening for public endpoints:** signatures on, faucet off, tokens for P2P/status/
   metrics, stricter rate limits, TLS/WAF, non-root users, log rotation.
3. **Backups:** state snapshots for validators, config backup, secrets in KMS/HSM if
   available.
4. **Monitoring:** Prometheus scrape of validators/sentries/gateway; dashboards for
   height/peers/rewards/429/5xx; alerting on liveness and divergence.
5. **Recovery drills:** restore state from snapshot, rotate tokens/keys, failover of gateway
   and sentry.
6. **Upgrades:** announce protocol changes early; require matching major version in P2P
   headers; enforce tokens.

# 8. Quick commands (cheatsheet)

- Start dev node: `NODE_ENV=development BULEN_NODE_PROFILE=desktop-full node src/index.js`
- Start gateway profile: `NODE_ENV=production BULEN_NODE_PROFILE=gateway BULEN_REQUIRE_SIGNATURES=true BULEN_ENABLE_FAUCET=false BULEN_P2P_TOKEN=... node src/index.js`
- Docker local: `docker compose -f docker-compose.local.yml up --build`
- Run explorer against custom API: `API_BASE=http://node:4100/api npm start`
- Run status against multiple nodes: `NODES="http://n1:4100/api,http://n2:4100/api" npm start`

# 9. Helpful references

- `docs/payment_integration.md` – API flows (payments, wallet auth, guardrails).
- `docs/security_hardening_pl.md` – hardening checklist (English).
- `docs/operator_runbook.md` – ops playbook for validators/gateways.
- `docs/prod_manifests.md` – production topology sketch.
