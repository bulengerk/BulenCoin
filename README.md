# BulenCoin – network design, docs and website

This repository contains:

- a cleaned‑up specification of the BulenCoin network in Polish (`docs/bulencoin_spec_pl.md`),
- an investor‑oriented whitesheet in Polish (`docs/whitesheet_investor_pl.md` with PDF),
- a deployment guide for the web layer and the future BulenCoin network (`docs/deployment_guide.md`),
- a static, multilingual website describing BulenCoin (`index.html`, `styles.css`, `script.js`),
- a legal and compliance overview in Polish (`docs/legal_compliance_pl.md`),
- a security hardening guide in Polish (`docs/security_hardening_pl.md`),
- an English overview and deployment guides (`docs/overview_en.md`, `docs/deployment_guide_en.md`),
- a documentation index (`docs/README.md`).

Additionally, it includes prototype infrastructure services implemented in Node.js:

- `bulennode/` – a minimal BulenNode service with HTTP API, simple PoS‑like block production and basic P2P gossip over HTTP,
- `explorer/` – a lightweight web explorer that reads chain data from a BulenNode instance.
- `bulennode-rs/` – wip Rust rewrite of the BulenNode (HTTP API + block production + metrics).
- deployment notes and manifests in `docs/prod_manifests.md` (reverse proxy TLS, sentry nodes, backups, monitoring).
- `rewards-hub/` – prototype rewards leaderboard and badges fed by BulenNode telemetry.
- `sdk/` – JS/TS helpers for merchants (payments, payment links/QR, status polling).
- `sdk-rs/` – Rust client crate (blocking) for payments/status/payment links.

For a map of all documentation, see `docs/README.md`.

The specification is based on the original `bulencoin_spec.pdf` and describes:

- network architecture and node types,
- consensus and reward model (lightweight Proof of Stake with committees),
- mobile, desktop and gateway node applications (BulenNode),
- technical requirements, security and launch phases (testnet → mainnet).

## Running the website locally

From the repository root:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080` in your browser. Use the language selector in the top‑right corner to switch between English, Spanish and Polish.

## Running a local BulenNode

From the repository root, install dependencies and start the node:

```bash
cd bulennode
npm install
npm start
```

By default this:

- creates a local data directory under `data/desktop-full`,
- starts an HTTP API on `http://localhost:4100`,
- produces blocks automatically when there are pending transactions.

### Node profiles and device classes

Nodes use `BULEN_NODE_PROFILE` to select a default configuration and reward weighting:

- `desktop-full` (default) – typical laptop/desktop validator (`deviceClass=desktop`, `rewardWeight=0.8`),
- `server-full` – server‑grade validator with higher relative uptime weight (`deviceClass=server`, `rewardWeight=1.0`),
- `mobile-light` – light node on a phone (`deviceClass=phone`, `rewardWeight=0.5`),
- `tablet-light` – light node on a tablet (`deviceClass=tablet`, `rewardWeight=0.6`),
- `phone-superlight` – observer mode for phones (headers + snapshot, aggressive pruning, `superLightMode=true`, `rewardWeight=0.35`),
- `raspberry` – full/partial node on Raspberry Pi or similar ARM single‑board computers (`deviceClass=raspberry`, `rewardWeight=0.75`),
- `gateway` – API gateway node (`deviceClass=server`, `rewardWeight=0.9`, `nodeRole=observer`).

These defaults influence:

- HTTP/P2P ports (per profile),
- whether the faucet is enabled by default on that profile,
- relative weight in the prototype uptime‑reward model (reported via `/api/status` as `rewardWeight`).

The node also tracks basic uptime metrics and a local reward estimate (based on
`rewardWeight` and `BULEN_BASE_UPTIME_REWARD`); these values are exposed in `/api/status`
and via Prometheus text metrics at `/metrics` for external tooling/alerting.

### Installation helpers and systemd units

For convenience, the repository includes basic installation helpers:

- `scripts/install_server_node.sh` – prepares a `server-full` node on a Debian/Ubuntu‑style server,
- `scripts/install_desktop_node.sh` – prepares a `desktop-full` node on a laptop/PC,
- `scripts/install_raspberry_node.sh` – prepares a `raspberry` profile node on Raspberry Pi / ARM SBC,
- `scripts/install_gateway_node.sh` – prepares a `gateway` node intended as HTTP API / explorer backend.

