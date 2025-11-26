---
title: BulenCoin – przewodnik wdrożeniowy
language: pl
---

# 1. Zakres tego przewodnika

Ten dokument opisuje dwa wymiary wdrożenia BulenCoin:

- **wdrożenie warstwy prezentacji** – statycznej strony WWW z opisem projektu,
- **wdrożenie sieci BulenCoin** – od fazy testnet do mainnet (na poziomie operacyjnym).

Nie jest to pełna dokumentacja programistyczna klienta BulenNode – opisuje raczej
procesy, konfigurację i dobre praktyki operacyjne.

# 2. Wdrożenie strony internetowej BulenCoin

Repozytorium zawiera prostą, statyczną stronę:

- `index.html` – struktura strony w EN/ES/PL,
- `styles.css` – warstwa wizualna,
- `script.js` – przełączanie języka i wstrzykiwanie tłumaczeń.

## 2.1. Uruchomienie lokalne

Wymagania:

- dowolna przeglądarka,
- opcjonalnie prosty serwer HTTP (np. Python, Node, `nginx`).

Uruchomienie:

1. Wejdź do katalogu projektu, np.:
   ```bash
   cd /home/USER/projects/BulenCoin
   ```
2. Otwórz lokalnie plik `index.html` w przeglądarce **lub**:
3. Uruchom prosty serwer HTTP, np.:
   ```bash
   python3 -m http.server 8080
   ```
   i wejdź na `http://localhost:8080`.

## 2.2. Wdrożenie na serwerze / w chmurze

Możesz użyć dowolnego hostingu statycznego (GitHub Pages, Netlify, Vercel, S3+CloudFront,
VPS z `nginx`).

Przykład (serwer z `nginx`):

1. Skopiuj pliki `index.html`, `styles.css`, `script.js` na serwer, np. do
   `/var/www/bulencoin`.
2. Skonfiguruj blok serwera w `nginx`:
   ```nginx
   server {
     listen 80;
     server_name bulencoin.example.com;

     root /var/www/bulencoin;
     index index.html;

     location / {
       try_files $uri $uri/ =404;
     }
   }
   ```
3. Przeładuj konfigurację:
   ```bash
   sudo nginx -t && sudo systemctl reload nginx
   ```
4. Skieruj rekord `A` / `CNAME` domeny `bulencoin.example.com` na adres serwera.

## 2.3. GitHub Pages (wariant bez serwera)

1. Utwórz repozytorium z plikami BulenCoin.
2. W ustawieniach GitHub: **Pages** → wybierz gałąź (`main`) i katalog `/` jako źródło.
3. Po chwili strona będzie dostępna pod adresem `https://<user>.github.io/<repo>`.

# 3. Prototypowa implementacja BulenNode w Node.js

Repozytorium zawiera lekką, prototypową implementację węzła w katalogu `bulennode/` oraz
eksplorator bloków w `explorer/`. Jest to demonstracja architektury i warstwy API, a nie
docelowy klient produkcyjny.

## 3.1. Funkcje BulenNode (wersja prototypowa)

Najważniejsze elementy:

- prosty łańcuch bloków w pamięci z zapisem do pliku JSON (`data/<profil>/state.json`),
- konta z polami: saldo, stake, nonce, reputacja,
- mempool transakcji i okresowa produkcja bloków (co `BULEN_BLOCK_INTERVAL_MS`),
- HTTP API (status węzła, bloki, konta, wysyłanie transakcji, faucet testowy),
- ekonomia/ux:
  - `/api/rewards/estimate` – kalkulator nagród/lojalności (też w `/api/status` jako `rewardProjection`),
  - `/api/payments` + `/api/payments/:id` – faktury z opcjonalnym `webhookUrl`,
  - `/api/payment-link` – generowanie linku BIP21 + QR,
  - `/api/mempool` – podgląd kolejki transakcji,
- bardzo proste P2P oparte o HTTP do rozgłaszania bloków i transakcji,
- opcjonalna weryfikacja podpisów transakcji i nonce.

Uruchomienie lokalnego węzła:

```bash
cd bulennode
npm install
npm start
```

Po starcie:

