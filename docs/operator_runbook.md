# Operator Runbook (validator / gateway)

## Security configuration
- Enable strict defaults: `BULEN_SECURITY_PRESET=strict` (enforces signatures, disables faucet, requires status/metrics/P2P tokens).
- Set secrets: `BULEN_P2P_TOKEN`, `BULEN_STATUS_TOKEN`, `BULEN_METRICS_TOKEN`, optional `BULEN_WEBHOOK_SECRET`.
- For public P2P/HTTP, use TLS (reverse proxy recommended); set version headers and tokens.
- Server profile: `BULEN_NODE_PROFILE=server-full` (defaults ports 4100/4101).
- Rewards are autonomous: `BULEN_ENABLE_PROTOCOL_REWARDS` on by default; `BULEN_BLOCK_PRODUCER_FRACTION` sets producer share, rest split by stake.

Example validator start:
```bash
export BULEN_SECURITY_PRESET=strict BULEN_P2P_TOKEN="p2p-secret" \
  BULEN_STATUS_TOKEN="status-secret" BULEN_METRICS_TOKEN="metrics-secret" \
  BULEN_NODE_PROFILE=server-full BULEN_ENABLE_PROTOCOL_REWARDS=true \
  BULEN_BLOCK_REWARD=10 BULEN_FEE_BURN_FRACTION=0.3 BULEN_FEE_ECOSYSTEM_FRACTION=0.1 \
  BULEN_BLOCK_PRODUCER_FRACTION=0.4
node src/index.js
```

## Observability and alerts
- Status: `curl -H "x-bulen-status-token: <token>" http://host:4100/api/status`
  - Key fields: `height`, `bestChainWeight`, `finalizedHeight`, `mempoolSize`, `peers`, `monetary.*` (burn, ecosystem pool, block emission).
- Prometheus: `curl -H "x-bulen-metrics-token: <token>" http://host:4100/metrics`
  - Suggested alerts:
    - no growth of `bulen_blocks_height` or `bulen_chain_weight` for >2× block interval,
    - `bulen_blocks_finalized_height` stagnant for several finality windows,
    - rising `bulen_slash_events_total`,
    - `bulen_mempool_size` near limit.

## Backup and restore
- Node data: `data/<profile>`. Stop process before backup; copy directory or take disk snapshot.
- When restoring, ensure matching `chainId` and protocol version (`BULEN_PROTOCOL_VERSION`).

## Rolling updates
- Drain/remove from LB, stop service, deploy new code, start service, then check `/health`, `/api/status`, and `finalizedHeight`.
- After changing reward/fee-burn params verify `/api/status` `monetary` section and `/metrics` values.

## Hardening tips
- Reverse proxy (nginx/caddy) with TLS, IP limiter, security headers; keep HTTP API on `/api/*`, P2P on a separate port.
- Firewalls: open only P2P/HTTP ports required for the node role (validator/gateway).
- Store secrets in `EnvironmentFile=/etc/default/bulennode-server` with 640 perms owned by root:bulen.

## Quick diagnostics
- Check finality: `finalizedHeight` via `/api/status` and `bulen_blocks_finalized_height` in `/metrics`.
- Config sanity: `/api/info` returns `securityPreset`, `requireSignatures`, `enableProtocolRewards`, `p2pHandshakeRequired`, `p2pTlsEnabled`.
- If blocks are not produced: ensure `nodeRole=validator`, stake exists for `nodeId`, mempool has txs, and P2P token/TLS settings are not blocking peers.
