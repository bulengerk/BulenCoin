# BulenCoin – pakiet startowy

Zebrane najważniejsze materiały dla operatorów i integratorów.

- **Pełna dokumentacja:** `docs/README.md` w repo (deployment, security, runbooki, manifesty).
- **Integracja z giełdami:** `starter-package/exchange_integration.md` (kopiowany z `docs/exchange_integration.md`).
- **Upgrade/rollback:** `docs/upgrade_runbook.md` (+ podpisy wydań: `docs/genesis_and_release_signing.md`).

## Status sieci
- **Testnet:** publiczny/prototypowy, docelowo z `BULEN_SECURITY_PRESET=strict`, faucet off, wymagane tokeny na status/metrics/P2P. Lokalnie: `docker-compose up` z root `docker-compose.yml`, potem `http://localhost:4100/api/status`.
- **Mainnet:** jeszcze nieuruchomiony; plan po audycie/bug bounty (patrz `docs/tokenomics_and_roadmap.md`, sekcja roadmap).

## Parametry tokenów
- **BULCO (native, gaz/stake):** inflacja propozycja 8% (rok 1) → 6% → 4% → 2.5% → 1.5% (rok 5+). Domyślny block reward w strict: `BULEN_BLOCK_REWARD=10`; fee split: burn 30% (`BULEN_FEE_BURN_FRACTION=0.3`), ecosystem 10% (`BULEN_FEE_ECOSYSTEM_FRACTION=0.1`), reszta dla producenta/validatorów (`BULEN_BLOCK_PRODUCER_FRACTION=0.4`).
- **BULCOS (stable asset):** tylko mint/burn przez issuer multi-sig. Twarde limity z env: `BULCOS_SUPPLY_CAP`, `BULCOS_DAILY_MINT_CAP`, minimalny stosunek rezerw `BULCOS_MIN_RESERVE_RATIO`, pauza przy starych oraklach `BULCOS_PAUSE_ON_ORACLE_STALE`. Peg 1:1 fiat (domyślnie), rezerwy/attestacje + orakle (patrz `way_of_stable` i `bulennode/src/config.js`).

## Węzeł referencyjny (gateway z TLS + limitami)
- **Sprzęt min.:** 2 vCPU, 4 GB RAM, 40 GB SSD/NVMe (rekomendacja: 4 vCPU, 8 GB, 80 GB).
- **Uruchomienie:** na czystym Ubuntu/Debian: `./scripts/install_gateway_node.sh` (instaluje Node 18+, deps). Włącz za reverse proxy z TLS (nginx/caddy + certbot), faucet wyłączony.
- **Szablony:** env w `bulennode/.env.gateway.example`; systemd w `scripts/systemd/bulennode-gateway.service` (podmień ścieżki i skopiuj do `/etc/systemd/system/`).
- **Env (przykład produkcyjny):**
  ```bash
  export NODE_ENV=production
  export BULEN_NODE_PROFILE=gateway
  export BULEN_REQUIRE_SIGNATURES=true
  export BULEN_ENABLE_FAUCET=false
  export BULEN_P2P_TOKEN="strong-shared-secret"
  export BULEN_STATUS_TOKEN="status-secret"
  export BULEN_METRICS_TOKEN="metrics-secret"
  export BULEN_RATE_LIMIT_WINDOW_MS=10000
  export BULEN_RATE_LIMIT_MAX_REQUESTS=20
  export BULEN_CORS_ORIGINS="https://explorer.<twoj-domena>"
  export BULEN_HTTP_PORT=4130
  export BULEN_P2P_PORT=4131
  npm start
  ```
- **Proxy/TLS:** w nginx/caddy ustaw HTTPS, per-IP rate limit, nagłówki bezpieczeństwa; ogranicz otwarte porty do 80/443 (+ ewentualnie P2P), dodaj tokeny do nagłówków dla `/api/status`/`/metrics` jeśli chronisz je na warstwie proxy.

