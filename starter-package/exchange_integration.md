# Integracja transakcyjna z giełdami

Przewodnik dla operatorów giełd (custodial) jak obsłużyć depozyty/wypłaty BulenCoin z użyciem istniejącego API BulenNode. Zakładamy, że giełda uruchamia własny węzeł (gateway) z wymuszonymi podpisami.

## Wymagania węzła (gateway)

- `requireSignatures=true`, `allowUnsignedBlocks=false`
- tokeny: `BULEN_P2P_TOKEN`, `BULEN_STATUS_TOKEN`, opcjonalnie `BULEN_METRICS_TOKEN`
- `BULEN_ENABLE_FAUCET=false` na hostach publicznych
- HTTPS/TLS na proxy, rate limiting + logowanie błędów

Kluczowe endpointy:

- `GET /api/status` – wysokość, finalizedHeight/hash, peers
- `GET /api/blocks?limit=N` – najnowsze bloki z transakcjami
- `GET /api/accounts/:address` – saldo/nonce konta
- `POST /api/transactions` – przyjęcie podpisanej transakcji (HTTP 202)
- Portfel (opcjonalnie, do generowania adresów depozytowych): `POST /api/wallets/create`

## Podpisy transakcji

Weryfikacja korzysta z secp256k1 i kanonicznego payloadu:

```json
{
  "chainId": "bulencoin-devnet-1",
  "from": "addr_x",
  "to": "addr_y",
  "amount": 123,
  "fee": 0,
  "nonce": 1,
  "action": "transfer",
  "memo": "optional",
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

Adres `from` musi wynikać z klucza publicznego (hash SHA256 → `addr_...`). Przykład podpisu w Node.js:

```js
const crypto = require('crypto');
const payload = JSON.stringify({...above});
const signer = crypto.createSign('sha256');
signer.update(payload); signer.end();
const signature = signer.sign(privateKeyPem, 'base64');
```

Żądanie `POST /api/transactions`:

```json
{
  "id": "tx-uuid",
  "chainId": "bulencoin-devnet-1",
  "from": "addr_x",
  "to": "addr_y",
  "amount": 123,
  "fee": 0,
  "nonce": 1,
  "publicKey": "-----BEGIN PUBLIC KEY----- ...",
  "signature": "base64..."
}
```

## Depozyty (on-chain → bilans w systemie)

1. **Adres depozytowy**: utwórz wallet przez `POST /api/wallets/create` (lub offline) i przypisz go do użytkownika.
2. **Nasłuch**: co 2–5 s pobieraj `GET /api/blocks?limit=K` (np. 50) lub subskrybuj własny watcher na RPC/WS, filtruj transakcje po `to == userAddress`.
3. **Potwierdzenia**: uznaj wpłatę gdy:
   - `block.index <= finalizedHeight` z `/api/status`, lub
   - `status.height - block.index >= minConfirmations`.
4. **Idempotencja**: zapisuj `txId` i `blockHash`; kredytuj konto użytkownika jednokrotnie.

## Wypłaty (bilans systemu → on-chain)

1. Pobierz `nonce` konta hot/warm z `GET /api/accounts/:address`.
2. Zbuduj transakcję:
   - `nonce = account.nonce + 1`
   - `fee` ≥ `mempoolMinFee` (sprawdź `config`)
   - `chainId` zgodny z węzłem
3. Podpisz payload (jak wyżej) swoim kluczem wypłat.
4. `POST /api/transactions` i zachowaj `txId`.
5. Polling statusu: `GET /api/blocks?limit=K` aż `txId` znajdzie się w bloku; uznaj wypłatę po finalizacji (patrz wyżej).

## Webhook (opcjonalnie)

Jeśli chcesz powiadamiać core giełdy, dodaj prosty serwis-watcher:

- Polluje `/api/blocks?limit=K`.
- Dla nowych transakcji na obserwowane adresy wysyła `POST https://exchange.example/webhooks/deposit` z payloadem:

```json
{
  "txId": "tx-123",
  "address": "addr_user",
  "amount": 123,
  "asset": "BULCO",
  "blockHeight": 456,
  "finalized": true
}
```

- Dodaj nagłówek HMAC: `x-bulen-signature: sha256=...` liczone z klucza współdzielonego.

## Przykłady cURL

**Status / finalizacja**
```bash
curl -H "x-bulen-status-token: $STATUS_TOKEN" http://127.0.0.1:4100/api/status
```

**Saldo + nonce**
```bash
curl http://127.0.0.1:4100/api/accounts/addr_x
```

**Wysyłka podpisanej transakcji**
```bash
curl -X POST http://127.0.0.1:4100/api/transactions \
  -H "Content-Type: application/json" \
  -d @signed_tx.json
```

## Dobre praktyki operacyjne

- Oddziel hot/warm/cold wallet, limituj dzienną kwotę wypłat i licz transakcji.
- Monitoruj `finalizedHeight` vs `height`; alarmuj, gdy finalizacja stoi lub węzeł odstaje od reszty peers.
- Ustaw rate limiting na publicznych endpointach, a P2P token/handshake dla ruchu P2P.
- Regularnie rotuj klucze API do webhooków, trzymaj prywatne klucze w HSM/TPM lub air-gapped signerze.
