---
title: BulenCoin – projekt sieci i aplikacji węzła
language: pl
---

# 1. Cel projektu

BulenCoin jest memcoinem z poważnym celem technicznym: ma udowodnić, że działająca sieć
kryptowalutowa może być utrzymywana przez możliwie najszersze spektrum sprzętu – od
telefonów i tabletów, przez laptopy i komputery stacjonarne, aż po serwery.

Sieć ma być:

- **na tyle lekka**, żeby mogła działać w tle na typowym urządzeniu końcowym,
- **na tyle opłacalna**, żeby użytkownik miał realną motywację, aby utrzymywać węzeł online
  przez większość czasu.

Ten dokument opisuje:

- logiczną architekturę sieci BulenCoin,
- typy węzłów i role w sieci,
- wymagania sprzętowe i sieciowe,
- model konsensusu i nagradzania,
- aplikacje węzłów na różnych platformach,
- proces setupu i fazy uruchomienia sieci,
- aspekty bezpieczeństwa i infrastrukturę wspierającą.

# 2. Ogólny model sieci

Sieć BulenCoin zakłada istnienie własnego łańcucha bloków lub odrębnej warstwy konsensusu,
w której wszystkie urządzenia mogą uczestniczyć jako węzły.

Ze względu na ograniczoną moc obliczeniową i baterię na urządzeniach mobilnych, sieć nie
może opierać się na kosztownym Proof of Work. Zamiast tego stosowany jest lekki mechanizm
Proof of Stake z losowanymi komitetami walidatorów, który pozwala na udział nawet
stosunkowo słabych urządzeń.

Warstwa logiczna sieci obejmuje:

- **warstwę sieciową (P2P)** – wymiana bloków i transakcji,
- **warstwę konsensusu** – wybór producentów bloków, komitetów i weryfikacja poprawności,
- **warstwę danych** – struktura bloków, transakcji i stanu kont,
- **warstwę motywacyjną** – system nagród i kar (slashing) dla węzłów.

Sieć jest projektowana tak, aby była dostępna z:

- lekkich węzłów mobilnych (light),
- pełnych węzłów desktopowych i serwerowych,
- węzłów bramkowych (API),
- ultra lekkich węzłów portfelowych.

# 3. Typy węzłów w sieci BulenCoin

## 3.1. Węzeł mobilny light

Węzeł mobilny light to aplikacja na telefon lub tablet, która:

- nie przechowuje pełnej historii łańcucha,
- trzyma nagłówki bloków i niewielką część ostatniego stanu (np. Merkle proofs),
- pozwala użytkownikowi weryfikować własne transakcje,
- może uczestniczyć w konsensusie.

Węzeł mobilny:

- utrzymuje połączenia z kilkoma pełnymi węzłami i pobiera od nich nagłówki oraz dowody
  kryptograficzne,
- bierze udział w rozproszonym monitorowaniu sieci, potwierdzając dostępność nowych bloków,
- może być losowo wybierany do małych komitetów zatwierdzających bloki, jeśli użytkownik
  zdeponował odpowiedni stake,
- posiada mechanizmy kontroli zużycia baterii i danych:
  - ograniczanie pracy do określonych godzin,
  - zatrzymywanie przy niskim poziomie baterii,
  - limity transferu w sieci komórkowej.

## 3.2. Węzeł desktopowy i serwerowy – pełny

Pełny węzeł uruchamiany jest na komputerach stacjonarnych, laptopach lub serwerach.

Pełny węzeł:

- przechowuje pełną historię bloków i stan kont,
- utrzymuje rozbudowaną tabelę peerów i propaguje nowe bloki i transakcje,
- uczestniczy w konsensusie jako potencjalny producent bloków (po zdeponowaniu stake),
- obsługuje lekkich klientów – przygotowuje dla nich dowody stanu i odpowiada na zapytania,
- może pełnić rolę węzła bramkowego (API HTTP / WebSocket).

## 3.3. Węzeł bramkowy

Węzeł bramkowy to logiczna rola pełnego węzła, który udostępnia interfejsy API innym
aplikacjom.

Węzeł bramkowy:

- udostępnia publiczne API do:
  - wysyłania transakcji,
  - odczytu stanu kont,
  - pobierania historii,
