# BulenCoin multi-host deployment runbook (5-host and 10-host layouts)

Goal: reproducible deployment of all public components (validators, sentry/gateway, explorer, status, rewards-hub, static site, monitoring) on plain Ubuntu hosts (no Docker), so another operator or Codex instance can bring up the stack quickly.

## 0) Inputs and secrets (prepare once)
- Domain/DNS: `api.<domain>`, `api2.<domain>` (10-host), `explorer.<domain>`, `status.<domain>`, `rewards.<domain>`, `www.<domain>`, `mon.<domain>`.
- Secrets: `BULEN_P2P_TOKEN`, `BULEN_STATUS_TOKEN`, `BULEN_METRICS_TOKEN`, `BULEN_WEBHOOK_SECRET`, `REWARDS_HMAC_SECRET`, `REWARDS_TOKEN`, S3 creds for backups.
- Protocol/chain: `BULEN_PROTOCOL_VERSION`, `BULEN_CHAIN_ID`, `BULEN_REQUIRE_SIGNATURES=true`, `BULEN_ENABLE_FAUCET=false`.
- TLS: Let’s Encrypt or provided certs for all public hosts.

## 1) Host maps
### 5-host layout (minimal production)
- h1: validator-1 (private)
- h2: validator-2 (private)
- h3: sentry+gateway (public P2P+HTTP; proxies to validators)
- h4: explorer + status + rewards-hub + static site (public HTTP behind TLS)
- h5: monitoring + backups (Prometheus/Alertmanager/Grafana + S3 sync)

### 10-host layout (full)
- h1: validator-1 (private)
- h2: validator-2 (private)
- h3: validator-3 (private)
- h4: sentry-1 (public P2P+HTTP)
- h5: sentry-2 (public P2P+HTTP)
- h6: gateway-1 (public API, proxies to sentries/validators)
- h7: gateway-2 (public API, active/active)
- h8: explorer + status + rewards-hub
- h9: static site / downloads
- h10: monitoring + backups

## 2) Common base setup (run on every host)
```bash
apt-get update && apt-get install -y curl git ufw nginx logrotate unzip
# Node.js 18 LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs
# User and directories
useradd -m -s /bin/bash bulen || true
mkdir -p /opt/bulencoin && chown -R bulen:bulen /opt/bulencoin
```
- Firewall: default deny inbound; open only 80/443 and P2P/API ports for sentry/gateway. Validators should allow only private/VPN traffic.

## 3) Fetch code and install deps (on all app hosts)
```bash
su - bulen
cd /opt/bulencoin
git clone https://example.com/bulencoin.git repo   # replace remote as needed
cd repo
```
- Install per component (only where used):
```bash
cd /opt/bulencoin/repo/bulennode && npm install --omit=dev
cd /opt/bulencoin/repo/explorer && npm install --omit=dev
cd /opt/bulencoin/repo/status && npm install --omit=dev
cd /opt/bulencoin/repo/rewards-hub && npm install --omit=dev
```
- Static site: `index.html`, `styles.css`, `script.js` in repo root.

## 4) Environment files (root-owned, 640)
Create `/opt/bulencoin/env/` and populate as below.

### Validators (h1, h2, h3)
`/opt/bulencoin/env/bulennode-validator.env`:
```
BULEN_NODE_PROFILE=server-full
BULEN_SECURITY_PRESET=strict
BULEN_REQUIRE_SIGNATURES=true
BULEN_ENABLE_FAUCET=false
BULEN_PROTOCOL_VERSION=<version>
BULEN_CHAIN_ID=<chainId>
BULEN_P2P_TOKEN=<token>
BULEN_STATUS_TOKEN=<token>
BULEN_METRICS_TOKEN=<token>
BULEN_HTTP_PORT=4100
BULEN_P2P_PORT=4101
BULEN_PEERS=http://<sentry1-private>:4101,http://<sentry2-private>:4101
BULEN_DATA_DIR=/opt/bulencoin/data/validator
```

