# Operator Runbook (walidator / gateway)

## Konfiguracja bezpieczeństwa
- Włącz twarde domyślne: `BULEN_SECURITY_PRESET=strict` (wymusza podpisy, blokuje faucet, wymaga tokenów status/metrics/P2P).
- Ustaw tajne wartości: `BULEN_P2P_TOKEN`, `BULEN_STATUS_TOKEN`, `BULEN_METRICS_TOKEN`, opcjonalnie `BULEN_WEBHOOK_SECRET`.
- Jeśli wystawiasz P2P/HTTP publicznie, ustaw `BULEN_P2P_REQUIRE_TLS=true` i podaj certyfikat (`BULEN_P2P_TLS_KEY_FILE`, `BULEN_P2P_TLS_CERT_FILE`).
- Profil serwera: `BULEN_NODE_PROFILE=server-full` (domyślnie porty 4100/4101).
- Nagrody są autonomiczne: `BULEN_ENABLE_PROTOCOL_REWARDS` domyślnie włączone, `BULEN_BLOCK_PRODUCER_FRACTION` ustala udział producenta, reszta puli walidatorów trafia proporcjonalnie do stake.

Przykład startu walidatora (systemd lub shell):
```bash
export BULEN_SECURITY_PRESET=strict BULEN_P2P_TOKEN="p2p-secret" \
  BULEN_STATUS_TOKEN="status-secret" BULEN_METRICS_TOKEN="metrics-secret" \
  BULEN_NODE_PROFILE=server-full BULEN_ENABLE_PROTOCOL_REWARDS=true \
  BULEN_BLOCK_REWARD=10 BULEN_FEE_BURN_FRACTION=0.3 BULEN_FEE_ECOSYSTEM_FRACTION=0.1 \
  BULEN_BLOCK_PRODUCER_FRACTION=0.4
node src/index.js
```

## Obserwacja i alerty
- Status: `curl -H "x-bulen-status-token: <token>" http://host:4100/api/status`
  - Kluczowe pola: `height`, `bestChainWeight`, `finalizedHeight`, `mempoolSize`, `peers`, `monetary.*` (burn, pula ekosystemowa, emisja blokowa).
- Prometheus: `curl -H "x-bulen-metrics-token: <token>" http://host:4100/metrics`
  - Alerty sugerowane:
    - brak wzrostu `bulen_blocks_height` lub `bulen_chain_weight` > 2× interwał bloku,
    - `bulen_blocks_finalized_height` nie rośnie przez kilka okien finalizacji,
    - wzrost `bulen_slash_events_total`,
    - `bulen_mempool_size` blisko limitu.

## Kopie i przywracanie
- Dane węzła: `data/<profil>` (domyślnie). Przed kopią zatrzymaj proces; kopiuj katalog lub wykonaj snapshot dysku.
- Przywracając, zadbaj o zgodność `chainId` i wersji protokołu (`BULEN_PROTOCOL_VERSION`).

## Rotacja i aktualizacje
- Rolling restart: (1) usuń z LB/obniż monitor, (2) `systemctl stop bulennode`, (3) deploy binarki/kodu, (4) `systemctl start bulennode`, (5) sprawdź `/healthz`, `/api/status`, `finalizedHeight`.
- Po aktualizacji parametrów nagród/fee burn zweryfikuj w `/api/status` sekcję `monetary` oraz w `/metrics` nowe wartości.

## Twardnienie w praktyce
- Reverse proxy (nginx/caddy) z TLS, limiterem IP i nagłówkami bezpieczeństwa; trzymać HTTP API na `/api/*`, P2P na osobnym porcie.
- Firewalle: otwarte tylko porty P2P/HTTP potrzebne dla roli (validator/gateway).
- Klucze i sekrety trzymać w `EnvironmentFile=/etc/default/bulennode-server` z uprawnieniami 640, właściciel root + grupa bulen.

## Szybka diagnostyka
- Sprawdź finalność: `finalizedHeight` w `/api/status` oraz `bulen_blocks_finalized_height` w `/metrics`.
- Walidacja configu: `/api/info` zwraca `securityPreset`, `requireSignatures`, `enableProtocolRewards`, `p2pHandshakeRequired`, `p2pTlsEnabled`.
- Jeśli węzeł nie produkuje bloków: upewnij się, że `nodeRole=validator`, jest stake na adresie `nodeId`, mempool ma transakcje i blokada P2P (token/TLS) nie odcina peerów.
