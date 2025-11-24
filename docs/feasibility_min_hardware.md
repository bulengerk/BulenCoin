# BulenCoin – analiza wykonalności (minimalny sprzęt na start)

Dokument w formacie roboczym (do łatwego eksportu do PDF). Cel: oszacować minimalny,
realistyczny zestaw sprzętowy potrzebny do uruchomienia sieci BulenCoin w fazie
pilotażowej/testnetowej z podstawową obserwowalnością oraz wariant minimalny, ale
pełnoprawny dla produkcji (z klientem w Rust).

## Założenia

- Używamy aktualnego prototypu (Node.js) – niskie wymagania CPU/RAM, niski I/O.
- Konsensus lekki (PoS z małymi komitetami), brak ciężkiego storage (brak pełnych
  historii stanów).
- Redundancja minimalna: 3 węzły walidujące (by mieć quorum i odporność na 1 awarię),
  1 bramka/gateway (API), 1 eksplorator + 1 status-service (mogą współdzielić hosta).

## Minimalny zestaw maszyn (testnet/pilot)

1. **Validator 1–3 (x3)**  
   - vCPU: 2  
   - RAM: 2–4 GB  
   - Dysk: 40 GB SSD (I/O umiarkowane)  
   - Sieć: stałe łącze 50+ Mbps symetryczne, publiczny adres/porty (P2P+HTTP)  
   - Profil: `server-full` lub `desktop-full` (w środowisku cloud/lab).

2. **Gateway + Explorer + Status (x1, współdzielony)**  
   - vCPU: 2  
   - RAM: 2–4 GB  
   - Dysk: 30 GB SSD  
   - Sieć: 50+ Mbps, publiczny HTTP/HTTPS (gateway/explorer), dostęp do validatorów po
     sieci prywatnej lub publicznej (z ACL/WAF).  
   - Profil gateway: `gateway` (faucet off, `BULEN_REQUIRE_SIGNATURES=true`,
     `BULEN_P2P_TOKEN` ustawiony, limiter ustawiony ciaśniej).

3. **Opcjonalnie – węzły „edge”/ARM do testów urządzeń**  
   - Raspberry Pi 4/5, 4 GB RAM, SSD na USB, profil `raspberry`.  
   - Cel: walidacja działania na małych urządzeniach, nie krytyczne dla sieci.

Łącznie: **4 małe VM/maszyny** (3x validator, 1x gateway+explorer+status). To pozwala
zbudować podstawowe quorum PoS, mieć publiczne API i wgląd w status.

## Minimalny, ale pełnoprawny deployment produkcyjny (Rust client)

Wymaga:
- klienta BulenNode przepisania do **Rusta** (wydajność, mniejsze zużycie RAM/CPU,
  lepszy profil I/O, łatwiejsze statyczne binarki),
- izolacji warstw (sentry przed validatorami), TLS, monitoring/alerting,
- minimalnej redundancji 3+ walidatorów i 2 gateway (active/active lub active/passive).

Proponowany minimalny układ:

1. **Walidatory (x3)**  
   - vCPU: 4  
   - RAM: 8 GB  
   - Dysk: 80 GB NVMe (low‑latency)  
   - Sieć: 200+ Mbps symetryczne, stałe publiczne IP lub stały endpoint (Anycast/Elastic IP)  
   - Profil: produkcyjny, signatures on, faucet off, P2P token, rate limit włączony.

2. **Sentry nodes (x2)**  
   - vCPU: 2–4  
   - RAM: 4–8 GB  
   - Dysk: 40 GB SSD/NVMe  
   - Rola: terminują ruch P2P/HTTP, filtrują, forwardują do walidatorów; wystawione publicznie
     zamiast bezpośredniej ekspozycji walidatorów.

