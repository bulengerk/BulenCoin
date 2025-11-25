# BulenCoin payment & wallet integration API

This document describes the minimal HTTP flows to integrate BulenCoin as a payment method
and to authenticate wallets via signed messages.

## Base principles

- All amounts are plain numbers (no decimals in this prototype).
- Transactions may include an optional `memo` (max 256 chars) – use it to bind a payment to
  an order/invoice.
- Payments can optionally carry `webhookUrl` on invoice creation; the node will POST
  status updates to it.
- Payment links are BIP21-like (`bulen:<address>?amount=123&memo=xyz`) and can be built via
  `/api/payment-link` (returns link + QR).
- Production defaults enforce:
  - signatures on transactions,
  - faucet disabled,
  - P2P token required.

## Payment (invoice) flow

1. **Create invoice**

```
POST /api/payments
{
  "to": "merchant-address",
  "amount": 75,
  "memo": "order-123",        // optional, <=256 chars
  "expiresInSeconds": 900,    // optional, defaults to 15 minutes
  "webhookUrl": "https://merchant.example/webhooks/bulen" // optional
}
```

Response:

```
201 Created
{
  "id": "pay_xxx",
  "to": "merchant-address",
  "amount": 75,
  "memo": "order-123",
  "status": "pending",
  "webhookUrl": "https://merchant.example/webhooks/bulen",
  "createdAt": "...",
  "expiresAt": "..."
}
```

2. **User pays invoice**

- User sends a transaction to `to` with `amount >= invoice.amount` and the same `memo`
  (optional but recommended).

3. **Check status**

```
GET /api/payments/{id}
```

Statuses:

- `pending` – not seen yet,
- `pending_block` – in mempool, waiting for a block,
- `paid` – confirmed in a block (`transactionId`, `blockIndex` returned),
- `expired` – past `expiresAt` without matching payment.

Whenever status changes, BulenNode POSTs to `webhookUrl` (if provided):

```
POST <webhookUrl>
{
  "event": "payment.updated",
  "payment": { ...full payment object... }
}
```

If you set `BULEN_WEBHOOK_SECRET`, each webhook includes header `x-bulen-signature` with a
sha256 HMAC over the raw JSON body. Verify it server‑side to ensure authenticity.

Prototype note: without `BULEN_WEBHOOK_SECRET`, payloads are unsigned; protect the endpoint
with path secrets or allowlists. In production builds, when webhookUrl is used, the node
expects `BULEN_WEBHOOK_SECRET` and an HTTPS webhook URL (unless explicitly allowed via
`BULEN_ALLOW_INSECURE_WEBHOOKS=false` by default).

## Payment links and QR

Build BIP21-like link + QR in one call:

```
POST /api/payment-link
{
  "address": "merchant-address",
  "amount": 75,
  "memo": "order-123"
}
```

Response:

```
200 OK
{
  "ok": true,
  "link": "bulen:merchant-address?amount=75&memo=order-123",
  "qrDataUrl": "data:image/png;base64,..."
}
```

## Wallet authentication (signed-message)

1. **Request challenge**

```
POST /api/wallets/challenge
{
  "address": "addr_....",
  "publicKey": "<PEM>",
  "walletType": "metamask"    // optional label
}
```

Response includes `message` to sign and `id`.

2. **User signs the message** in their wallet (MetaMask/WalletConnect/Ledger, etc.).

3. **Verify signature**

```
POST /api/wallets/verify
{
  "challengeId": "<id>",
  "signature": "<base64_signature>"
}
```

Response returns `sessionId`, `address`, `expiresAt`.

4. **Validate session**

```
GET /api/wallets/session/{sessionId}
```

Returns the session if still valid; otherwise 404.

## Environment knobs

- `BULEN_REQUIRE_SIGNATURES=true` (default in production),
- `BULEN_ENABLE_FAUCET=false` (default in production),
- `BULEN_P2P_TOKEN` – required in production to accept P2P gossip.
- `BULEN_STATUS_TOKEN` / `BULEN_METRICS_TOKEN` – shared secrets for `/api/status` and `/metrics`
  when a node is reachable from the public Internet.
- `BULEN_REWARDS_HUB` / `BULEN_REWARDS_TOKEN` – optional telemetry target; unrelated to
  payments, but often deployed alongside gateways.
- `BULEN_WEBHOOK_SECRET` – when set, signs outgoing payment webhooks with `x-bulen-signature`
  (HMAC sha256 of the JSON body).

## Tests covering this API

- `scripts/tests/full_stack_integration_all.test.js` – full stack incl. payments + wallet
  sessions.
- `bulennode/test/payments_security.test.js` – invalid payloads, memo length.
- `bulennode/test/wallet_security.test.js` – invalid signature and replay protection.
- `scripts/tests/node_load_30s.test.js` – 30s load with periodic tx submissions.
