# BulenCoin JS/TS SDK (prototype)

Lightweight helpers for merchants and wallets to create invoices, build payment links and
check payment status against a BulenNode instance.

## Install

```bash
npm install bulencoin-sdk
# or, using this repo directly:
# copy sdk/bulencoin-sdk.js and bulencoin-sdk.d.ts into your project
```

## Usage

```js
const { BulenSdk } = require('./sdk/bulencoin-sdk');
const sdk = new BulenSdk({ apiBase: 'http://localhost:4100/api' });

// Create an invoice with optional webhook URL
const payment = await sdk.createPayment({
  to: 'merchant-addr',
  amount: 25,
  memo: 'Order #1234',
  webhookUrl: 'https://merchant.example/webhooks/bulen',
});

// Build a payment link + QR (BIP21-like)
const link = sdk.buildPaymentLink({ to: payment.to, amount: payment.amount, memo: payment.memo });
const { qrDataUrl } = await sdk.createPaymentLink({
  address: payment.to,
  amount: payment.amount,
  memo: payment.memo,
});

// Check status
const status = await sdk.verifyPayment(payment.id);
console.log(status.paid, status.transactionId);
```

### Payment links (BIP21-style)

Format: `bulen:<address>?amount=<number>&memo=<optional>` – safe to encode in QR or use as
`href`.

### Webhooks (prototype)

When creating a payment, pass `webhookUrl`. BulenNode will POST `{ event: "payment.updated", payment: {...} }`
whenever the status changes (`pending` → `pending_block` → `paid` / `expired`).

## Note

This SDK is a prototype; adapt error handling, retries and security to your environment.

## Rust crate

A minimal blocking Rust client lives in `../sdk-rs/` (`bulencoin-sdk` crate) with the same
endpoints (payments, payment links/QR, status, reward estimates).