- API działa na `http://localhost:4100`,
- dane są zapisywane w `data/desktop-full`,
- węzeł produkuje bloki, gdy w mempoolu pojawiają się transakcje.

Uruchomienie prostego eksploratora:

```bash
cd explorer
npm install
npm start
```

Domyślnie eksplorator zakłada, że BulenNode odpowiada pod `http://localhost:4100/api`, i
udostępnia listę bloków, widok bloku i widok konta pod `http://localhost:4200`.

## 3.2. Parametry bezpieczeństwa BulenNode

Prototyp BulenNode obsługuje kilka ważnych zmiennych środowiskowych:

- `BULEN_REQUIRE_SIGNATURES` – gdy `true`, węzeł wymaga, aby każda transakcja zawierała:
  - `publicKey` – klucz publiczny w formacie PEM,
  - `signature` – podpis w formacie base64 (ECDSA/`sha256`) nad kanonicznym JSON:
    `{ from, to, amount, fee, nonce }`,
  - `nonce` – monotonicznie rosnącą liczbę całkowitą (większą niż `nonce` konta).

  Adres nadawcy (`from`) musi być zgodny z `publicKey` po wyliczeniu skrótu
  (`addr_<sha256(publicKey)>`). Niespójne lub niepodpisane transakcje są odrzucane.

- `BULEN_P2P_TOKEN` – współdzielony sekret pomiędzy zaufanymi węzłami. Jeżeli jest
  ustawiony, to endpointy P2P `/p2p/tx` i `/p2p/block` akceptują wyłącznie żądania z
  nagłówkiem `x-bulen-p2p-token` o tej samej wartości. Chroni to przed prostymi próbami
  zalewania P2P z zewnątrz.

- `BULEN_ENABLE_FAUCET` – kontroluje dostępność testowego endpointu `/api/faucet`. W
  trybie deweloperskim (domyślnie) jest włączony; w środowiskach publicznych należy go
  ustawić na `false`.

- `BULEN_MAX_BODY_SIZE` – maksymalny rozmiar JSON‑owego ciała żądania obsługiwanego przez
  API (domyślnie `128kb`), co ogranicza ryzyko prostych ataków typu „payload bloat”.

- `BULEN_RATE_LIMIT_WINDOW_MS` / `BULEN_RATE_LIMIT_MAX_REQUESTS` – okno limitera (w
  milisekundach) i liczba zapytań na IP w tym oknie (domyślnie `15000` ms i `60`).
  W publicznych gateway’ach ustawiaj ciaśniejsze wartości albo dołóż zewnętrzny WAF.
- `BULEN_STATUS_TOKEN` / `BULEN_METRICS_TOKEN` – gdy ustawione, `/api/status` i
  `/metrics` wymagają odpowiednich nagłówków (`x-bulen-status-token`,
  `x-bulen-metrics-token`), co jest zalecane na publicznych hostach; w buildach prod
  traktować jako wymagane (BulenNode nie wystartuje w prod bez tokenów).
- `BULEN_REWARDS_HUB` / `BULEN_REWARDS_TOKEN` – opcjonalny endpoint/token do wysyłania
  telemetrycznych raportów uptime/stake do prototypowego `rewards-hub`.
- `BULEN_WEBHOOK_SECRET` – jeżeli ustawione, webhooki płatności są podpisywane HMAC
  (nagłówek `x-bulen-signature`, sha256 nad JSON); w prod wymagane gdy używasz webhooków.
- `BULEN_REWARDS_HMAC_SECRET` – jeżeli ustawione, raporty telemetryczne do rewards-hub
  są podpisywane HMAC (nagłówek `x-bulen-signature`).
- `BULEN_SUPERLIGHT_MODE` (domyślnie w profilu `phone-superlight`) – utrzymuje tylko świeże
  bloki (snapshot + małe okno) i pozwala na „uśpienie” gdy telefon ma niski poziom baterii.
  Próg baterii kontroluje `BULEN_SUPERLIGHT_BATTERY_THRESHOLD` (domyślnie 0.15); REST:
  `POST /api/device/battery {"level":0.12}` ustawia `sleeping=true`.
- `BULEN_DEVICE_TOKEN` – opcjonalny token do sterowania `/api/device/battery`; w prod
  endpoint wymaga nagłówka `x-bulen-device-token` (inaczej 403).

