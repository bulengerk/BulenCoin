---
title: BulenCoin – deployment guide (EN)
language: en
---

This document is a concise English companion to `docs/deployment_guide.md`. It focuses on
how to run the web site, prototype nodes and supporting services. For the full technical
specification, see `docs/bulencoin_spec_pl.md` (Polish).

# 1. Components in this repository

- Static marketing / documentation site:
  - `index.html`, `styles.css`, `script.js` – multilingual page (EN/ES/PL) describing the
    BulenCoin protocol, node types, consensus and economics.
- Prototype infrastructure:
  - `bulennode/` – minimal BulenNode service (HTTP API, simple PoS‑like block production,
    basic P2P over HTTP),
  - `explorer/` – basic block explorer reading data from BulenNode,
  - `status/` – status aggregation service that polls multiple BulenNode instances,
  - `rewards-hub/` – prototype rewards leaderboard fed by uptime/stake telemetry,
  - `sdk/` – lightweight JS/TS helpers for payments, payment links and status polling.
- Documentation:
  - `docs/bulencoin_spec_pl.md` – full protocol spec (PL),
  - `docs/deployment_guide.md` – detailed deployment guide (PL),
  - `docs/legal_compliance_pl.md` – high‑level legal/compliance notes (PL),
  - `docs/security_hardening_pl.md` – hardening and logging guidelines (PL).

# 2. Running the static website

For local development:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080` in a browser. Use the language selector in the header to
switch between EN/ES/PL.

For production:

- host the three files on any static host (GitHub Pages, Netlify, S3+CloudFront, nginx),
- terminate TLS at the reverse proxy and serve `index.html` for the site root.

# 3. Running BulenNode locally (prototype)

Requirements:

- Node.js 18+,
- npm.

From the repo root:

```bash
cd bulennode
npm install
npm start
```

By default:

- the node uses the `desktop-full` profile,
- listens on `http://localhost:4100`,
- stores data under `data/desktop-full`,
- produces blocks when there are pending transactions.

Useful endpoints:

- `GET /api/status` – node status, profile, device class, reward weight and uptime metrics,
- `GET /api/blocks` – recent blocks (with pagination),
- `GET /api/accounts/:address` – account balances,
- `GET /api/mempool` – current mempool contents,
- `POST /api/transactions` – submit a transaction,
- `POST /api/payments` / `GET /api/payments/:id` – invoice lifecycle (supports `webhookUrl`),
- `POST /api/payment-link` – build a BIP21-like payment link + QR code,
- `POST /api/rewards/estimate` – reward/loyalty projection calculator,
- `POST /api/wallets/challenge` / `POST /api/wallets/verify` – signed-message login,
- `POST /api/faucet` – development faucet (should be disabled in public setups).

To run tests:

```bash
cd bulennode
npm test
```

Tests use Node’s built‑in `node:test` module and cover core chain/reward logic.

# 4. Node profiles and multi‑platform support

The prototype node uses `BULEN_NODE_PROFILE` to pick a default configuration and reward
weighting. Available profiles:

- `desktop-full` – full node on laptops/desktops (validator),
- `server-full` – full node on servers (validator; higher uptime weight, faucet off),
- `mobile-light` – light node on phones (lower reward weight, longer block interval),
- `tablet-light` – light node on tablets,
- `raspberry` – full/partial node on Raspberry Pi / ARM SBC,
- `gateway` – API gateway node (observer; no faucet).

All configuration can be overridden via environment variables (ports, block interval,
security flags, peers).

The prototype is implemented in Node.js and can run on Linux, macOS, Windows and ARM
devices (including Raspberry Pi) as long as Node 18+ is available.

# 5. Security‑related configuration (summary)

Key environment variables:

- `BULEN_REQUIRE_SIGNATURES` – when `true`, every transaction must include:
  - `publicKey` (PEM),
  - `signature` (base64, ECDSA over canonical JSON `{ from, to, amount, fee, nonce }`),
  - `nonce` higher than the account’s current nonce.
- `BULEN_ENABLE_FAUCET` – enables the `/api/faucet` endpoint (should be `false` in
  semi‑public and production setups).
- `BULEN_P2P_TOKEN` – shared secret for HTTP P2P traffic (`/p2p/tx`, `/p2p/block`); nodes
  only accept P2P messages with a matching `x-bulen-p2p-token` header.
