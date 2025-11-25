# Tokenomics i roadmap BulenCoin

## Założenia
- lekki łańcuch dostępny na urządzeniach końcowych, ale z realną motywacją ekonomiczną dla operatorów,
- przejrzyste źródła inflacji i dystrybucji nagród,
- proste parametry, które można stroić na testnecie bez zmiany protokołu.

## Emisja i nagrody
- Harmonogram inflacji (propozycja): 8% w roku 1 → 6% w roku 2 → 4% w roku 3 → 2.5% w roku 4 → 1.5% w roku 5+. Parametr decay można stroić w ramach zatwierdzonego przedziału.
- Blokowa nagroda bazowa (`BULEN_BLOCK_REWARD`, domyślnie 10 w trybie `BULEN_SECURITY_PRESET=strict`, 0 w dev) trafia do producenta bloku.
- Uptime/loyalty: obecnie symulowane lokalnie (kalkulator w `/api/status`), docelowo do przeniesienia on‑chain po stabilizacji parametrów.
- Podział nagród jest **w pełni autonomiczny** – w każdym bloku `BULEN_ENABLE_PROTOCOL_REWARDS=true` dzieli opłaty i nagrodę blokową bez akcji administracyjnych.

## Opłaty transakcyjne (fee burn)
- Domyślny podział opłat w prototypie: 30% burn (`BULEN_FEE_BURN_FRACTION=0.3`), 10% do puli ekosystemowej (`BULEN_FEE_ECOSYSTEM_FRACTION=0.1`), 60% do puli walidatorów.
- Pula walidatorów jest rozdzielana automatycznie: `BULEN_BLOCK_PRODUCER_FRACTION` (domyślnie 0.4) dla producenta bloku, reszta proporcjonalnie do stake wszystkich walidatorów (delegujących/utrzymujących stake).
- Wszystkie wartości są parametryzowane zmiennymi środowiskowymi; suma frakcji nie może przekroczyć 1.0.
- Suma spalonych opłat, pula ekosystemowa i łączna emisja blokowa są raportowane w `/api/status` (`monetary.*`) oraz w `/metrics` (`bulen_fee_burned_total`, `bulen_ecosystem_pool`, `bulen_rewards_minted_total`, `bulen_block_reward`).

## Slashing i kary
- Za equivocation (podpis dwóch bloków na tym samym wysokości) stosowany jest domyślnie `BULEN_SLASH_PENALTY=0.25` (25% stake walidatora) + spadek reputacji.
- Kary są naliczane w stanie węzła i eksportowane w `/metrics` (licznik `bulen_slash_events_total`).

## Roadmap (propozycja)
1. **Devnet** – częste zmiany, faucet domyślnie włączony, brak gwarancji finalności.
2. **Publiczny testnet** – `BULEN_SECURITY_PRESET=strict`, blokowanie faucet, obowiązkowe podpisy, stałe P2P tokeny, monitorowanie i dashboardy; stabilizacja parametrów fee burn i nagród.
3. **Audyt** – przegląd kodu (konsensus, P2P, podpisy, walidacja transakcji), fuzzing i testy obciążeniowe.
4. **Mainnet** – zamrożenie parametrów na start (emisja, fee burn, nagroda blokowa), publikacja polityki zmian oraz kalendarza wypłat.

## Parametry produkcyjne – szybki start
```bash
export BULEN_SECURITY_PRESET=strict \
  BULEN_P2P_TOKEN="strong-shared-secret" \
  BULEN_STATUS_TOKEN="status-secret" \
  BULEN_METRICS_TOKEN="metrics-secret" \
  BULEN_ENABLE_PROTOCOL_REWARDS=true \
  BULEN_BLOCK_REWARD=10 \
  BULEN_FEE_BURN_FRACTION=0.3 \
  BULEN_FEE_ECOSYSTEM_FRACTION=0.1 \
  BULEN_BLOCK_PRODUCER_FRACTION=0.4 \
  BULEN_REQUIRE_SIGNATURES=true \
  BULEN_ENABLE_FAUCET=false
```
