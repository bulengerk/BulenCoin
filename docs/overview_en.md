---
title: BulenCoin – technical overview (EN)
language: en
---

BulenCoin is a lightweight Proof of Stake experiment focused on wide accessibility:
demonstrating that a modern blockchain network can be maintained by a wide range of
hardware, from smartphones and tablets to laptops, desktops and servers.

# 1. High‑level goals

- Lightweight enough to run on end‑user devices in the background.
- Economically meaningful rewards for keeping real nodes online.
- Support for multiple node types:
  - mobile light nodes,
  - full desktop/server nodes,
  - gateway nodes,
  - ultra‑light wallet‑only clients.

# 2. Consensus and rewards (summary)

- Proof of Stake with randomly selected validator committees.
- Users lock BulenCoin as stake to participate in block production and voting.
- In each slot, a block producer and a committee of validators are chosen based on:
  - stake,
  - device type,
  - uptime history and reputation.
- Reward model:
  - block rewards and transaction fees for producers and committee members,
  - explicit uptime rewards:
    - proportional to stake,
    - adjusted by device‑class coefficients (servers, desktops, Raspberry‑class nodes,
      tablets, phones),
    - influenced by measured uptime and reputation.

# 3. Node types

- **Mobile light node** – stores headers and a small portion of state, runs on phones and
  tablets; battery‑ and data‑aware operation.
- **Desktop/server full node** – stores full history and state; validates all blocks and
  serves light clients.
- **Gateway node** – full node with HTTP/WebSocket APIs for wallets, explorers, exchanges.
- **Ultra‑light wallet node** – only a wallet, without consensus or uptime rewards.

# 4. Prototype implementation

The Node.js prototype in this repository is **not** a full production client, but it
implements:

- simple block and account storage,
- transaction validation (balance + nonce),
- periodic block production from a mempool,
- HTTP API for status, blocks, accounts and transactions,
- basic P2P over HTTP with an optional shared token,
- a block explorer and a status aggregation service,
- a basic uptime‑reward estimation model based on device class and uptime.

For the full, precise protocol description, refer to `docs/bulencoin_spec_pl.md`.

# 5. Token economics (policy draft)

- **Inflation schedule (minted per epoch):** 8% year 1 → 6% year 2 → 4% year 3 → 2.5% year 4 → 1.5% year 5+, with parameterised decay so future governance can fine‑tune within a capped band.
- **Block reward split:** 60% to validators/committee by stake weight, 20% to uptime/loyalty pool (device/uptime boosts), 20% to an ecosystem pool (time‑locked, multi‑sig, transparently reported).
- **Transaction fees:** 30% burned to counter inflation, 60% shared with the active validator set, 10% sent to the ecosystem pool.
- **Payout cadence and comms:** testnet payouts simulated daily (low stakes) to exercise tooling; mainnet payouts settle per epoch (~weekly) after finality. Public dashboards and a published calendar announce epoch numbers, payout dates, fee burn totals and ecosystem pool balances so operators know when to expect rewards.

# 6. Fiat on/off‑ramp (where legally possible)

- **Integration path:** partner on/off‑ramps or voucher-style redemptions; clearly segregate KYC/AML duties to partners and keep BulenCoin apps non-custodial.
- **Fallback for non‑crypto users:** testnet app ships with a “demo points” faucet/purchase flow (no KYC, no real value) so new users can play without touching fiat/crypto.
- **Compliance note:** any real on/off‑ramp requires jurisdiction‑specific legal review; keep the core client open, non‑custodial and able to disable the ramp in restricted regions.

# 7. Super‑light mobile profile

- `phone-superlight` profile keeps only headers + recent blocks (snapshot + small window), observer role, reward weight 0.35.
- Super‑light mode can be put to sleep on low battery via `POST /api/device/battery { level: 0.12 }` (threshold configurable); quickly resumes without replaying the whole chain.
- Disk/RAM is minimal thanks to aggressive pruning of finalized blocks; intended for “always-on” background presence on phones.

# 8. Integration tests (coverage boost)

- Full stack: `node --test scripts/tests/full_stack_smoke.test.js` (node + explorer + status).
- Payments + wallet + explorer + status: `node --test scripts/tests/full_stack_integration_all.test.js`.
- Load: `node --test scripts/tests/node_load_30s.test.js`.
- **New:** `scripts/tests/payment_webhook_signature.test.js` (HMAC webhooks).
- **New:** `scripts/tests/superlight_mobile.test.js` (super-light battery sleep/resume).
