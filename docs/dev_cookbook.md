# BulenCoin developer cookbook

Short, copy-paste friendly recipes for common integrations. Stable APIs: `/api/payments`, `/api/payment-link`, `/api/rewards/estimate`, `/api/status`, `/api/transactions`.

## 1) Micropayments (invoice + webhook)

### Node.js (fetch / bulencoin-sdk)

```js
import { BulenSdk } from 'bulencoin-sdk';

const sdk = new BulenSdk({ apiBase: 'https://node.example/api' });

const payment = await sdk.createPayment({
  to: 'merchant-addr',
  amount: 15,
  memo: 'order-42',
  webhookUrl: 'https://merchant.example/webhooks/bulen',
});

// show QR / link
const { link, qrDataUrl } = await sdk.createPaymentLink({
  address: payment.to,
  amount: payment.amount,
  memo: payment.memo,
});

// later: check status
const status = await sdk.verifyPayment(payment.id);
console.log(status.status, status.transactionId);
```

### Go (standard library)

```go
payload := []byte(`{"to":"merchant-addr","amount":15,"memo":"order-42"}`)
req, _ := http.NewRequest("POST", "https://node.example/api/payments", bytes.NewReader(payload))
req.Header.Set("Content-Type", "application/json")
resp, err := http.DefaultClient.Do(req)
if err != nil { log.Fatal(err) }
defer resp.Body.Close()
var payment struct{ Id, Status, ExpiresAt string }
json.NewDecoder(resp.Body).Decode(&payment)
```

### Python (requests)

```python
import requests
payment = requests.post(
    "https://node.example/api/payments",
    json={"to": "merchant-addr", "amount": 15, "memo": "order-42"},
    timeout=5,
).json()
status = requests.get(f"https://node.example/api/payments/{payment['id']}", timeout=5).json()
print(status["status"], status.get("transactionId"))
```

## 2) 15-minute paywall (web backend)

1. Create an invoice in the backend (`POST /api/payments`, memo = session/article ID).
2. Frontend shows link/QR from `/api/payment-link` for that `to/amount/memo`.
3. Backend either listens on `webhookUrl` or polls `/api/payments/:id` every 5s.
4. After status `paid`, grant access (cache session in Redis for 10–15 minutes).

Minimal handler (Node/Express):

```js
app.post('/paywall/start', async (req, res) => {
  const { articleId, wallet } = req.body;
  const inv = await sdk.createPayment({ to: wallet, amount: 3, memo: `article:${articleId}` });
  const link = await sdk.createPaymentLink({ address: inv.to, amount: inv.amount, memo: inv.memo });
  res.json({ paymentId: inv.id, link: link.link, qr: link.qrDataUrl });
});
```

## 3) Reward calculator in backend

```python
import requests
resp = requests.post(
    "https://node.example/api/rewards/estimate",
    json={"stake": 2000, "uptimeHoursPerDay": 18, "days": 7, "deviceClass": "server"},
    timeout=5,
).json()
print(resp["projection"]["weekly"])
```

## 4) Packages for developers

- **NPM (JS/TS):** `npm install bulencoin-sdk` – see `sdk/README.md` (createPayment, verifyPayment, payment links, QR).
- **Rust crate:** `bulencoin-sdk` in `sdk-rs/` (`reqwest` blocking client, async variant available with Tokio).
- **Super-light mobile:** profile `phone-superlight` (`BULEN_NODE_PROFILE=phone-superlight`) + API `POST /api/device/battery {"level":0.12}` to sleep on low battery; status shows `superLight` and `superLightSleeping`.
- **Integration tests:** `node --test scripts/tests` runs smoke/load + webhook HMAC + super-light suites. Run after API changes.
- **REST reference:** `docs/payment_integration.md`.

## 5) Integration security

- Production: set `BULEN_REQUIRE_SIGNATURES`, `BULEN_P2P_TOKEN`, `BULEN_STATUS_TOKEN`/`BULEN_METRICS_TOKEN`, `BULEN_WEBHOOK_SECRET` (signs webhook HMAC) and TLS via reverse proxy.
- End-to-end tests: `node --test scripts/tests/full_stack_integration_all.test.js`.