- działa jako punkt wejścia dla użytkowników, którzy nie chcą utrzymywać własnego węzła,
- jest wykorzystywany przez giełdy, systemy płatności oraz integracje z zewnętrznymi
  usługami.

## 3.4. Węzeł ultra lekki – tylko portfelowy

Na części urządzeń użytkownicy chcą jedynie wysyłać i odbierać środki, bez udziału
w utrzymywaniu sieci.

Ultra lekka aplikacja portfelowa:

- korzysta z API węzłów bramkowych lub z funkcji light‑client w trybie tylko‑do‑odczytu,
- nie uczestniczy w konsensusie,
- nie otrzymuje nagród za uptime.

# 4. Protokół konsensusu i motywacja

## 4.1. Założenia dla konsensusu

Konsensus BulenCoin musi:

- być **lekki obliczeniowo**, aby działał na urządzeniach mobilnych,
- **premiować różnorodność sprzętu** (telefony, komputery, serwery),
- zapewniać **przewidywalne nagrody** za utrzymywanie węzła online.

Wybrany jest model Proof of Stake z losowanymi komitetami. Użytkownicy deponują BulenCoiny
 jako stake, by ich węzły mogły uczestniczyć w:

- produkcji bloków,
- głosowaniu nad blokami.

W każdym kroku czasu:

- wybierany jest producent bloku,
- wybierany jest niewielki komitet węzłów, które muszą blok podpisać, by został uznany za
  finalny.

Losowanie opiera się na deterministycznej funkcji pseudolosowej, wykorzystującej m.in.
poprzednie bloki oraz klucze uczestników.

## 4.2. Wpływ typu urządzenia na selekcję

Aby zachęcić do udziału różne klasy urządzeń, sieć może uwzględniać typ urządzenia jako
parametr algorytmu selekcji komitetu.

Typy urządzeń (np. **mobile / desktop / server**) deklarowane są przy rejestracji węzła, a
protokół przypisuje im współczynniki korekcyjne:

- jeśli w sieci jest mało węzłów mobilnych, mogą one otrzymać nieco wyższy współczynnik,
  zwiększający szansę udziału w komitecie,
- jeśli jakaś klasa sprzętu dominuje, jej współczynnik może być obniżany.

Typ urządzenia nie może być jedynym kryterium, żeby nie zachęcać do fałszywych deklaracji.
Dlatego selekcja uwzględnia również:

- ilość zdeponowanego stake,
- historię uptime węzła,
- reputację (np. brak prób podwójnego podpisu, terminowe odpowiedzi na health checki).

## 4.3. Model nagród dla węzłów

Model nagradzania obejmuje:

- **nagrodę blokową** dla producenta bloku i członków komitetu,
- **udział w opłatach transakcyjnych** zawartych w bloku,
- **nagrody za uptime**, naliczane w oknach czasowych.

W każdym oknie czasowym:

- sieć losowo wybiera próbkę węzłów,
- wysyła do nich proste zapytania health check,
- węzły, które regularnie odpowiadają, otrzymują część puli nagród za uptime.

Nagrody za uptime:

- są proporcjonalne do stake,
- są korygowane współczynnikiem zależnym od typu urządzenia, tak aby np. telefony, które
  rzadziej są wybierane do produkcji bloków, nadal mogły zarabiać sensowne kwoty,
  po prostu będąc online.

Przykładowe współczynniki wagowe (relatywne, kalibrowane na podstawie danych z testnetu):

- serwery (węzły klasy **server‑full**) – waga bazowa `1.0` (najwyższa, zakładany najwyższy uptime),
- komputery stacjonarne / laptopy (**desktop‑full**) – waga ok. `0.8`,
- małe serwery / single‑board computers (np. **Raspberry Pi**) – waga ok. `0.75`,
- tablety (**tablet‑light**) – waga ok. `0.6`,
- telefony (**mobile‑light**) – waga ok. `0.5`.

Finalna nagroda za uptime dla węzła jest funkcją:

- ilości stake,
- czasu online w oknie pomiarowym,
- klasy sprzętu (współczynnik jak powyżej),
- reputacji węzła (bonusy za długi, stabilny uptime, kary za niedostępność).

Mechanizm **slashing**:

- karze węzły, które podpisują sprzeczne bloki lub próbują ataków na konsensus,
- usuwa część stake i obniża reputację takiego węzła.

# 5. Architektura aplikacji BulenNode

## 5.1. Moduły aplikacji

Aplikacja BulenNode, niezależnie od platformy, składa się z modułów:

- **komunikacja sieciowa** – połączenia P2P, wykrywanie peerów, wymiana bloków i
  transakcji,
- **konsensus** – logika Proof of Stake, wybór producentów bloków, głosowanie, weryfikacja
  podpisów,
- **przechowywanie danych** – baza danych bloków, stanu i indeksów,
- **portfel** – klucze prywatne, podpisywanie transakcji, interfejs do zarządzania
  środkami,
- **monitoring i zarządzanie zasobami** – nadzór nad zużyciem CPU, RAM, transferu i
  baterii.

Interfejsy między modułami są spójne na wszystkich platformach, co pozwala:

- używać tej samej logiki sieciowej i konsensusu na Androidzie, iOS, Windows, Linux i
  macOS,
- różnicować jedynie warstwy integrujące się z systemem operacyjnym (UI, dostęp do
  kluczy, usługi w tle).

## 5.2. Aplikacja mobilna

Mobilna aplikacja BulenNode udostępnia dwa główne tryby:

- **pełny węzeł light** – węzeł pracuje w tle jako klient lekki i bierze udział w
  konsensusie / nagrodach za uptime,
- **tryb tylko portfelowy** – aplikacja służy wyłącznie jako portfel, wykorzystując zdalne
  węzły bramkowe.

W trybie light:

- aplikacja utrzymuje połączenia P2P w tle,
- okresowo pobiera nowe nagłówki i dowody stanu,
- bierze udział w konsensusie i pomiarach uptime.

Użytkownik może w ustawieniach określić:

- godziny pracy węzła,
- czy węzeł może działać tylko przy ładowaniu,
- czy dopuszczalne jest korzystanie z danych komórkowych i w jakich limitach.

Na iOS, ze względu na ograniczenia pracy w tle:

- aplikacja wspiera wariant, w którym wybudza się okresowo,
- synchronizuje nagłówki i uczestniczy w uproszczonych pomiarach uptime,
- intensywniejsza praca ma miejsce głównie, gdy użytkownik aktywnie korzysta z aplikacji.

Na Androidzie możliwe jest utrzymywanie stałego procesu w tle z powiadomieniem systemowym
informującym, że węzeł pracuje.

## 5.3. Aplikacja desktopowa

Aplikacja desktopowa (Windows, Linux, macOS) może działać jako:

- **pełny węzeł** – z pełną historią bloków,
- **węzeł częściowy (pruned)** – przechowujący tylko ostatnią historię i niezbędny stan.

Użytkownik w interfejsie graficznym może:

- ustawić ścieżkę danych,
- skonfigurować limity zużycia dysku,
- wybrać porty sieciowe,
- włączyć/wyłączyć rolę węzła bramkowego (API).

Na serwerach aplikacja może działać:

- bez interfejsu GUI,
- jako usługa systemowa z konfiguracją w pliku tekstowym lub w zmiennych środowiskowych.

## 5.4. Panel użytkownika

Zarówno na urządzeniach mobilnych, jak i desktopowych, BulenNode udostępnia panel
użytkownika, który pokazuje:

- aktualną wysokość bloku,
- liczbę połączonych peerów,
- szacowane zużycie danych,
- aktualny stake przypisany do węzła,
- ocenę reputacji,
- historii nagród (np. wykres z ostatnich dni).

Dzięki temu użytkownik może ocenić, czy utrzymywanie węzła jest dla niego opłacalne.

# 6. Wymagania techniczne dla węzłów

## 6.1. Minimalne wymagania sprzętowe

**Dla węzła mobilnego**:

- typowy smartfon z ostatnich 5 lat,
- co najmniej 3 GB RAM,
- kilkaset MB wolnego miejsca na dane,
- zużycie CPU na poziomie kilku procent w typowych warunkach,
- agresywne korzystanie z mechanizmów oszczędzania energii.

**Dla węzła desktopowego / serwerowego**:

