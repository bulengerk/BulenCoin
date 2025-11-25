# BulenCoin developer cookbook

Krótkie przepisy „kopiuj i wklej” dla najczęstszych integracji. API jest stabilne na
ścieżkach `/api/payments`, `/api/payment-link`, `/api/rewards/estimate`,
`/api/status`, `/api/transactions`.

## 1) Mikropłatności (invoice + webhook)

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

## 2) Paywall w 15 minut (serwis WWW)

1. Tworzysz invoice w backendzie (`POST /api/payments` z `memo` = ID sesji/artykułu).
2. Frontend wyświetla link/QR z `/api/payment-link` dla `to/amount/memo`.
3. Backend subskrybuje webhook (`webhookUrl`) lub co 5s sprawdza `/api/payments/:id`.
4. Po statusie `paid` wpuszczasz użytkownika (cache sesji w Redisie na 10–15 min).

Minimalny handler (Node/Express):

```js
app.post('/paywall/start', async (req, res) => {
  const { articleId, wallet } = req.body;
  const inv = await sdk.createPayment({ to: wallet, amount: 3, memo: `article:${articleId}` });
  const link = await sdk.createPaymentLink({ address: inv.to, amount: inv.amount, memo: inv.memo });
  res.json({ paymentId: inv.id, link: link.link, qr: link.qrDataUrl });
});
```

## 3) Kalkulator nagród w backendzie

```python
import requests
resp = requests.post(
    "https://node.example/api/rewards/estimate",
    json={"stake": 2000, "uptimeHoursPerDay": 18, "days": 7, "deviceClass": "server"},
    timeout=5,
).json()
print(resp["projection"]["weekly"])
```

## 4) Paczki dla devów

- **NPM (JS/TS):** `npm install bulencoin-sdk` – patrz `sdk/README.md` (createPayment,
  verifyPayment, payment links, QR).
- **Rust crate:** `bulencoin-sdk` w katalogu `sdk-rs/` (blocking klient `reqwest`).
- **Super‑light mobile:** profil `phone-superlight` (`BULEN_NODE_PROFILE=phone-superlight`) +
  API `POST /api/device/battery {"level":0.12}` do usypiania przy niskiej baterii;
  status zwraca `superLight` i `superLightSleeping`.
- **Testy integracyjne:** `node --test scripts/tests` uruchamia zestaw smoke/load + nowe
  testy (HMAC webhook, super-light). Uruchamiaj je po większych zmianach API.
- **Rust async:** `AsyncBulenClient` w `sdk-rs` (Tokio) dla tych samych endpointów.
- **API REST:** dokument `docs/payment_integration.md`.

## 5) Bezpieczeństwo integracji

- Produkcyjnie ustaw `BULEN_REQUIRE_SIGNATURES`, `BULEN_P2P_TOKEN`,
  `BULEN_STATUS_TOKEN`/`BULEN_METRICS_TOKEN`, `BULEN_WEBHOOK_SECRET` (podpisuje webhooki
  HMAC) oraz TLS na reverse proxy.
- Testy e2e: `node --test scripts/tests/full_stack_integration_all.test.js`.
