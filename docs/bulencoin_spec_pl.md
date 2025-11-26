# BulenCoin protocol specification (English)

## 1. Project goal

BulenCoin aims to prove that a functioning PoS network can be sustained by widely available
hardware (phones, laptops, servers, SBCs) with predictable uptime rewards and modest
resource requirements. The prototype demonstrates architecture, protocol, and reference
clients (Node.js today, Rust in progress).

## 2. Network model

- Proof-of-Stake with small validator committees; lottery based on stake, device class
  weight, reputation, and recent randomness.
- Lightweight data model: block headers, recent state, mempool; pruning/snapshots for
  light and super-light profiles.
- Roles explicitly separated to accommodate constrained devices.

### 2.1 Node types

- **Mobile light:** keeps headers + small state slice; connects to full nodes for proofs;
  may join small committees if staked; battery- and data-aware (sleep on low battery,
  Wi‑Fi-only option).
- **Phone super-light:** observer-only; maintains snapshot and recent headers; aggressive
  pruning; focus on wallet UX with minimal background work.
- **Desktop/Server full:** stores full history + state; propagates blocks/tx; participates
  in consensus and serves light clients; can act as gateway API.
- **Gateway:** full node exposing public API; tuned rate limits, tokens, faucet usually off.
- **Raspberry/ARM:** profile for SBCs with relaxed intervals and lower resource use.

### 2.2 Device profiles

Profiles set ports, reward weight, block interval, pruning level, faucet default, and
super-light behaviour. Example weights: server-full 1.0, desktop-full 0.8, gateway 0.9,
raspberry 0.75, mobile-light 0.5, tablet-light 0.6, phone-superlight 0.35.

## 3. Data structures

- **Block:** header (height, prevHash, stateRoot, timestamp, producerId, committee
  signatures, monetary summary) + transactions.
- **Transaction:** {from, to, amount, fee, nonce, memo?, signature?, chainId} with memo
  length limits; optional signatures enforced in production.
- **State:** accounts (balance, stake, nonce, reputation), reward pools, slashing events,
  peer book (for P2P scoring), snapshots for pruning.

## 4. Consensus and block production

- Time divided into slots with a lottery over eligible validators; committee size small
  for low-resource operation.
- Selection factors: stake, device class weight, uptime reputation, randomness from recent
  blocks.
- Producer assembles block from mempool, runs basic validation (nonce, balance, signatures,
  memo length, chainId), computes monetary summary, and signs.
- Committee verifies and signs; block is accepted when quorum signatures are present.
- Finality after a small number of confirmed blocks with sufficient committee weight.

## 5. Rewards and economics

- **Sources:** block reward (inflationary, configurable), transaction fees, explicit uptime
  reward pool.
- **Distribution:** producer gets a portion of reward + fees; remaining fees and reward
  shared among stake holders weighted by uptime and device class; fee burn fraction and
  ecosystem pool fraction configurable.
- **Reputation:** increases with successful participation and responsiveness; decreases on
  faults; influences selection probability.
- **Slashing:** applied on double-signing/equivocation or protocol violations; stake is
  partially removed and reputation reduced.
- **Delegation:** light/super-light users may delegate stake to validators (design target).

## 6. Networking (P2P over HTTP)

- Endpoints: `/p2p/handshake`, `/p2p/block`, `/p2p/tx`, `/p2p/peers`.
- Optional `x-bulen-p2p-token` shared secret; protocol version header enforced (reject
  mismatched major version).
- Fanout limited to reduce bandwidth; backpressure caps concurrent P2P requests.
- Peer book stores scores; scoring increases on successful observations and decays on
  failures; persisted to disk.

## 7. API (HTTP)

- `/api/status`, `/api/health`, `/api/blocks`, `/api/accounts/:addr`, `/api/mempool`,
  `/api/transactions`, `/api/payment-link`, `/api/payments`, `/api/rewards/estimate`,
  `/metrics` (Prometheus), `/api/wallets/*` for wallet flows.
- Guardrails: JSON body limit (`BULEN_MAX_BODY_SIZE`), rate limits, optional signature
  requirement, faucet toggle, tokens for status/metrics, webhook HMAC signing, CORS
  restrictions.

## 8. Wallet and payments

- Wallet API supports create/import/backup/verify flows with signed challenges; sessions
  cached with expiry; backups encrypted with passphrase.
- Payments: invoices with `expiresAt`, optional memo/webhook; payment links use
  BIP21-style URIs (`bulen:<address>?amount=...&memo=...`) and QR generation.
- Transactions checked for memo length, amount > 0, balance, nonce, and (optionally)
  signature validity and chainId match.

## 9. Security considerations

- Enforce request size limits, rate limiting per IP, origin checks, and tokens for
  privileged endpoints.
- CORS allowlist configurable; production defaults deny unknown origins.
- P2P token and version headers to avoid spam/old peers.
- State files include checksum; load routine verifies and strips checksum before use.
- Super-light mode limits stored history and allows sleeping on low battery (via
  `/api/device/battery`).

## 10. Telemetry and privacy

- Telemetry is optional and disabled by default. If enabled, reports are HMAC-signed and
  anonymised/aggregated; intended for reward calibration and health monitoring without
  personal data collection.

## 11. Operations

- Profiles select default ports and behaviours; override via env vars.
- Snapshots/pruning to control disk usage; gateway nodes should use stricter limits and
  tokens; validators behind sentries recommended for production.
- Metrics exposed for Prometheus; Grafana dashboard supplied.

## 12. Network lifecycle

1. **Devnet/Testnet:** faucet on, relaxed defaults, rapid iteration; collect anonymised
   telemetry for parameter tuning.
2. **Public testnet:** signatures required, faucet mostly off on gateways, P2P tokens, rate
   limits tightened, monitoring and alerts enabled.
3. **Audit:** security review of consensus, P2P, transaction validation; fuzzing/load
   tests.
4. **Mainnet bootstrap:** fixed parameters for reward/fees, community validators added,
   delegation enabled; team node share reduced over time.

## 13. Client architecture (prototype)

Modules shared across platforms:

- Networking (HTTP P2P + API), consensus logic, storage, wallet/key management, monitoring.
- Platform-specific shells (mobile background service vs desktop/server process).
- UI surfaces height, peers, data usage, stake/reputation, rewards history; mobile UI offers
  battery/data controls.

## 14. Mobile/desktop behaviour

- Mobile: background P2P connections, periodic header sync, simplified uptime checks;
  configurable work hours, charging-only, data caps.
- Desktop/server: full history or pruned mode; optional gateway role; configurable data
  path and ports; systemd/docker for service mode.

## 15. Upgrade strategy

- Versioned protocol; major version mismatch rejected at P2P endpoints.
- Announce breaking changes early; client warns users about required upgrades and cutover
  dates.

## 16. Supporting infrastructure

- Block explorer (HTML + API), rewards/status service, telemetry/rewards-hub (opt-in),
  Grafana/Prometheus stack.

This document replaces the previous Polish specification and should be treated as the
canonical English description of the current prototype and intended production posture.