### Testy integracyjne (zwiększone pokrycie)

- `node --test scripts/tests/full_stack_smoke.test.js` – węzeł + explorer + status (blok z tx).
- `node --test scripts/tests/full_stack_integration_all.test.js` – pełen stack + payments + wallet session.
- `node --test scripts/tests/node_load_30s.test.js` – 30s obciążenie (status + tx co ~1s).
- **Nowe:** `scripts/tests/payment_webhook_signature.test.js` – end‑to‑end podpisy HMAC webhooków płatności.
- **Nowe:** `scripts/tests/superlight_mobile.test.js` – profil super‑light: sleep/resume po poziomie baterii.

Ponadto:

- na wejściu API stosowany jest prosty limit liczby zapytań na IP (w pamięci),
- eksplorator HTML ucieka dynamiczne wartości (escape), ograniczając ryzyko XSS,
- drogi ruchu produkcyjnego powinny być dodatkowo chronione przez reverse proxy (`nginx`,
  Traefik) z TLS i bardziej zaawansowanym rate‑limitingiem.

## 3.3. Profile węzłów i klasy sprzętu

Prototyp BulenNode ma domyślne profile konfiguracyjne, wybierane zmienną
`BULEN_NODE_PROFILE`:

- `desktop-full` – typowy pełny węzeł na laptopie/PC:
  - `deviceClass=desktop`,
  - `rewardWeight=0.8`,
  - `nodeRole=validator`,
  - domyślnie faucet włączony (środowiska deweloperskie).
- `server-full` – pełny węzeł serwerowy:
  - `deviceClass=server`,
  - `rewardWeight=1.0` (najwyższa waga w modelu uptime),
  - `nodeRole=validator`,
  - faucet domyślnie wyłączony.
- `mobile-light` – węzeł light na telefonie:
  - `deviceClass=phone`,
  - `rewardWeight=0.5`,
  - `nodeRole=validator`,
  - dłuższy interwał produkcji bloków (łagodniejszy dla baterii).
- `tablet-light` – węzeł light na tablecie:
  - `deviceClass=tablet`,
  - `rewardWeight=0.6`,
  - parametry pośrednie między telefonem a laptopem.
- `phone-superlight` – super‑lekki tryb na telefon (nagłówki + snapshot, observer):
  - `deviceClass=phone`,
  - `rewardWeight=0.35`,
  - `nodeRole=observer` (bez produkcji bloków),
  - `superLightMode=true` – agresywne utrzymywanie tylko świeżych bloków i snapshotu.
- `raspberry` – węzeł na Raspberry Pi / SBC:
  - `deviceClass=raspberry`,
  - `rewardWeight=0.75`,
  - dopasowane interwały bloków do skromniejszych zasobów.
- `gateway` – węzeł bramkowy (API, bez roli walidatora):
  - `deviceClass=server`,
  - `rewardWeight=0.9`,
  - `nodeRole=observer`,
  - faucet domyślnie wyłączony.

Każdy profil ma domyślne porty HTTP/P2P i podstawowe parametry (np. interwał bloków), które
można nadpisać zmiennymi środowiskowymi (`BULEN_HTTP_PORT`, `BULEN_P2P_PORT`,
`BULEN_BLOCK_INTERVAL_MS`).

Informacje o profilu, klasie sprzętu i wadze nagród są zwracane w `/api/status`, razem z
lokalną estymacją nagród uptime (proporcjonalną do czasu pracy i `rewardWeight`).

## 3.4. Uruchamianie BulenNode na Raspberry Pi

Choć docelowy klient BulenNode może być napisany w języku z wbudowanym cross‑compile
(np. Rust/Go), prototypowa implementacja Node.js jest wieloplatformowa i może działać na
Raspberry Pi lub innych płytkach ARM, o ile dostępny jest Node.js.

Przykładowe kroki (Raspberry Pi OS / Debian ARM):

```bash
sudo apt update
sudo apt install -y nodejs npm

git clone https://example.com/bulencoin.git
cd bulencoin/bulennode
npm install

export BULEN_NODE_PROFILE=raspberry
npm start
```

