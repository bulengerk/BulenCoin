# BulenCoin – quickstart & onboarding (testnet/prototype)

Goal: help new operators run a node in minutes, back up keys, and understand the minimum safety steps. Applies to the prototype Node.js client.

## 1) Choose your profile

- Laptop/desktop validator: `desktop-full` (rewardWeight 0.8).  
- Server validator: `server-full` (1.0).  
- Gateway/observer: `gateway` (0.9, faucet off).  
- Raspberry Pi / ARM: `raspberry` (0.75).  
- Mobile/superlight (observer): `phone-superlight` (0.35, headers + snapshot only).

## 2) Install (one command per OS)

- Linux desktop/server: `./scripts/install_desktop_node.sh` or `./scripts/install_server_node.sh`
- Raspberry Pi / ARM: `./scripts/install_raspberry_node.sh`
- macOS: `./scripts/install_macos_node.sh desktop-full`
- Windows: `powershell -ExecutionPolicy Bypass -File scripts/install_windows_node.ps1 -Profile desktop-full`

Each installs Node 18+ if missing, runs `npm install` in `bulennode/`, and prints env hints.

## 3) Run

```bash
cd bulennode
BULEN_NODE_PROFILE=desktop-full npm start
```

Key env (public hosts):  
`BULEN_REQUIRE_SIGNATURES=true`, `BULEN_ENABLE_FAUCET=false`, `BULEN_P2P_TOKEN=<secret>`, `BULEN_STATUS_TOKEN=<secret>`, `BULEN_METRICS_TOKEN=<secret>`.

## 4) Create and back up wallet (prototype API)

1. Call `/api/wallets/create` (or UI when available) to generate keys.  
2. Save the seed/backup PEM offline (not in this repo).  
3. Set a strong passphrase (min 12 chars).  
4. Test restore: `/api/wallets/import` on another instance.

## 5) Verify node is healthy

- `curl http://localhost:4100/api/status` → check height/profile/rewardWeight.  
- Explorer: point `explorer/` to your node (`BULENNODE_API_BASE`) and load `/`.  
- Metrics (Prometheus): `GET /metrics` with `x-bulen-metrics-token` if set.

## 6) Common recipes

- Fund test account: `POST /api/faucet {"address":"alice","amount":1000}`  
- Send tx: `POST /api/transactions {"from":"alice","to":"bob","amount":123,"fee":1}`  
- Payment link + QR: `POST /api/payment-link {"address":"alice","amount":50,"memo":"order-123"}`  
- Reward estimate: `POST /api/rewards/estimate {"stake":1000,"uptimeHoursPerDay":24}`

## 7) Safety checklist (prototype)

- Public? Disable faucet; set P2P token and status/metrics tokens; prefer TLS behind reverse proxy.  
- Keep keys local; never commit secrets; rotate tokens if leaked.  
- Monitor: height drift, peer count, 5xx, latency, CPU/RAM/disk.  
- Upgrades: track release notes; avoid running mixed protocol versions without plan.

## 8) Next steps

- Try `scripts/tests/full_stack_smoke.test.js` to see node + explorer + status working together.  
- For load: `scripts/tests/node_load_30s.test.js`.  
- For security toggles: `scripts/tests/security_guardrails.test.js`.
