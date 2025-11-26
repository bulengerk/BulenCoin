# BulenCoin – production deployment starter (manifesty i topologie)

Szkic do dalszego rozszerzania (do eksportu do PDF). Zakłada węzły Rust/Node za reverse
proxy z TLS, sentry nodes oraz podstawowy backup/snapshot i monitoring.

## Topologia minimalna (prod)

- **Walidatory** (3–4): prywatne adresy, za sentry; role validator, `BULEN_REQUIRE_SIGNATURES=true`, `BULEN_P2P_TOKEN` ustawiony, faucet off.
- **Sentry** (2): publiczne IP/porty, reverse proxy + TLS, terminują P2P+HTTP, forward do walidatorów po prywatnym/VPN.
- **Gateway** (2): API/Explorer/Status za TLS/WAF, limiter ciaśniejszy, P2P token i wersja w nagłówku.
- **Monitoring** (1): Prometheus + Alertmanager + Grafana, scrapes `/metrics`.
- **Backup/Snapshot**: bucket S3-kompatybilny na `state.json`/`payments.json`/`wallet_sessions.json`.

### Wymagania sprzętowe / OS (minimum)

- OS: Debian 12 lub Ubuntu 22.04 LTS; Node.js 18 LTS (`npm` ≥ 9).
- Walidator / gateway: min. 2 vCPU, 4 GB RAM, 40 GB SSD/NVMe; rekomendacja 4 vCPU, 8 GB RAM, 80 GB.
- Sentry: podobnie jak gateway, ale z ostrzejszym limiterem; pamiętaj o TLS/WAF.
- Desktop-full (niepubliczny): min. 2 vCPU, 4 GB RAM, 20 GB SSD.
- Raspberry: Raspberry Pi 4/4GB (lub lepszy) + microSD UHS-I 32 GB / SSD po USB, stabilne łącze.
## Reverse proxy (nginx, przykład)

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

Traefik/ingress – analogicznie: TLS, HSTS, rate-limit middleware, forward auth gdy trzeba.

## Konfiguracja węzłów (Rust/Node)

- `BULEN_REQUIRE_SIGNATURES=true`
- `BULEN_P2P_TOKEN=<shared>`
- `BULEN_PROTOCOL_VERSION` zsynchronizowane w klastrze
- `BULEN_RATE_LIMIT_WINDOW_MS` / `BULEN_RATE_LIMIT_MAX_REQUESTS` (gateway: np. 10s / 20)
- `BULEN_MAX_BODY_SIZE_BYTES` (~128kb)
- `BULEN_CORS_ORIGINS=https://api.bulen.example,https://explorer.bulen.example`
- `BULEN_ENABLE_FAUCET=false` na publicznych hostach
- `BULEN_PEERS=https://sentry1.bulen.example,https://sentry2.bulen.example`
- `BULEN_PEER_SYNC_INTERVAL_MS=5000` (Rust node)

## Backup / snapshot

- Co 5–15 minut: snapshot `data/` (Node) lub `data-rs/` (Rust) do bucketu S3 (z wersjonowaniem).
- Trzymaj co najmniej 7 dni wersji; szyfruj at-rest (SSE).
- Testuj odtwarzanie: `aws s3 cp s3://bucket/state.json data-rs/state.json`, start węzła.

## Monitoring / alerty

- Prometheus scrapuje:
  - walidatory, gateway: `/metrics`
  - reverse proxy: metryki 5xx/latencja
- Alerty:
  - brak metryk / host down
  - niski peer count, brak wzrostu height
  - skok 5xx / 429
  - opóźnienie wysokości względem innych > N bloków
- Grafana dashboard: wysokość łańcucha, mempool, stake total, reward est., payments, rate-limit config, peers.

## Sentry nodes

- Publiczne tylko sentry; walidatory słuchają tylko na prywatnym/VPN.
- Sentry ma `BULEN_P2P_TOKEN` i sprawdza wersję protokołu w nagłówku; limiter per-IP.
- W firewallu otwarte tylko porty HTTP/P2P z zaufanych źródeł (WAF/ACL).

## Checklista hardening

- Non-root użytkownik dla procesu, `AmbientCapabilities=CAP_NET_BIND_SERVICE` tylko gdy trzeba.
- Aktualne TLS certy, automatyczny renew (certbot/lego).
- Log rotation (journald/logrotate) z retencją 30–90 dni.
- Sekrety w KMS/SSM/Vault, nie w repo.
- Systemd unit z `Restart=on-failure`, limit CPU/mem w cgroup.