## Eksplorator / status / gateway
- **Explorer:** katalog `explorer/`, domyślnie `http://localhost:4200` (Docker Compose). Podaj swój gateway w `EXPLORER_API_BASE` lub zmień `BULENNODE_API_BASE` w środowisku.
- **Status:** serwis `status/`, konfiguracja `STATUS_NODES="https://api.<domain>/api/status,..."`, widok HTML/JSON pod `/status` (domyślnie `http://localhost:4300/status`).
- **Publiczny gateway:** brak opublikowanego endpointu w repo. Uruchom profil `gateway` (`BULEN_NODE_PROFILE=gateway`) za reverse proxy z TLS. Wymagane tokeny: `BULEN_STATUS_TOKEN`, `BULEN_METRICS_TOKEN`, opcjonalnie `BULEN_P2P_TOKEN`. Przykład sprawdzenia:
  - `curl -H "x-bulen-status-token: $BULEN_STATUS_TOKEN" https://api.<domain>/api/status`
  - `curl -H "x-bulen-metrics-token: $BULEN_METRICS_TOKEN" https://api.<domain>/metrics`
- **Publiczne URL-e (wstaw realne, gdy dostępne):**
  - Gateway/API: `https://api.<twoj-domena>` (token status: `<STATUS_TOKEN>`, metrics: `<METRICS_TOKEN>`)
  - Explorer: `https://explorer.<twoj-domena>` (kieruje na powyższy gateway)
  - Status: `https://status.<twoj-domena>/status` (agreguje np. `https://api.<twoj-domena>/api/status|x-bulen-status-token:<STATUS_TOKEN>`)

## TODO przy wdrożeniu
- Wygeneruj i wstaw rzeczywiste tokeny: `BULEN_STATUS_TOKEN`, `BULEN_METRICS_TOKEN`, opcjonalnie `BULEN_P2P_TOKEN`.
- Uzupełnij realne URL-e gatewaya/API, explorera i statusu w sekcji powyżej oraz w zmiennych środowisk `EXPLORER_API_BASE` i `STATUS_NODES`.
- Skonfiguruj reverse proxy (TLS, rate limit, nagłówki tokenów) zgodnie z `docs/prod_manifests.md` / `docs/multi_host_deployment_runbook.md`.
- Zweryfikuj `curl` do `/api/status` i `/metrics` z tokenami po wystawieniu usług.

## Parametry listingu (sugerowane)
- **Konfirmacje:** przyjmij finalizację lub min. 6 bloków po włączeniu transakcji do łańcucha (wybierz ostrzejsze z dwóch).
- **Minimalny depozyt:** BULCO ≥ 1; BULCOS ≥ 1 (dostosuj do kosztów operacyjnych).
- **Minimalna wypłata:** BULCO ≥ 2; BULCOS ≥ 2; odrzuć mniejsze żądania w UI/REST.
- **Rekomendowane fee:** 1–2 BULCO dla ruchu normalnego; podnieś gdy mempool rośnie lub rate-limit aktywny.
- **Obsługiwane assety:** BULCO – transfer + stake (fees/stake w BULCO); BULCOS – tylko transfer (mint/burn po stronie issuer, brak fee/stake w BULCOS).

## Runbook operacyjny (skrót)
- **Monitoring:** sprawdzaj `/api/status` (wysokość, finalizedHeight, peers), lag finality (<3 bloki w stosunku do leaders), metryki `/metrics` (HTTP 5xx, mempool, rate-limit). Ustaw scrape/alerty z `docs/prometheus_alerts.yml`.
- **Alerty kluczowe:** brak wzrostu height/finality >5 min; różnica height między węzłami >5; wzrost 5xx/429; wysoki mempool / brak peers; utrata zdrowia orakli (jeśli BULCOS); brak odpowiedzi statusu.
- **Maintenance okna:** ogłaszaj z wyprzedzeniem; przed startem snapshot danych, po restarcie weryfikacja `/api/status` (height rośnie, finalizedHeight nie spadł, snapshotHash stabilny); trzymać co najmniej jeden węzeł w górze, jeśli sieć >=2 węzły.
- **Backup/rollback:** cykliczny backup `data/` (np. tar + wersjonowanie w S3); przed upgrade snapshot on-demand; rollback = stop → przywróć backup → start + weryfikacja height/finality (patrz `docs/upgrade_runbook.md`).
- **Polityka kluczy:** klucze issuer/oracle/offline w HSM/air-gap; podpisy offline lub przez HSM proxy; rotacja cykliczna (np. ≤90 dni) z publikacją eventu; dzienne limity operacji mint/burn (BULCOS) i wypłat; dostęp kluczy segregowany (treasury vs ops).