### Sentry (h3 in 5-host; h4/h5 in 10-host)
`/opt/bulencoin/env/bulennode-sentry.env`:
```
BULEN_NODE_PROFILE=gateway
BULEN_SECURITY_PRESET=strict
BULEN_REQUIRE_SIGNATURES=true
BULEN_ENABLE_FAUCET=false
BULEN_PROTOCOL_VERSION=<version>
BULEN_CHAIN_ID=<chainId>
BULEN_P2P_TOKEN=<token>
BULEN_STATUS_TOKEN=<token>
BULEN_METRICS_TOKEN=<token>
BULEN_HTTP_PORT=5410
BULEN_P2P_PORT=5411
BULEN_CORS_ORIGINS=https://api.<domain>,https://api2.<domain>,https://explorer.<domain>
BULEN_RATE_LIMIT_WINDOW_MS=10000
BULEN_RATE_LIMIT_MAX_REQUESTS=20
BULEN_PEERS=http://<validator1-private>:4101,http://<validator2-private>:4101,http://<validator3-private>:4101
BULEN_DATA_DIR=/opt/bulencoin/data/sentry
```

### Gateway (h6/h7 in 10-host; merged into h3 in 5-host)
If running separate gateway nodes (proxies talking to sentry/validators):
`/opt/bulencoin/env/bulennode-gateway.env` same as sentry but `BULEN_PEERS` pointed at sentries: `http://<sentry1-private>:5411,...`.

### Explorer (h4 or h8)
`/opt/bulencoin/env/explorer.env`:
```
EXPLORER_PORT=5420
EXPLORER_API_BASE=https://api.<domain>/api
EXPLORER_STATUS_URL=https://status.<domain>/status.json
```

### Status service (h4 or h8)
`/opt/bulencoin/env/status.env`:
```
STATUS_PORT=5430
NODES=https://api.<domain>/api/status|x-bulen-status-token:<token>,https://api2.<domain>/api/status|x-bulen-status-token:<token>
STATUS_STRICT_TLS=true
```

### Rewards hub (h4 or h8)
`/opt/bulencoin/env/rewards.env`:
```
PORT=4400
REWARDS_HMAC_SECRET=<hmac>
REWARDS_TOKEN=<token>
BASE_URL=https://rewards.<domain>
```

### Static site (h4 or h9)
- No env; served via nginx root `/var/www/bulen`.

### Monitoring (h5/h10)
- Prometheus scrape tokens: put in `/opt/bulencoin/env/prometheus.env` if needed for sidecar auth; otherwise static config (see below).

## 5) Systemd units
Create `/etc/systemd/system/bulennode.service` (adjust `EnvironmentFile` per role/host):
```
[Unit]
Description=BulenNode
After=network.target

[Service]
User=bulen
WorkingDirectory=/opt/bulencoin/repo/bulennode
EnvironmentFile=/opt/bulencoin/env/bulennode-ROLE.env
ExecStart=/usr/bin/node src/index.js
Restart=always
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
```
Replace `ROLE` with `validator`, `sentry`, or `gateway`. Then:
```bash
systemctl daemon-reload
systemctl enable --now bulennode.service
```

Explorer unit `/etc/systemd/system/explorer.service`:
```
[Unit]
Description=Bulen Explorer
After=network.target

[Service]
User=bulen
WorkingDirectory=/opt/bulencoin/repo/explorer
EnvironmentFile=/opt/bulencoin/env/explorer.env
ExecStart=/usr/bin/node server.js
Restart=always

[Install]
WantedBy=multi-user.target
```

Status service `/etc/systemd/system/status.service`:
```
[Unit]
Description=Bulen Status Aggregator
After=network.target

[Service]
User=bulen
WorkingDirectory=/opt/bulencoin/repo/status
EnvironmentFile=/opt/bulencoin/env/status.env
ExecStart=/usr/bin/node server.js
Restart=always

[Install]
WantedBy=multi-user.target
```

Rewards hub `/etc/systemd/system/rewards.service`:
```
[Unit]
Description=Bulen Rewards Hub
After=network.target

[Service]
User=bulen
WorkingDirectory=/opt/bulencoin/repo/rewards-hub
EnvironmentFile=/opt/bulencoin/env/rewards.env
ExecStart=/usr/bin/node server.js
Restart=always

[Install]
WantedBy=multi-user.target
```

Reload and start after creating each unit.

