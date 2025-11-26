---
title: BulenCoin – security and hardening checklist
language: en
---

This document lists baseline security recommendations for BulenCoin node operators:
OS setup, logging/privacy, network/HTTP hardening, monitoring, and incident handling. It is
not a full threat model or audit.

# 1. OS and environment

- **Dedicated service user:** run the node as a non-root user (e.g., `bulen`); grant only
  required permissions to data dirs.
- **Updates:** keep OS and Node.js up to date; run `npm audit` periodically.
- **Environment separation:** keep test and production separate; never reuse private keys
  across devnet/testnet/mainnet.

# 2. Node configuration and secrets

- **Transaction signatures:** set `BULEN_REQUIRE_SIGNATURES=true` on public nodes; reject
  unsigned or malformed txs.
- **Faucet:** `/api/faucet` is for testing only; set `BULEN_ENABLE_FAUCET=false` publicly.
- **P2P token:** use a strong `BULEN_P2P_TOKEN` across trusted nodes; traffic without the
  token is rejected.
- **Secrets:** store outside the repo (e.g., `/etc/default/bulennode-server` or a secrets
  manager). Never commit tokens, private keys, or seed phrases.

# 3. Logging and privacy (GDPR awareness)

- **Minimise logs:** API gateways may log IPs, user agents, paths—treat as personal data.
  Log only what is necessary for monitoring/debugging.
- **Retention:** rotate logs (logrotate/journald) and cap retention (e.g., 30–90 days);
  remove stale logs from backups.
- **Anonymise:** mask parts of IPs or pseudonymise when possible; do not combine logs with
  other identifiers without legal basis and user notice.
- **Privacy notice:** if operating a public gateway, publish what you collect, why, how
  long you keep it, and user rights.

# 4. Network and HTTP layer

- **Reverse proxy + TLS:** place API/explorer/status behind nginx/Traefik/Caddy; enforce
  HTTPS; set security headers (HSTS, X-Content-Type-Options, X-Frame-Options).
- **Rate limits + firewall:** use per-IP limits at the proxy and within BulenNode (`BULEN_RATE_LIMIT_WINDOW_MS`, `BULEN_RATE_LIMIT_MAX`); tighten for public gateways. Open only
  required ports (HTTP, P2P).
- **Service exposure:** explorer/status can stay internal/VPN-only if not for end users;
  avoid exposing admin/debug endpoints publicly.

# 5. Monitoring and incident response

- **Monitoring:** track block height, peers, uptime, CPU/RAM, HTTP errors. Status service
  can periodically aggregate node state. Prometheus can scrape `/metrics` (height, mempool,
  stake, rewards, payments, protocol version, limiter params).
- **Alerting:** notify on node down, peer count drops, unusual CPU/RAM, or spikes in 5xx/429.
- **Procedures:** plan for validator key compromise, consensus bugs, and API incidents.

# 6. Dependencies and audits

- **Node.js deps:** run `npm audit` in `bulennode/`, `explorer/`, `status/`; update via
  dependency tooling with code review.
- **External audits:** before production, commission a security review (code,
  architecture, configuration).