3. **Gateway / API (x2)**  
   - vCPU: 2–4  
   - RAM: 4 GB  
   - Dysk: 30 GB SSD  
   - Sieć: 200+ Mbps, HTTPS + WAF/ACL, limiter ciaśniejszy (np. 10s okno, 20–30 req/IP).  
   - Łączą się tylko do sentry lub prywatnych adresów walidatorów.

4. **Explorer + Status (x1–2)**  
   - vCPU: 2  
   - RAM: 2–4 GB  
   - Dysk: 30 GB SSD  
   - Może współdzielić hosta z gateway (jeśli ruch mały) lub być odseparowany.

5. **Monitoring / Prometheus + Alertmanager + Grafana (x1)**  
   - vCPU: 2  
   - RAM: 4 GB  
   - Dysk: 30 GB SSD  
   - Skrobie `/metrics` z walidatorów, sentry, gateway. Alerty na brak liveness, niską liczbę
     peerów, 5xx, wysokie 429, odchylenia wysokości łańcucha.

6. **Backup / Snapshot storage (bucket/S3 kompatybilny)**  
   - Snapshoty danych walidatorów (pruning/snapshot), backup konfiguracji i kluczy w KMS/HSM.

Łącznie minimalnie produkcyjnie: **8–10 małych/średnich VM**. Zalety: odporność na awarię
1 walidatora i 1 gateway, izolacja walidatorów za sentry, monitoring i backup.

Kluczowe różnice vs. pilot:
- Rustowy klient: niższy RAM/CPU, lepsza stabilność długotrwała, statyczny deploy.
- 2x gateway (redundancja) i 2x sentry (warstwa ochronna).
- TLS/WAF/ACL oraz szybsze dyski NVMe dla walidatorów.
- KMS/HSM dla kluczy walidatorów (jeśli dostępne); inaczej air‑gapped key mgmt.

## Konfiguracja i parametry (minimum higieny)

- `BULEN_REQUIRE_SIGNATURES=true` na walidatorach i gateway.  
- `BULEN_P2P_TOKEN` ustawiony spójnie między węzłami.  
- Rate limit: `BULEN_RATE_LIMIT_WINDOW_MS=10000`, `BULEN_RATE_LIMIT_MAX_REQUESTS=30`
  na gateway.  
- Faucet: `BULEN_ENABLE_FAUCET=false` na hostach publicznych.  
- Prometheus: scrapuj `/metrics` z validatorów i gateway; alerty na niedostępność, niską
  liczbę peerów, wzrost 5xx, wysokie 429.  
- TLS i WAF/reverse proxy przed gateway/explorer/status (nginx/Traefik z basic auth na
  panelach wewnętrznych).

## Szacunkowy koszt (chmura, klasy VM „small”)

- 3x validator (2 vCPU, 4 GB RAM, 40 GB SSD): ~3×$12–18 / miesiąc (w zależności od
  dostawcy/regionu).  
- 1x gateway+explorer+status (2 vCPU, 4 GB RAM, 30 GB SSD): ~$12–18 / miesiąc.  
- Razem rząd wielkości: **~$50–70 / miesiąc** przy cenach chmurowych klasy budżetowej
  (bez ruchu/transferu).

## Minimalny wariant „garażowy” (tylko PoC)

- 1x laptop/mini‑PC (4 vCPU, 8 GB RAM, SSD 256 GB) z 3 instancjami validatorów
  uruchomionymi lokalnie na różnych portach + 1 instancja gateway/explorer/status.  
- Akceptowalne tylko do demonstracji; brak redundancji, pojedynczy punkt awarii,
  słaba wiarygodność pomiarów.

## Rekomendacje dalsze

- Dodać 1 zapasowy gateway (active/passive) z tym samym backendem P2P.  
- Oddzielić explorer/status od gateway, gdy ruch rośnie.  
- Użyć storage z snapshotami (np. dysk sieciowy z backupem do bucketu).  
- Włączyć monitoring transferu i limitów na firewallu/WAF.  
- W produkcji docelowo 4–6 walidatorów (większe quorum) + sentry nodes przed nimi.
