# BulenCoin – production deployment starter (manifests and topology)

Draft outline for production deployments behind TLS reverse proxy with sentry nodes, basic
backup/snapshot, and monitoring. Applies to Rust/Node clients.

## Minimal production topology

- **Validators (3–4):** private addresses behind sentries; `BULEN_REQUIRE_SIGNATURES=true`,
  shared `BULEN_P2P_TOKEN`, faucet off.
- **Sentries (2):** public IP/ports, terminate P2P+HTTP with TLS, forward to validators via
  private network/VPN.
- **Gateways (2):** API/Explorer/Status behind TLS/WAF; tighter rate limits; require P2P
  token and protocol version header.
- **Monitoring (1):** Prometheus + Alertmanager + Grafana scraping `/metrics`.
- **Backup/Snapshot:** S3-compatible bucket for `state.json` / payments/wallet session
  snapshots.

### Minimum OS/hardware

- OS: Debian 12 or Ubuntu 22.04 LTS; Node.js 18 LTS (npm ≥ 9).
- Validator/gateway: min 2 vCPU, 4 GB RAM, 40 GB SSD/NVMe (4 vCPU/8 GB/80 GB recommended).
- Sentry: similar to gateway with tighter limiter; TLS/WAF enforced.
- Desktop-full (non-public): min 2 vCPU, 4 GB RAM, 20 GB SSD.
- Raspberry: Pi 4/4GB (or better) + UHS-I 32 GB microSD / USB SSD, stable link.

## Reverse proxy (nginx example)

```
server {
  listen 443 ssl http2;
  server_name api.bulen.example;

  ssl_certificate /etc/letsencrypt/live/api/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/api/privkey.pem;

  # Security headers
  add_header Strict-Transport-Security "max-age=31536000" always;
  add_header X-Content-Type-Options nosniff;
  add_header X-Frame-Options DENY;
  add_header Referrer-Policy strict-origin-when-cross-origin;

  # Rate limiting (nginx zone required)
  limit_req zone=api burst=20 nodelay;

  location / {
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_pass http://127.0.0.1:5100;
  }
}
```

Traefik/ingress: same principles—TLS, HSTS, rate-limit middleware, optional forward auth.

## Node configuration (Rust/Node)

- `BULEN_REQUIRE_SIGNATURES=true`
- `BULEN_P2P_TOKEN=<shared>`
- `BULEN_PROTOCOL_VERSION` aligned across the cluster
- `BULEN_RATE_LIMIT_WINDOW_MS` / `BULEN_RATE_LIMIT_MAX_REQUESTS` (gateway e.g., 10s / 20)
- `BULEN_MAX_BODY_SIZE_BYTES` (~128kb)
- `BULEN_CORS_ORIGINS=https://api.bulen.example,https://explorer.bulen.example`
- `BULEN_ENABLE_FAUCET=false` on public hosts
- `BULEN_PEERS=https://sentry1.bulen.example,https://sentry2.bulen.example`
- `BULEN_PEER_SYNC_INTERVAL_MS=5000` (Rust node)

## Backup / snapshot

- Every 5–15 minutes: snapshot `data/` (Node) or `data-rs/` (Rust) to S3 with versioning.
- Retain at least 7 days; encrypt at rest (SSE).
- Test restore regularly: `aws s3 cp s3://bucket/state.json data-rs/state.json` then start
  the node.

## Monitoring / alerts

- Prometheus scrapes:
  - validators, gateways: `/metrics`
  - reverse proxy: 5xx/latency metrics
- Alerts:
  - missing metrics/host down
  - low peer count, missing height growth
  - spikes in 5xx / 429
  - height lag > N blocks vs peers
- Grafana dashboard: height, mempool, total stake, reward estimates, payments, rate-limit
  config, peers.

## Sentry nodes

- Only sentries are public; validators listen on private/VPN networks.
- Sentries enforce `BULEN_P2P_TOKEN` and protocol version header; per-IP limiter.
- Firewall exposes only required HTTP/P2P ports from trusted sources (WAF/ACL).

## Hardening checklist

- Non-root service user; `AmbientCapabilities=CAP_NET_BIND_SERVICE` only when needed.
- Current TLS certs with auto-renewal (certbot/lego).
- Log rotation (journald/logrotate) with 30–90 day retention.
- Secrets in KMS/SSM/Vault, not in the repo.
- Systemd unit with `Restart=on-failure`; optionally cap CPU/mem via cgroups.

## TODO (next iteration)

- Soak/perf tests (days/weeks) with metrics and network fault scenarios.
- Adversarial/byzantine P2P (blocking/double-sign), upgrade/backward-compat tests, signed
  snapshots.
- Signed packages (.deb/.rpm/.pkg/.exe) + auto-update desktop; release pipeline with
  hashes/Sigstore.
- SLO/alert dashboard (Prometheus/Grafana): height drift, peer count, 5xx/latency,
  mempool.