## 6) Reverse proxy (nginx) for public hosts (sentry/gateway/explorer/status/rewards/site)
Example for `api.<domain>` (sentry/gateway):
```
server {
  listen 443 ssl http2;
  server_name api.<domain>;
  ssl_certificate /etc/letsencrypt/live/api.<domain>/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/api.<domain>/privkey.pem;
  add_header Strict-Transport-Security "max-age=31536000" always;
  add_header X-Content-Type-Options nosniff;
  add_header X-Frame-Options DENY;
  add_header Referrer-Policy strict-origin-when-cross-origin;

  # Rate limit
  limit_req zone=api burst=20 nodelay;

  location / {
    proxy_pass http://127.0.0.1:5410;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
```
Add similar servers for explorer (5420), status (5430), rewards (4400), static site root (`/var/www/bulen`). HTTP->HTTPS redirect blocks on :80.

## 7) Static site publish (h4 or h9)
```bash
mkdir -p /var/www/bulen
cp /opt/bulencoin/repo/index.html /var/www/bulen/
cp /opt/bulencoin/repo/styles.css /var/www/bulen/
cp /opt/bulencoin/repo/script.js /var/www/bulen/
chown -R www-data:www-data /var/www/bulen
```
Nginx server:
```
server {
  listen 443 ssl http2;
  server_name www.<domain>;
  root /var/www/bulen;
  index index.html;
  ssl_certificate /etc/letsencrypt/live/www.<domain>/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/www.<domain>/privkey.pem;
}
```

## 8) Monitoring host (h5/h10) – native packages
Install Prometheus + Alertmanager + Grafana without containers:
```bash
apt-get install -y prometheus prometheus-node-exporter alertmanager
# Grafana from official repo
wget -q -O - https://packages.grafana.com/gpg.key | apt-key add -
echo "deb https://packages.grafana.com/oss/deb stable main" > /etc/apt/sources.list.d/grafana.list
apt-get update && apt-get install -y grafana
systemctl enable --now grafana-server prometheus alertmanager
```

Prometheus config `/etc/prometheus/prometheus.yml` (replace targets/tokens):
```
global:
  scrape_interval: 15s
scrape_configs:
  - job_name: "validators"
    metrics_path: /metrics
    scheme: http
    authorization:
      type: Bearer
      credentials: <BULEN_METRICS_TOKEN>
    static_configs:
      - targets: ["<validator1-private>:4100","<validator2-private>:4100","<validator3-private>:4100"]
  - job_name: "gateways"
    metrics_path: /metrics
    scheme: https
    authorization:
      type: Bearer
      credentials: <BULEN_METRICS_TOKEN>
    static_configs:
      - targets: ["api.<domain>","api2.<domain>"]
```
Restart after edits: `systemctl restart prometheus`.

Alertmanager config `/etc/alertmanager/alertmanager.yml` (wire email/Slack). Restart: `systemctl restart alertmanager`.

Grafana: `systemctl restart grafana-server`; login default `admin/admin`, import `docs/grafana-dashboard.json`.

## 9) Backups (h5/h10)
- Cron or systemd timer: every 5–15 min `tar`/`rsync` `/opt/bulencoin/data/*` to S3 with versioning and SSE.
- Validate restore monthly by launching a throwaway VM and syncing data back, then starting BulenNode.

## 10) Boot order
1) Validators (private) – start `bulennode.service`, verify `/api/status` locally with token.  
2) Sentry (and gateways) – start service, ensure they peer with validators.  
3) Explorer, status, rewards – start after gateway endpoints are reachable.  
4) Static site + TLS.  
5) Monitoring/Alertmanager.  

## 11) Verification checklist
- Validators: `curl -H "x-bulen-status-token: <token>" http://validator:4100/api/status` shows advancing `height` and `finalizedHeight`; `/metrics` accessible with token.
- Gateways/sentries: HTTPS 200 for `/api/status`; P2P token enforced; CORS limiter active.
- Explorer: opens and loads data from `EXPLORER_API_BASE`.
- Status: `/status.json` lists nodes with healthy flags.
- Rewards-hub: `/leaderboard` reachable; HMAC secret set.
- Prometheus targets all `UP`; Grafana graphs height/peers; alert tests (stop one validator) fire.
- TLS auto-renew timers enabled (certbot).

## 12) Notes for 5-host vs 10-host
- 5-host: h3 runs sentry+gateway; h4 runs explorer+status+rewards+site; single API endpoint. Set `NODES` in `status.env` to only `api.<domain>`.
- 10-host: use both gateways and both sentries; set `BULEN_PEERS` on validators to sentry private IPs; set explorer/status to prefer `api.<domain>` and `api2.<domain>`; optional second static site (h9) for downloads. Use DNS round-robin or LB between `api` and `api2`.