- `BULEN_MAX_BODY_SIZE` – maximum JSON body size for requests (defaults to `128kb`).
- `BULEN_RATE_LIMIT_WINDOW_MS` / `BULEN_RATE_LIMIT_MAX_REQUESTS` – request limiter window
  (milliseconds) and max requests per IP in that window (defaults `15000` / `60`). For
  public gateways use stricter values or an external WAF/reverse proxy.
- `BULEN_STATUS_TOKEN` / `BULEN_METRICS_TOKEN` – optional shared secrets required in
  headers for `/api/status` and `/metrics` when exposed through public gateways.
- `BULEN_REWARDS_HUB` / `BULEN_REWARDS_TOKEN` – optional telemetry target for uptime/stake
  reports (prototype rewards hub; best-effort).
- `BULEN_WEBHOOK_SECRET` – if set, payment webhooks are signed with `x-bulen-signature`
  (sha256 HMAC over the JSON body).
- `BULEN_REWARDS_HMAC_SECRET` – if set, telemetry reports to rewards-hub are signed with
  `x-bulen-signature` (sha256 HMAC).

For detailed hardening and logging guidance, see `docs/security_hardening_pl.md`.

# 6. Docker and docker-compose

Prototype Dockerfiles:

- `bulennode/Dockerfile` – container for the node (default `server-full` profile),
- `explorer/Dockerfile` – container for the explorer.

From the repo root you can run:

```bash
docker-compose up --build
```

The compose file `docker-compose.yml` starts:

- `bulennode` – node on port `4100`,
- `explorer` – explorer on port `4200`,
- `status` – status aggregation service on port `4300` (polling `bulennode`’s `/api/status`).

For observability, BulenNode exposes a Prometheus‑formatted `/metrics` endpoint with
chain height, mempool size, stake totals, uptime/reward estimates, payments counters,
protocol version and limiter configuration. Scrape it directly or via a reverse proxy
with TLS/auth.

# 7. Human-friendly security defaults and setup

- **Production builds hard-default:** `BULEN_REQUIRE_SIGNATURES=true`, `BULEN_P2P_REQUIRE_HANDSHAKE=true`, P2P token set, TLS required for P2P (`BULEN_P2P_REQUIRE_TLS=true` with cert/key). Production profiles refuse to start without these.
- **Config wizard (CLI/UI) with checklist:** walks through profile (gateway/validator/mobile), ports, tokens, CORS allowlist, status/metrics tokens, TLS files, mempool and rate limits. Writes `config.env` and prints a “secure node” checklist (faucet off, key backup, snapshots, monitoring).
- **Auto-update with signature verification:** binaries fetched over HTTPS with signed manifest (minisig/ed25519). Node verifies signatures before swapping; on failure it keeps the current version and logs/alerts.
- **UX warnings:** UI/CLI highlights missing TLS/tokens, disabled signature checks, missing backups and reminds to turn off faucet on public hosts.

# 8. Token economics and payouts (policy draft)

- **Inflation (parametric decay):** 8% in year 1 → 6% in year 2 → 4% in year 3 → 2.5% in year 4 → 1.5% from year 5 onward; changes only within narrow governance bands.
- **Block rewards split:** 60% validators/committee by stake, 20% uptime/loyalty pool, 20% ecosystem pool (multi‑sig + time‑lock, transparently reported).
- **Transaction fees:** 30% burned, 60% to the active validator set, 10% to the ecosystem pool.
- **Payout cadence and comms:** testnet settles daily (low stakes) to exercise tooling; mainnet pays per epoch (~weekly) after finality. Publish a calendar (epoch IDs, slot start, payout dates), fee‑burn totals and ecosystem pool balances on dashboards.

# 9. Legal and compliance notes (high‑level)

The repository itself:

- does not ship a live token or token sale,
- does not promise profit or returns,
- provides an experimental protocol design and prototype implementations only.

Operating a production network, exchanges, custodial wallets or user‑facing services may
be regulated in your jurisdiction (MiCA, AML, local financial‑services law, tax law, GDPR).

Before running a production BulenCoin network or offering services on top of it, obtain
qualified legal and tax advice. The authors of this project and this repository do not
provide legal, financial or tax advice.
