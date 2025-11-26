# BulenCoin – feasibility and minimum hardware

Working draft to estimate realistic minimum hardware for pilot/testnet and a lean
production footprint (Rust/Node clients).

## Assumptions

- Current prototype (Node.js) is lightweight on CPU/RAM/I/O.
- PoS with small committees; no heavy historical storage.
- Minimal redundancy: 3 validators for quorum, 1 gateway, 1 explorer + status (shared host
  is fine).

## Pilot / testnet (Node.js client)

- **Validators (3x):** 2 vCPU, 4 GB RAM, 40 GB SSD; public IP/ports for HTTP/P2P; profile
  `server-full` or `desktop-full`.
- **Gateway + Explorer + Status (1x shared):** 2 vCPU, 4 GB RAM, 30 GB SSD; public HTTP/HTTPS;
  P2P token set, stricter rate limits.
- **Optional edge/ARM nodes:** Raspberry Pi 4 / 4 GB + fast microSD/SSD, stable network.

Network: 50+ Mbps symmetric recommended; secure ports via firewall/WAF; TLS termination at
reverse proxy.

Total: 4 small VMs give a usable pilot quorum and public API.

## Minimal production (Rust client target)

- Focus on Rust BulenNode for efficiency (RAM/CPU, I/O, static binaries).
- **Validators (3x):** 2–4 vCPU, 4–8 GB RAM, NVMe SSD 40+ GB, static IPs; strict profile,
  signatures on, faucet off.
- **Sentries (2x):** front P2P+HTTP with TLS/WAF, forward to validators over private/VPN;
  rate limit tighter.
- **Gateway (1x) + Explorer + Status:** 2 vCPU, 4 GB RAM, 30 GB SSD; HTTPS/WAF; connects
  only to sentries or private validator addresses.
- **Monitoring:** Prometheus scraping `/metrics` from validators/sentries/gateway; alert on
  liveness, peers, 5xx/429, height lag.
- **Backups:** validator state snapshot/restore scripts; config and keys in KMS/HSM if
  available.

Rough monthly cloud cost (budget instances): ~$50–70 for 3 validators + 1 shared
gateway/explorer/status.

## Garage / PoC variant

- 1 laptop/mini-PC (4 vCPU, 8 GB RAM, 256 GB SSD) running 3 validator instances on
  different ports + 1 gateway/explorer/status instance; not production-grade but fine for
  demos.

## Network and security checklist

- Tokens: `BULEN_P2P_TOKEN` consistent across nodes; `BULEN_STATUS_TOKEN`/`BULEN_METRICS_TOKEN`.
- TLS/WAF/ACL for public endpoints; open only required ports.
- Non-root service users; `AmbientCapabilities=CAP_NET_BIND_SERVICE` only if binding <1024.
- Log rotation with 30–90 day retention.
- Alerting on node down, high 429/5xx, chain height divergence, low peers.

## Upgrade and recovery

- Keep snapshots for fast rehydrate; test restore regularly.
- Plan protocol upgrades with version headers in P2P; reject mismatched major versions.
- Document failover for gateway/sentry and validator replacement.

## Resource tuning

- Block interval and pruning tuned per profile (desktop/server vs mobile/superlight).
- Rate limits tighter on gateways; default limits acceptable for devnet/testnet.
- Super-light/mobile profiles sleep on low battery and keep small history windows.