Zalecenia:

- używaj nowszych wersji Node.js (np. 18 LTS),
- dla długotrwałej pracy skonfiguruj proces manager (np. `pm2`, `systemd`) i monitoruj
  temperatury oraz obciążenie CPU/RAM,
- w sieci publicznej umieść węzeł za reverse proxy z TLS.

## 3.5. Skrypty instalacyjne i jednostki systemd

Repozytorium zawiera proste skrypty instalacyjne:

- `scripts/install_server_node.sh` – przygotowanie węzła `server-full` na serwerze
  (Debian/Ubuntu),
- `scripts/install_desktop_node.sh` – przygotowanie węzła `desktop-full` na laptopie/PC,
- `scripts/install_raspberry_node.sh` – przygotowanie węzła `raspberry` na Raspberry Pi,
- `scripts/install_gateway_node.sh` – przygotowanie węzła `gateway` (bramka API),
- `scripts/install_macos_node.sh [profile]` – instalator macOS (Homebrew lub per‑user nvm; domyślnie `desktop-full`),
- `scripts/install_windows_node.ps1 -Profile <profile>` – instalator Windows (winget/Chocolatey) dla wybranego profilu.

Skrypty:

- sprawdzają dostępność Node.js / npm (w razie potrzeby instalują je przez `apt`),
- wykonują `npm install` w katalogu `bulennode`,
- wypisują rekomendowane zmienne środowiskowe (profil, bezpieczeństwo, P2P token).

Przykładowe jednostki `systemd` znajdują się w `scripts/systemd/`:

- `bulennode-server.service` – szablon dla węzła serwerowego w `/opt/bulencoin/bulennode`,
- `bulennode-raspberry.service` – szablon dla węzła na Raspberry Pi w
  `/home/pi/bulencoin/bulennode`.

Są to przykładowe pliki, które należy dostosować do:

- rzeczywistej ścieżki repozytorium,
- nazwy użytkownika systemowego (np. `bulen`, `pi`),
- pliku z ustawieniami środowiska (`/etc/default/bulennode-server` itd.).

Szybki smoke test instalatorów (Linux) można wykonać w kontenerze Debiana:

```bash
./scripts/test_installers_in_docker.sh
```

## 3.6. Minimalne wymagania produkcyjne (testnet/prod)

Profil `server-full` / `gateway` (publiczne API / walidator):

- OS: Debian 12 lub Ubuntu 22.04 LTS, Node.js 18 LTS (`node -v` >= 18, `npm -v` >= 9),
- min. zasoby: 2 vCPU, 4 GB RAM, 40 GB SSD/NVMe; rekomendowane 4 vCPU, 8 GB RAM, 80 GB,
- sieć: stabilne łącze, publiczne IP lub reverse proxy/WAF z TLS, P2P/HTTP porty otwarte,
- bezpieczeństwo: `BULEN_REQUIRE_SIGNATURES=true`, `BULEN_ENABLE_FAUCET=false`,
  `BULEN_P2P_TOKEN`, `BULEN_STATUS_TOKEN`, `BULEN_METRICS_TOKEN` ustawione,
- proces: uruchom jako nie-root (użytkownik systemowy), `systemd` z restartem i limitami.

Profil `desktop-full` (walidator niepubliczny / deweloperski):

- min. zasoby: 2 vCPU, 4 GB RAM, 20 GB SSD, porty mogą pozostać zamknięte (tylko lokalne API),
- bezpieczeństwo: faucet tylko w trybie dev, w publicznej sieci traktować jak `server-full`.

Profil `raspberry` (SBC):

- min. sprzęt: Raspberry Pi 4/4GB (lub lepszy) + microSD UHS-I 32 GB lub SSD po USB,
- sieć: stałe łącze, porty HTTP/P2P przekierowane, reverse proxy z TLS gdy wystawiany,
- bezpieczeństwo: faucet off, P2P token, monitorowanie temperatury/obciążenia.

# 4. Wdrożenie sieci BulenCoin – testnet

Ta sekcja zakłada, że istnieje implementacja referencyjna klienta **BulenNode**
(np. w Rust, Go lub TypeScript), zgodna ze specyfikacją w `docs/bulencoin_spec_pl.md`.