There are also example `systemd` unit templates:

- `scripts/systemd/bulennode-server.service` – for a server‑grade node under `/opt/bulencoin/bulennode`,
- `scripts/systemd/bulennode-raspberry.service` – for a Raspberry Pi node under `/home/pi/bulencoin/bulennode`.

These units expect environment variables (profile, security flags, peers) to be provided via
`/etc/default/bulennode-server` or `/etc/default/bulennode-raspberry`.

### Docker images (prototype)

For experimentation and local testing, you can build Docker images:

```bash
cd bulennode
docker build -t bulennode:dev .

cd ../explorer
docker build -t bulen-explorer:dev .
```

Example docker-compose setup can then wire `bulennode` and `explorer` together by pointing
`BULENNODE_API_BASE` at the node container.

Security‑related configuration (environment variables):

- `BULEN_REQUIRE_SIGNATURES` – when set to `true`, BulenNode requires each transaction to include:
  - `publicKey` (PEM‑encoded public key),
  - `signature` (base64, ECDSA over a canonical JSON payload),
  - `nonce` strictly increasing per account; unsigned or malformed transactions are rejected.
- `BULEN_P2P_TOKEN` – shared secret token; when set, P2P HTTP endpoints (`/p2p/tx`, `/p2p/block`) only accept requests that include the matching `x-bulen-p2p-token` header.
- `BULEN_ENABLE_FAUCET` – controls test faucet endpoint (`/api/faucet`); defaults to `true` in development and **must** be `false` in any semi‑public deployment.
- `BULEN_MAX_BODY_SIZE` – maximum JSON body size for API requests (default `128kb`).
- `BULEN_RATE_LIMIT_WINDOW_MS` / `BULEN_RATE_LIMIT_MAX_REQUESTS` – request limiter window (ms) and max burst per IP (default `15000` / `60`).
- `BULEN_STATUS_TOKEN` / `BULEN_METRICS_TOKEN` – optional shared secrets required in headers for `/api/status` and `/metrics` on public-facing hosts.
- `BULEN_REWARDS_HUB` / `BULEN_REWARDS_TOKEN` – optional telemetry target for uptime/stake reports (prototype rewards hub); set both to enable reporting.
- `BULEN_WEBHOOK_SECRET` – optional HMAC secret; when set, outgoing payment webhooks include header `x-bulen-signature` (sha256 HMAC of the JSON body).
- `BULEN_REWARDS_HMAC_SECRET` – optional HMAC secret for telemetry reports to rewards-hub (header `x-bulen-signature`).
- `BULEN_DEVICE_TOKEN` – optional token to protect `/api/device/battery`; in production a token is required if super-light mode is used.

Example usage (in another terminal):

```bash
curl -X POST http://localhost:4100/api/faucet \
  -H 'Content-Type: application/json' \
  -d '{"address":"alice","amount":10000}'

curl -X POST http://localhost:4100/api/faucet \
  -H 'Content-Type: application/json' \
  -d '{"address":"bob","amount":0}'

curl -X POST http://localhost:4100/api/transactions \
  -H 'Content-Type: application/json' \
  -d '{"from":"alice","to":"bob","amount":150,"fee":1}'
```

After one or two block intervals, the transaction will be included in a block and balances will update.

You can inspect node status at `http://localhost:4100/api/status`.

Key HTTP APIs (prototype):

- `GET /api/status` – node info, profile, reward weight, reward projection, peers, payments counters,
- `GET /api/blocks` / `GET /api/blocks/:height` – recent blocks and single block by height,
- `GET /api/accounts/:address` – balance/stake/nonce/reputation,
- `GET /api/mempool` – pending transactions,
- `POST /api/payments` + `GET /api/payments/:id` – invoice lifecycle (supports `webhookUrl`),
- `POST /api/payment-link` – BIP21-like link and QR code,
- `POST /api/rewards/estimate` – reward/loyalty projection (mirrors calculator on `/api/status`),
- `POST /api/wallets/challenge` / `POST /api/wallets/verify` – signed-message wallet login,
- `GET /metrics` – Prometheus metrics (optionally protected by `BULEN_METRICS_TOKEN`).