- co najmniej 4 GB RAM,
- kilka GB wolnego miejsca na dysku,
- stałe połączenie z Internetem,
- w konfiguracjach serwerowych – zalecany osobny dysk na dane łańcucha.

Protokół przewiduje stopniowe zwiększanie rozmiaru łańcucha, dlatego:

- aplikacja obsługuje przycinanie historii (pruning),
- przechowuje kluczowe punkty kontrolne (checkpoints),
- ogranicza zajętość dysku przez archiwalne dane.

## 6.2. Wymagania sieciowe

Sieć BulenCoin wymaga stałego dostępu do Internetu dla węzłów, które chcą otrzymywać
nagrody za uptime.

- Węzeł mobilny może działać na Wi‑Fi lub sieci komórkowej (z możliwością wyłączenia
  danych mobilnych).
- Węzły desktopowe i serwerowe powinny mieć publiczne lub przekierowane porty, aby mogły
  działać jako pełnoprawne węzły P2P.
- Dla użytkowników domowych przewidziano mechanizmy przechodzenia przez NAT, np. hole
  punching.

# 7. Model ekonomiczny węzłów

## 7.1. Składniki przychodów węzła

Przychód węzła składa się z:

- **nagrody blokowej** (dla producenta bloku i komitetu),
- **udziału w opłatach transakcyjnych**,
- **nagrody za uptime**.

W fazie wczesnego rozruchu:

- nagroda bazowa może być wyższa, aby mocniej wynagradzać pionierów,
- później udział nagrody bazowej maleje, a większą rolę przejmują opłaty wynikające z
  realnego użycia sieci.

Nagroda za uptime:

- jest rozdzielana na podstawie losowania próbek węzłów,
- rośnie wraz z długością i stabilnością czasu online,
- jest estymowana przez aplikację w formie prostego kalkulatora, z wyraźną informacją,
  że nie gwarantuje zysku.

## 7.2. Koszty po stronie użytkownika

Po stronie użytkownika kosztami są:

- zużycie energii elektrycznej,
- transfer danych,
- ewentualne zużycie sprzętu,
- ryzyko utraty części stake w przypadku błędnej konfiguracji lub złego zachowania węzła.

Aplikacja BulenNode powinna:

- prezentować szacunkowe zużycie energii (np. na podstawie statystyk systemowych),
- pokazywać dane o transferze,
- ostrzegać o ryzyku utraty stake (slashing),
- domyślnie działać w trybie konserwatywnym na urządzeniach mobilnych.

# 8. Proces setupu sieci i węzłów

## 8.1. Faza testnet

Pierwszy etap uruchomienia BulenCoin to sieć testowa (testnet).

W testnecie:

- działają węzły referencyjne utrzymywane przez zespół,
- użytkownicy mogą instalować aplikacje BulenNode i testować utrzymywanie węzłów bez
  wartości ekonomicznej,
- zbierane są anonimowe statystyki o rozkładzie typów urządzeń, uptime i konfiguracji.

Cel testnetu:

- sprawdzenie zachowania sieci na różnych klasach sprzętu,
- dopracowanie parametrów konsensusu i modelu nagród,
- wykrycie problemów z wydajnością i stabilnością.

## 8.2. Faza mainnet bootstrap

Po zakończeniu testnetu uruchamiana jest sieć główna (mainnet).

W fazie bootstrap:

- głównymi producentami bloków są pełne węzły zarządzane przez zespół i społeczność z
  dużym stake i stabilnym łączem,
- równolegle rozwijana jest sieć węzłów mobilnych i desktopowych użytkowników,
- działa program nagród za uptime, zachęcający do utrzymywania węzłów online.

Instrukcja setupu węzła mobilnego:

- pobranie aplikacji ze sklepu lub z oficjalnej strony,
- wygenerowanie portfela i zapisanie seed phrase,
- włączenie trybu węzła,
- konfiguracja limitów (bateria, transfer),
- ewentualne delegowanie stake do walidatorów.

Instrukcja setupu węzła desktopowego:

- pobranie instalatora lub paczki binarnej,
- konfiguracja ścieżki danych i portów sieciowych,
- wybór trybu pracy (pełny / częściowy),
- decyzja, czy węzeł ma pełnić rolę bramki API,
- opcjonalne skrypty dla serwerów w chmurze (systemd, Docker).