## 4.1. Plan testnetu

Cele testnetu:

- sprawdzenie działania protokołu na różnych klasach sprzętu,
- zebranie telemetrycznych danych o uptime, opóźnieniach, przepustowości,
- dostrojenie parametrów konsensusu i modelu nagród,
- wypracowanie procedur operacyjnych (monitoring, aktualizacje, incydenty).

Minimalny zestaw komponentów:

- kilka pełnych węzłów referencyjnych (serwery w chmurze),
- publiczne węzły bramkowe (API HTTP/WebSocket),
- obraz aplikacji BulenNode dla:
  - Androida,
  - iOS (minimum TestFlight),
  - desktop (Windows, Linux, macOS),
- eksplorator bloków,
- serwis statusu sieci.

## 4.2. Konfiguracja węzłów referencyjnych

Załóżmy binarkę `bulennode` z plikiem konfiguracyjnym `bulennode.toml`.

Przykładowa konfiguracja:

```toml
[network]
chain_id = "bulencoin-testnet-1"
listen_addr = "0.0.0.0:26656"
public_addr = "testnet1.bulencoin.example.com:26656"
seeds = ["testnet1.bulencoin.example.com:26656", "testnet2.bulencoin.example.com:26656"]

[consensus]
slot_duration_ms = 4000
committee_size = 32
min_stake = "1000 BULEN"

[database]
path = "/var/lib/bulennode"
pruning = "default"

[api]
enabled = true
http_listen = "0.0.0.0:8080"
ws_listen = "0.0.0.0:8081"
rate_limit_per_minute = 120
```

Typowa procedura uruchomienia:

```bash
sudo useradd --system --home /var/lib/bulennode bulen
sudo mkdir -p /var/lib/bulennode
sudo chown bulen:bulen /var/lib/bulennode

sudo cp bulennode /usr/local/bin/
sudo cp bulennode.toml /etc/bulennode.toml
```

Unit `systemd`:

```ini
[Unit]
Description=BulenCoin Node (testnet)
After=network-online.target
Wants=network-online.target

[Service]
User=bulen
ExecStart=/usr/local/bin/bulennode --config /etc/bulennode.toml
Restart=on-failure
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now bulennode
```

## 4.3. Dodawanie węzłów społeczności

Instrukcja dla użytkownika (testnet):

1. Pobierz `bulennode` z oficjalnej strony / GitHub Releases.
2. Utwórz katalog danych, np. `~/.bulennode-testnet`.
3. Pobierz plik `testnet.toml` z oficjalnej dokumentacji (zawierający `chain_id`, seed
   nodes itd.).
4. Uruchom:
   ```bash
   bulennode init --config testnet.toml
   bulennode run --config testnet.toml
   ```
5. Sprawdź status: `bulennode status` lub panel webowy.

Na urządzeniach mobilnych:

- instalacja aplikacji ze sklepu / TestFlight,
- wybór sieci „BulenCoin Testnet”,
- wygenerowanie portfela i kopii zapasowej seed phrase,
- włączenie trybu węzła light i ustawienie limitów zasobów.

# 5. Wdrożenie sieci BulenCoin – mainnet

## 5.1. Parametry startowe mainnetu

Przed startem mainnetu należy ustalić:

- **chain ID** (np. `bulencoin-mainnet-1`),
- początkową dystrybucję tokenów,
- początkowych walidatorów (klucze publiczne, ilość stake),
- parametry konsensusu:
  - długość slotu,
  - wielkość komitetu,
  - minimalny stake,
  - parametry slashing,
  - początkowe współczynniki dla typów urządzeń,
- parametry ekonomiczne:
  - początkowa nagroda blokowa,
  - formuła emisji / inflacji,
  - wysokość puli nagród za uptime.

Całość powinna być opisana w osobnym, niezmiennym dokumencie „Genesis Spec”.

## 5.2. Procedura startu mainnetu

1. Przygotowanie pliku `genesis.json` i dystrybucji kluczy walidatorów.
2. Weryfikacja `genesis.json` przez wielu niezależnych uczestników (checksumy, hash).
3. Publikacja:
   - `genesis.json`,
   - listy początkowych pełnych węzłów,
   - instrukcji uruchomienia.
