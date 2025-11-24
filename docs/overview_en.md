---
title: BulenCoin – technical overview (EN)
language: en
---

BulenCoin is a meme‑style cryptocurrency project with a serious engineering objective:
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