## 8.3. Faza pełnej decentralizacji

Po ustabilizowaniu sieci:

- udział węzłów referencyjnych w konsensusie jest stopniowo redukowany parametrami
  protokołu,
- rośnie udział węzłów społeczności z historią poprawnego zachowania i stake,
- węzły zespołu skupiają się na:
  - eksploratorach bloków,
  - węzłach archiwalnych,
  - dodatkowych narzędziach i infrastrukturze wspierającej.

Docelowy stan:

- BulenCoin jest utrzymywany przez rozproszoną sieć węzłów należących do użytkowników
  końcowych,
- infrastruktura zespołu pełni funkcje pomocnicze, a nie centralne.

# 9. Bezpieczeństwo sieci i węzłów

## 9.1. Ochrona kluczy prywatnych

Wszystkie węzły BulenCoin przechowują klucze prywatne użytkownika, które umożliwiają:

- podpisywanie transakcji,
- udział w konsensusie.

Aplikacje muszą stosować:

- szyfrowanie magazynu kluczy mocnym hasłem,
- integrację z zabezpieczeniami systemowymi (Android Keystore, iOS Secure Enclave),
- możliwość użycia portfeli sprzętowych w aplikacjach desktopowych.

UI musi jasno komunikować, że:

- utrata seed phrase oznacza utratę dostępu do środków,
- udostępnienie seeda komukolwiek jest bezpośrednim zagrożeniem dla środków.

## 9.2. Obrona przed atakami Sybil i DDoS

Sieć z dużą liczbą tanich węzłów jest podatna na ataki Sybil (wiele fałszywych węzłów).

Mechanizmy ochrony:

- udział w konsensusie wymaga stake,
- selekcja węzłów do komitetów uwzględnia stake i reputację,
- węzły często niedostępne lub zachowujące się podejrzanie otrzymują niższą reputację.

Warstwa sieciowa stosuje:

- rate limiting,
- losowanie peerów,
- filtrowanie ruchu,
- ograniczanie liczby połączeń z jednego zakresu adresów.

Węzły bramkowe mogą dodatkowo:

- wprowadzać limity zapytań,
- wymagać prostych zadań typu proof of work przy nawiązywaniu sesji.

## 9.3. Aktualizacje protokołu

Sieć BulenCoin musi umożliwiać aktualizacje bez centralnego wyłączania.

- aktualizacje oprogramowania odbywają się poprzez pobieranie nowych wersji klienta z
  oficjalnych źródeł,
- zmiany wymagające hard forka są ogłaszane z wyprzedzeniem,
- aplikacje zawierają mechanizmy ostrzegające użytkowników o:
  - zbliżających się krytycznych aktualizacjach,
  - terminach, po których stara wersja klienta przestaje być kompatybilna.

# 10. Infrastruktura wspomagająca

Do pełnego działania ekosystemu BulenCoin potrzebne są dodatkowe komponenty:

- **eksplorator bloków** – przeglądanie transakcji i bloków przez przeglądarkę,
- **oficjalny serwis statusu** – aktualny stan sieci, informacje o problemach, prace
  serwisowe,
- **system telemetryczny** – anonimowe statystyki wydajności, uptime, typów urządzeń i
  ruchu.

System telemetryczny:

- jest od początku projektowany w duchu minimalizacji danych,
- nie pozwala na identyfikację pojedynczych użytkowników,
- służy do kalibracji parametrów sieci (np. współczynniki dla klas urządzeń).

# 11. Podsumowanie

BulenCoin, jako memcoin z ambicją techniczną, ma być dowodem, że nowoczesna sieć
kryptowalutowa może opierać się na szerokim spektrum sprzętu, a nie tylko na
wyspecjalizowanych serwerach i koparkach.

Projekt przewiduje:

- lekkie węzły mobilne,
- pełne węzły desktopowe i serwerowe,
- węzły bramkowe,
- model ekonomiczny z nagrodami za uptime i mechanizmem slashing.

Dokument ten stanowi punkt wyjścia do:

- dalszego uszczegółowienia protokołu,
- implementacji referencyjnych klientów,
- zaprojektowania dokładnych parametrów ekonomicznych sieci BulenCoin.