Metrics endpoint (Prometheus format):

- `GET /metrics` – exposes node info, height, mempool size, stake total, uptime, reward estimate, payments counts, rate‑limit config and protocol version. Useful for Prometheus scraping and Grafana dashboards.

Health and metadata endpoints:

- `GET /healthz` or `GET /api/health` – simple liveness probe for load balancers/monitors,
- `GET /api/info` – node metadata (version, profile, device class, security flags).

To connect multiple nodes together, start additional BulenNode instances with `BULEN_PEERS` pointing at other nodes, for example:

```bash
cd bulennode
PORT=4102 BULEN_HTTP_PORT=4102 BULEN_NODE_ID=node2 BULEN_PEERS=localhost:4100 npm start
```

### Rust prototype node

A minimal Rust rewrite prototype lives in `bulennode-rs/`. It exposes `/healthz`,
`/api/status`, `/api/blocks`, `/api/accounts/:address`, `/api/transactions` and
`/metrics`, with in-memory state and periodic block production.

Run it on a non-conflicting port:

```bash
cd bulennode-rs
cargo run
```

Environment variables: `BULEN_HTTP_PORT` (default `5100`), `BULEN_BLOCK_INTERVAL_MS`,
`BULEN_CHAIN_ID`, `BULEN_NODE_ID`.

## Running the block explorer

With a BulenNode running on `http://localhost:4100`, start the explorer:

```bash
cd explorer
npm install
npm start
```

Then open `http://localhost:4200` in your browser to see:

- latest blocks,
- individual block details,
- basic account information.

The explorer can be customised via environment variables:

- `BULENNODE_API_BASE` – base URL of the BulenNode API (default `http://localhost:4100/api`),
- `EXPLORER_PORT` – HTTP port (default `4200`),
- `EXPLORER_TITLE` – title/brand shown in the header,
- `EXPLORER_LOG_FORMAT` – morgan log format (default `dev`),
- `REWARDS_HUB_BASE` – base URL for the rewards leaderboard/badges (default `http://localhost:4400`).

Developer docs and SDKs:

- Cookbook: `docs/dev_cookbook.md` (payments, paywall, reward calc; Node/Go/Python).
- JS/TS: `sdk/` (`npm install bulencoin-sdk`).
- Rust: `sdk-rs/` crate `bulencoin-sdk` (blocking client, reqwest).
- Super-light mobile: profile `phone-superlight` + API `POST /api/device/battery` to sleep on low battery; status exposes `superLight`/`superLightSleeping`.
- Integration tests: run `node --test scripts/tests` (added webhook signature and super-light tests to increase coverage).

## Status aggregation service

The `status/` directory contains a small service that aggregates status information from
multiple BulenNode instances:

- `GET /status` – JSON with aggregated metrics and per-node entries,
- `GET /` – simple HTML summary by device class and node.

To run:

```bash
cd status
npm install
STATUS_PORT=4300 STATUS_NODES=http://localhost:4100/api/status npm start
```

Then open `http://localhost:4300` in your browser.

## Development, tests and contributions

See `CONTRIBUTING.md` for detailed contribution guidelines. In short:

- use Node.js 18+,
- for BulenNode:
  - `cd bulennode && npm install && node --test`,
- for explorer and status services:
  - `cd explorer && npm install`,
  - `cd status && npm install`,
- for a full stack via Docker:
  - `docker-compose up --build`.
- full-stack smoke test (BulenNode + Explorer + Status on test ports):
  - `node --test scripts/tests/full_stack_smoke.test.js`.
- security guardrails test (signatures required, P2P token, rate limiter):
  - `node --test scripts/tests/security_guardrails.test.js`.
- full-stack (payments + wallet + explorer + status):
  - `node --test scripts/tests/full_stack_integration_all.test.js`.
- 30s load test for BulenNode:
  - `node --test scripts/tests/node_load_30s.test.js`.
- payments and wallet integration API:
  - see `docs/payment_integration.md` for endpoints and sample flows.


## Next steps

- Implement the BulenNode client (networking, consensus, storage and wallet modules) according to `docs/bulencoin_spec_pl.md`.
- Follow `docs/deployment_guide.md` when planning testnet and mainnet infrastructure.