## Komunikacja i go-live
- **Kanał + on-call:** dedykowany Slack/Telegram z zespołem integracji; on-call w oknie wdrożenia z czasem reakcji <15 min; wcześniej ustal dane kontaktowe/klucze do szybkiej weryfikacji.
- **Sandbox/testnet:** wystaw testnet gateway z faucetem (tylko testnet), te same tokeny/limity bezpieczeństwa; udostępnij operatorom endpointy + testowe adresy.
- **Checklist go-live:** endpointy produkcyjne (API/status/metrics) działają z TLS; tokeny (`BULEN_P2P_TOKEN`, `BULEN_STATUS_TOKEN`, `BULEN_METRICS_TOKEN`, webhook secret) ustawione i przetestowane; IP whitelist na proxy/firewall; rate limits włączone (`BULEN_RATE_LIMIT_WINDOW_MS`, `BULEN_RATE_LIMIT_MAX_REQUESTS` + limity w nginx/caddy); faucet off; CORS ograniczony; monitoring/alerty aktywne; curl healthcheck wykonany.

## Audyt / compliance (skrót DD)
- **Model prawny:** brak smart‑contractów; natywny klient + stable asset BULCOS mint/burn tylko przez issuer (multi-sig, allowlist).
- **KYC/AML:** emitent/custodian dla BULCOS prowadzi KYC/AML na wejściu/wyjściu (mint/redeem); gateway API dla mint/redeem zabezpieczony tokenem/allowlistą/ew. jurysdykcją.
- **Kod:** otwarty w repo Git (`https://.../BulenCoin`, JS prototyp + wczesny Rust); brak zamkniętych binariów.
- **Audyt:** jeśli dostępny, dołącz raport(y) z audytu/pen-testu; jeśli brak – status „w toku”/„niezrealizowany” i plan (np. po testnecie przed mainnetem).
- **Dane i prywatność:** publiczne dane łańcucha; logi gatewaya traktowane jako dane osobowe (IP/UA), rotacja/logrotate, minimalizacja logów (patrz `docs/security_hardening_pl.md`).