4. Ustalony „slot startowy” – moment, od którego węzły zaczynają produkować bloki.

Operatorzy węzłów:

- pobierają `bulennode` w wersji mainnetowej,
- konfigurują `bulennode.toml` z parametrami mainnetu,
- umieszczają `genesis.json` w katalogu danych,
- uruchamiają usługę.

## 5.3. Dodawanie nowych walidatorów

Proces (upraszczając):

1. Użytkownik uruchamia węzeł pełny i wypełnia warunki minimalnego stake.
2. Tworzy transakcję „Create Validator”:
   - klucz walidatora,
   - opis (moniker, strona WWW),
   - parametry komisji (jeśli przyjmuje delegacje),
   - ilość stake.
3. Po włączeniu do aktywnego zestawu walidatorów węzeł zaczyna brać udział w konsensusie
   i otrzymywać nagrody.

Delegujący mogą:

- delegować swoje BulenCoiny do wybranych walidatorów,
- otrzymywać część nagród proporcjonalnie do udziału, pomniejszoną o prowizję walidatora.

# 6. Operacje utrzymaniowe i bezpieczeństwo

## 6.1. Monitoring

Zalecane jest wystawienie metryk (np. Prometheus) i podstawowych dashboardów, obejmujących:

- wysokość bloku i opóźnienia,
- liczbę peerów,
- zużycie CPU / RAM / dysku,
- uptime węzła,
- liczbę błędów konsensusu / sieci,
- podstawowe metryki ekonomiczne (otrzymane nagrody).

Endpoint `/metrics` (Prometheus, tekstowy) w BulenNode wystawia m.in. wysokość łańcucha,
rozmiar mempoola, liczbę kont i stake, estymację nagrody uptime, liczbę payments, wersję
protokołu oraz parametry limitera. Skrob go bezpośrednio albo przez reverse proxy z
autoryzacją/TLS.

## 6.2. Aktualizacje oprogramowania

Zalecany flow:

1. Publikacja nowej wersji `bulennode` wraz z changelogiem.
2. Określenie minimalnej wersji wymaganej od danego wysokości bloku (dla hard forków).
3. Operatorzy:
   - pobierają nową wersję,
   - zatrzymują usługę,
   - wykonują kopię zapasową katalogu danych,
   - aktualizują binarkę,
   - uruchamiają ponownie węzeł.

Aplikacje mobilne i desktopowe powinny:

- wyświetlać wyraźne komunikaty o krytycznych aktualizacjach,
- wskazywać deadline, po którym stara wersja przestanie być kompatybilna.

## 6.3. Kopie zapasowe i odtwarzanie

Należy promować następujące praktyki:

- wielokrotne, offline’owe kopie seed phrase (papier, hardware wallet),
- unikanie przechowywania seeda w chmurze w formie otwartego tekstu,
- w przypadku pełnych węzłów – backup konfiguracji i ewentualnie bazy danych (jeśli
  migracje są kosztowne).

Procedura odtwarzania:

1. Zainstalować BulenNode.
2. Wprowadzić seed phrase w trybie przywracania portfela.
3. Pozwolić aplikacji na pełną resynchronizację stanu.

## 6.4. Reakcja na incydenty

Podstawowe scenariusze:

- **ataki DDoS na bramki API** – tymczasowe ograniczenie zapytań, wprowadzenie dodatkowych
  mechanizmów proof of work przy nawiązywaniu sesji, rozproszenie bramek,
- **podejrzenie błędu w konsensusie** – zatrzymanie produkcji bloków przez węzły
  referencyjne, publiczny komunikat, przygotowanie poprawionej wersji klienta,
- **kompromitacja klucza walidatora** – natychmiastowe wycofanie walidatora (jeśli
  protokół to wspiera), przeniesienie stake na nowy klucz, analiza zdarzenia.

## 6.5. Szacunkowe koszty uruchomienia produkcji (PL)

Symulacja bazuje na typowych cenach VPS u polskich dostawców (lokalne DC, rynek 2024),
bez zniżek rocznych; widełki obejmują VAT. Referencyjne cenniki: OVHcloud Warszawa,
Atman Cloud, ArubaCloud PL / homecloud (w zaokrągleniu, bez promocji).

