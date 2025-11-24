---
title: BulenCoin – zalecenia bezpieczeństwa i hardening
language: pl
---

Ten dokument opisuje podstawowe zalecenia bezpieczeństwa dla operatorów węzłów BulenCoin,
w szczególności:

- konfigurację środowiska i systemu operacyjnego,
- logowanie i zgodność z RODO,
- hardening warstwy sieciowej i HTTP,
- monitorowanie i reagowanie na incydenty.

Nie zastępuje pełnego audytu bezpieczeństwa ani formalnego threat‑modelingu, ale może
być punktem wyjścia do dalszych prac.

# 1. Środowisko i system operacyjny

- **Oddzielny użytkownik systemowy**:
  - uruchamiaj węzeł (np. `server-full`, `gateway`) jako dedykowany użytkownik (`bulen`,
    `pi` na Raspberry), bez uprawnień roota,
  - nadaj minimalne uprawnienia do katalogów danych (`chown bulen:bulen /opt/bulencoin`).
- **Aktualizacje systemu**:
  - regularnie aktualizuj system (np. `apt update && apt upgrade`),
  - dbaj o aktualne wersje Node.js i bibliotek zależnych (`npm audit` jako check).
- **Separacja środowisk**:
  - środowiska testowe i produkcyjne powinny być oddzielne (inne serwery/klastry),
  - nie używaj tych samych kluczy prywatnych w testnecie i mainnecie.

# 2. Konfiguracja node’a i kluczy

- **Podpisy transakcji**:
  - na węzłach publicznych zawsze używaj `BULEN_REQUIRE_SIGNATURES=true`,
  - węzeł powinien odrzucać transakcje bez podpisu/nonce lub ze złą parą klucz‑adres.
- **Faucet**:
  - endpoint `/api/faucet` jest tylko do testów,
  - w środowiskach publicznych ustaw `BULEN_ENABLE_FAUCET=false`.
- **Token P2P**:
  - w zaufanych klastrach używaj `BULEN_P2P_TOKEN='losowy‑silny‑sekret'`,
  - konfiguruj token na wszystkich węzłach w klastrze (węzeł odrzuci ruch P2P bez tokenu).
- **Hasła i secrety**:
  - przechowuj je poza repozytorium, np. w `/etc/default/bulennode-server` lub managerze
    sekretów,
  - nie commituj `BULEN_P2P_TOKEN`, kluczy prywatnych ani seed phrase.

# 3. Logowanie i RODO

- **Minimalizacja logów**:
  - logi HTTP (np. `morgan`) na bramkach API mogą zawierać adresy IP, user‑agenty,
    ścieżki – traktuj je jako potencjalne dane osobowe,
  - loguj tylko to, co jest niezbędne do monitoringu i diagnozy problemów.
- **Retencja**:
  - ustaw rotację logów (np. `logrotate`) i ogranicz czas przechowywania (np. 30–90 dni),
  - regularnie usuwaj stare logi z backupów, jeżeli nie są już potrzebne.
- **Anonimizacja**:
  - jeśli to możliwe, maskuj fragmenty adresów IP (np. /24) lub stosuj pseudonimizację,
  - nie łącz danych z logów z innymi danymi identyfikującymi użytkowników, chyba że masz
    wyraźną podstawę prawną i informujesz o tym w polityce prywatności.
- **Polityka prywatności**:
  - jeżeli prowadzisz publiczny węzeł bramkowy, przygotuj politykę prywatności opisującą:
    - jakie dane zbierasz,
    - w jakim celu,
    - jak długo je przechowujesz,
    - jakie prawa mają użytkownicy.

# 4. Warstwa sieciowa i HTTP

- **Reverse proxy i TLS**:
  - wystawiaj API (`/api/*`, eksplorator, status) za reverse proxy (nginx/Traefik),
  - wymuszaj HTTPS i aktualne wersje protokołów TLS,
  - używaj nagłówków bezpieczeństwa (HSTS, X‑Content‑Type‑Options, X‑Frame‑Options).
- **Rate limiting i firewall**:
  - zastosuj limity zapytań per IP na poziomie reverse proxy oraz w samym node (już jest
    prosty limiter w `bulennode/src/server.js`),
  - na firewallu ogranicz porty tylko do tych, które są potrzebne (HTTP, P2P).
- **Ekspozycja usług**:
  - eksplorator i status‑service mogą być dostępne tylko wewnątrz VPN lub private network,
    jeśli nie są przeznaczone dla użytkowników końcowych,
  - pamiętaj, aby nie udostępniać endpointów administracyjnych lub debugowych publicznie.

# 5. Monitoring i reagowanie na incydenty

- **Monitoring**:
  - zbieraj podstawowe metryki: wysokość bloku, liczbę peerów, uptime, obciążenie CPU/RAM,
    błędy HTTP,
  - wykorzystaj status‑service (katalog `status/`) do okresowego zliczania stanu węzłów w
    klastrze.
- **Alerting**:
  - skonfiguruj alerty (e‑mail, Slack) na:
    - zatrzymanie procesu node’a,
    - gwałtowny spadek liczby peerów,
    - nietypowe zużycie CPU/RAM,
    - nietypowe błędy HTTP (np. 5xx).
- **Procedury**:
  - przygotuj plan działania na wypadek:
    - kompromitacji klucza walidatora,
    - błędu w implementacji konsensusu,
    - poważnego incydentu bezpieczeństwa (np. atak na API).

# 6. Zależności i audyty

- **Zależności Node.js**:
  - regularnie uruchamiaj `npm audit` w katalogach `bulennode/`, `explorer/`, `status/`,
  - aktualizuj zależności w kontrolowany sposób (np. przez dependabot/renovate z
    code‑review).
- **Audyty zewnętrzne**:
  - przed produkcyjnym użyciem protokołu i implementacji klienckiej rozważ zatrudnienie
    zewnętrznego zespołu do audytu bezpieczeństwa (kod, architektura, konfiguracja).