## SDK / próbki (JS + Python)
- **JS – offline adres + podpis (secp256k1):**
  ```js
  const crypto = require('crypto');
  const apiBase = 'https://api.<twoj-domena>/api';
  const statusToken = process.env.BULEN_STATUS_TOKEN || 'status-secret';

  // Adres z pary kluczy
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'secp256k1' });
  const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' });
  const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' });
  const address = 'addr_' + crypto.createHash('sha256').update(publicKeyPem).digest('hex').slice(0, 40);

  // Podpis transakcji (wypłata)
  const tx = {
    id: 'tx-' + crypto.randomUUID(),
    chainId: 'bulencoin-devnet-1',
    from: address,
    to: 'addr_recipient',
    amount: 123,
    fee: 1,
    nonce: 1,
    action: 'transfer',
    memo: 'withdrawal-123',
    timestamp: new Date().toISOString(),
  };
  const payload = JSON.stringify(tx);
  const signature = crypto.createSign('sha256').update(payload).sign(privateKeyPem, 'base64');
  const signedTx = { ...tx, publicKey: publicKeyPem, signature };

  // Submit
  await fetch(`${apiBase}/transactions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(signedTx),
  });

  // Polling status/blocks
  const status = await fetch(`${apiBase}/status`, { headers: { 'x-bulen-status-token': statusToken } }).then((r) => r.json());
  const blocks = await fetch(`${apiBase}/blocks?limit=5`, { headers: { 'x-bulen-status-token': statusToken } }).then((r) => r.json());
  ```
- **JS – weryfikacja webhooka (HMAC SHA256, nagłówek `x-bulen-signature`):**
  ```js
  const crypto = require('crypto');
  const secret = process.env.BULEN_WEBHOOK_SECRET;
  const body = req.rawBody; // pobierz surowe body JSON
  const given = req.headers['x-bulen-signature'] || '';
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
  const ok =
    given.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(given, 'hex'), Buffer.from(expected, 'hex'));
  if (!ok) return res.status(401).end();
  ```
- **Python – adres + podpis (wymaga `pip install ecdsa requests`):**
  ```python
  import hashlib, json, requests, hmac
  from ecdsa import SigningKey, SECP256k1

  api = "https://api.<twoj-domena>/api"
  status_token = "status-secret"

  sk = SigningKey.generate(curve=SECP256k1)
  vk = sk.get_verifying_key()
  pub_pem = vk.to_pem()
  priv_pem = sk.to_pem()
  addr = "addr_" + hashlib.sha256(pub_pem).hexdigest()[:40]

  tx = {
      "id": "tx-python-1",
      "chainId": "bulencoin-devnet-1",
      "from": addr,
      "to": "addr_recipient",
      "amount": 123,
      "fee": 1,
      "nonce": 1,
      "action": "transfer",
      "memo": "withdrawal-xyz",
      "timestamp": "2025-01-01T00:00:00.000Z",
  }
  payload = json.dumps(tx, separators=(',', ':')).encode()
  signature = sk.sign_deterministic(payload, hashfunc=hashlib.sha256)
  signed_tx = {**tx, "publicKey": pub_pem.decode(), "signature": signature.hex()}
  requests.post(f"{api}/transactions", json=signed_tx)

  status = requests.get(f"{api}/status", headers={"x-bulen-status-token": status_token}).json()
  blocks = requests.get(f"{api}/blocks?limit=5", headers={"x-bulen-status-token": status_token}).json()

  # Webhook HMAC check
  body = b'{"event":"payment.updated","payment":{...}}'
  sig = "hex_from_header"
  expected = hmac.new(b"webhook-secret", body, hashlib.sha256).hexdigest()
  assert hmac.compare_digest(sig, expected)
  ```
- **Gotowe cURL:**
  - Utworzenie walleta:  
    `curl -X POST https://api.<domain>/api/wallets/create -H "content-type: application/json" -d '{"label":"ops","passphrase":"strong-passphrase"}'`
  - Status z tokenem:  
    `curl -H "x-bulen-status-token: $BULEN_STATUS_TOKEN" https://api.<domain>/api/status`
  - Ostatnie bloki:  
    `curl -H "x-bulen-status-token: $BULEN_STATUS_TOKEN" "https://api.<domain>/api/blocks?limit=5"`
  - Zgłoszenie podpisanej transakcji (zakładamy `tx.json` z polami `publicKey`/`signature`):  
    `curl -X POST https://api.<domain>/api/transactions -H "content-type: application/json" --data-binary @tx.json`
  - Płatność z webhookiem:  
    `curl -X POST https://api.<domain>/api/payment-link -H "content-type: application/json" -d '{"address":"addr_...","amount":50,"memo":"order-123","webhookUrl":"https://merchant.example/webhooks/bulen"}'`

## Szybkie ścieżki
- Onboarding/operators: `docs/onboarding_quickstart.md`, `docs/deployment_guide.md` / `docs/deployment_guide_en.md`.
- Parametry ekonomiczne i roadmap: `docs/tokenomics_and_roadmap.md`, `docs/rewards_policy.md`.
- Monitoring/alerts: `docs/metrics.md`, `docs/prometheus_alerts.yml`, `docs/grafana-dashboard.json`.
