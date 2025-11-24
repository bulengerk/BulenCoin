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
  - `status/` – status aggregation service that polls multiple BulenNode instances.
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
- `POST /api/transactions` – submit a transaction,
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
- `BULEN_TELEMETRY_ENABLED` – reserved for future telemetry; the prototype does not send
  any telemetry.

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

# 7. Legal and compliance notes (high‑level)

The repository itself:

- does not ship a live token or token sale,
- does not promise profit or returns,
- provides an experimental protocol design and prototype implementations only.

Operating a production network, exchanges, custodial wallets or user‑facing services may
be regulated in your jurisdiction (MiCA, AML, local financial‑services law, tax law, GDPR).

Before running a production BulenCoin network or offering services on top of it, obtain
qualified legal and tax advice. The authors of this project and this repository do not
provide legal, financial or tax advice.