Założone role i minimalne parametry:

- **Walidator** (prywatny, za sentry): 4 vCPU, 8 GB RAM, dysk SSD 160–200 GB – ~70–120 PLN / mies.
- **Sentry** (publiczny, reverse proxy + P2P/TLS): 2 vCPU, 4–8 GB RAM, 80–160 GB SSD – ~40–80 PLN / mies.
- **Gateway** (API/Explorer + WAF/limiter): 2 vCPU, 4 GB RAM, 80–120 GB SSD – ~30–60 PLN / mies.
- **Monitoring/backup node** (Prometheus + bucket sync): 2 vCPU, 4 GB RAM, 80 GB SSD – ~30–50 PLN / mies.
- **Storage S3-kompatybilne** (snapshots, logi): 100–200 GB – ~10–25 PLN / mies.

Przykładowe miesięczne koszty dla minimalnej topologii z `docs/prod_manifests.md`:

- 3× walidator: ~210–360 PLN,
- 2× sentry: ~80–160 PLN,
- 2× gateway: ~60–120 PLN,
- 1× monitoring/backup: ~30–50 PLN,
- storage (S3/bucket + transfer): ~10–25 PLN.

**Razem szacunkowo:** ~390–715 PLN / mies. (wariant VPS, pojedyncze DC).

Uwagi operacyjne:

- Dodanie zapasowego DC/regionu albo HA reverse proxy podwaja część kosztów sentry/gateway.
- Rezerwacje roczne lub pre-paid zwykle obniżają ceny o 10–25%.
- Wyceny trzeba okresowo aktualizować (cenniki VPS zmieniają się dynamicznie); powyższe
  liczby służą jedynie do planowania budżetu pilotażu/testnetu prod.

## 6.6. Checklista bezpieczeństwa (aktualizacja)

Parametry środowiskowe (produkcyjnie wymagane/wskazane):

- `BULEN_REQUIRE_SIGNATURES=true` – wymusza podpisy transakcji (z polami `action/memo/timestamp` w kanonicznym payloadzie).
- `BULEN_P2P_TOKEN=<sekret>` oraz `BULEN_P2P_REQUIRE_HANDSHAKE=true` – autoryzacja P2P; sesje z TTL, odrzucenie anon traffic.
- `BULEN_P2P_REQUIRE_TLS=true` oraz `BULEN_P2P_TLS_ENABLED=true` + certy – handshake wyłącznie po TLS; najlepiej za VPN/sentry.
- `BULEN_P2P_QUIC_ENABLED=false` (domyślnie) lub tylko za VPN z tokenem; UDP bez autoryzacji jest blokowane.
- `BULEN_MEMPOOL_MAX_SIZE=1000` (domyślnie) – limit kolejki transakcji; dostosuj do zasobów.
- `BULEN_ENABLE_FAUCET=false` – faucet nigdy na publicznych hostach.
- `BULEN_CORS_ORIGINS=<lista>` – wymusza whitelistę; brak listy = dowolne originy (tylko w dev).
- `BULEN_STATUS_TOKEN` / `BULEN_METRICS_TOKEN` – wymagane nagłówki do `/api/status` i `/metrics` na publicznych instancjach.

Warstwa sieciowa:

- P2P tylko między zaufanymi peerami (token/handshake/TLS) i najlepiej przez sentry/VPN; blokuj UDP/TCP z Internetu tam, gdzie to możliwe.
- Reverse proxy z TLS/mTLS i rate-limitami na `/api/*` oraz `Content-Length` > 128KB dropowane na brzegu.
- `/metrics` i `/api/status` za auth/allowlistą IP; nie wystawiać publicznie.

Ochrona przed DoS:

- Rate-limiter przed parserem body (domyślnie w aplikacji) + zewnętrzny limiter/WAF.
- Mempool z limitem rozmiaru; odrzucanie duplikatów i niskich fee (do rozbudowy).
- Monitorowanie odrzuconych bloków/tx i tempa handshake’ów; alerty na skoki 429/403.

Operacyjnie:

- Testy guardrails w CI (`npm test`) – regresje signature/p2p/faucet.
- Aktualizacja certów TLS automatem; mTLS dla połączeń wewnętrznych gdy to możliwe.
- Snapshoty `data/` zabezpieczone dostępem (bucket ACL/KMS), logi rotowane i ograniczone.

# 7. Bezpieczeństwo „dla ludzi” (domyślne i kreator)

- **Twarde domyślne dla buildów prod:** `BULEN_REQUIRE_SIGNATURES=true`, handshake P2P (`BULEN_P2P_REQUIRE_HANDSHAKE=true`), token P2P, TLS (`BULEN_P2P_REQUIRE_TLS=true` + cert/key) – build/profil prod nie startuje bez tych flag.
- **Kreator konfiguracji (CLI/UI) z checklistą:** krokowo pyta o profil (gateway/validator/mobile), porty, tokeny, listę CORS, status/metrics token, TLS, limity mempool/ratelimit; na końcu zapisuje `config.env` i drukuje „bezpieczny węzeł” checklistę do odhaczenia (faucet off, backup kluczy, snapshoty, monitoring).
- **Auto‑update z weryfikacją podpisów:** binarki/artefakty aktualizowane przez kanał HTTPS + podpisy (np. minisig/ed25519). Węzeł pobiera listę wersji + sygnatury, weryfikuje i dopiero wtedy restartuje; w przypadku błędu zostaje na starej wersji i loguje alert.
- **Komunikaty UX:** UI/CLI pokazuje na czerwono brak TLS/tokenów, brak wymuszonych podpisów, oraz przypomina o backupie seed i o wyłączeniu fauceta w środowiskach publicznych.

# 8. Polityka emisji/fee i harmonogram wypłat

- **Inflacja (parametryzowana, malejąca):** 8% w roku 1 → 6% w roku 2 → 4% w roku 3 → 2.5% w roku 4 → 1.5% od roku 5 wzwyż; zmiany tylko w wąskim paśmie decyzją governance/koordynacji wydawniczej.
- **Podział nagród blokowych:** 60% walidator/komitet wg stake, 20% pula uptime/lojalności (boosty urządzeń/uptime), 20% fundusz ekosystemu (multi‑sig + time‑lock, publikowane stany).
- **Opłaty transakcyjne:** 30% spalane (antyinflacja), 60% dla aktywnego setu walidatorów, 10% do funduszu ekosystemu.
- **Komunikacja i wypłaty:** w testnecie symulacja dzienna (małe stawki) do ćwiczenia narzędzi; w mainnecie rozliczenie per epoka (~tydzień) po osiągnięciu finalności. Publikowany kalendarz (ID epok, slot start, daty wypłat), dashboard spalania fee i sald funduszu, cykliczne raporty do społeczności.

# 9. Podsumowanie

W tym repozytorium:

- statyczna strona (`index.html`, `styles.css`, `script.js`) pełni rolę oficjalnego opisu
  projektu BulenCoin w trzech językach (EN/ES/PL),
- dokument `docs/bulencoin_spec_pl.md` odtwarza i porządkuje specyfikację z pliku PDF,
- niniejszy przewodnik (`docs/deployment_guide.md`) opisuje sposób wdrożenia strony oraz
  operacyjny model uruchomienia sieci BulenCoin (testnet → mainnet),
- dokument `docs/legal_compliance_pl.md` zawiera ogólne wskazówki dotyczące zgodności z
  prawem polskim i europejskim (bez zastępowania indywidualnej porady prawnej),
- dokument `docs/security_hardening_pl.md` opisuje rekomendacje hardeningu, logowania,
- monitoringu i reagowania na incydenty,
- katalogi `bulennode/` i `explorer/` dostarczają prototypową implementację węzła i
  eksploratora w Node.js, pomocną do eksperymentów z architekturą i API.

Docelowe, produkcyjne implementacje klienta BulenNode (np. w Rust/Go) powinny:

- zaadaptować opisany model konsensusu, ekonomii i bezpieczeństwa,
- spełniać dodatkowe wymagania niefunkcjonalne (wydajność, odporność na awarie),
- zostać poddane formalnemu przeglądowi i audytom bezpieczeństwa.
