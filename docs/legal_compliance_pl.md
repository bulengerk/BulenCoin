---
title: BulenCoin – aspekty prawne i zgodność z prawem
language: pl
---

> Uwaga: poniższy dokument ma charakter informacyjny i techniczny. Nie stanowi porady
> prawnej ani podatkowej. Przed uruchomieniem produkcyjnej sieci lub prowadzeniem
> działalności opartej o BulenCoin należy skonsultować się z prawnikiem znającym prawo
> polskie i europejskie (w szczególności regulacje dotyczące kryptoaktywów, usług
> finansowych i ochrony danych osobowych).

# 1. Ogólne założenia prawne

Projekt BulenCoin jest opisany w tym repozytorium jako:

- eksperymentalna koncepcja sieci kryptowalutowej,
- zestaw materiałów technicznych i demonstracyjnych (prototypowy węzeł w Node.js,
  eksplorator bloków),
- **bez**:
  - emisji tokenów w ramach tego repozytorium,
  - ofert inwestycyjnych,
  - gwarancji zysku.

Z tego powodu:

- sam kod i dokumentacja nie stanowią oferty nabycia kryptoaktywów,
- uruchomienie węzła przez użytkownika jest działaniem technicznym, za które odpowiada
  sam użytkownik (operator węzła).

# 2. Kryptoaktywa i regulacje UE (w zarysie)

Na poziomie Unii Europejskiej obowiązują i wchodzą w życie regulacje dotyczące
kryptoaktywów, w tym m.in.:

- rozporządzenie MiCA (Markets in Crypto‑Assets), regulujące m.in. emisję i ofertę
  kryptoaktywów oraz świadczenie usług na rynku kryptoaktywów,
- przepisy dotyczące przeciwdziałania praniu pieniędzy i finansowaniu terroryzmu (AML/CFT),
- prawo krajowe poszczególnych państw członkowskich UE.

Istotne konsekwencje:

- sama implementacja protokołu i uruchomienie węzła na własny użytek co do zasady nie musi
  oznaczać świadczenia regulowanych usług finansowych,
- w momencie:
  - publicznej emisji tokenów,
  - prowadzenia giełdy lub kantoru,
  - świadczenia usług powierniczych (custodial wallet),
  - pośrednictwa w obrocie kryptoaktywami,
  operator / organizator może wejść w zakres regulacji (MiCA, przepisy krajowe).

Projekt BulenCoin w dokumentacji:

- nie definiuje ani nie opisuje procesu sprzedaży tokenów,
- nie nakazuje operatorom przechowywania środków klientów (portfele są non‑custodial),
- podkreśla eksperymentalny charakter sieci i brak gwarancji zysku.

Mimo to, każdy podmiot planujący realne wdrożenie (szczególnie komercyjne) powinien:

- uzyskać niezależną opinię prawną,
- zweryfikować, czy jego działalność nie wymaga licencji, rejestracji lub zgłoszeń do
  właściwych organów nadzoru.

# 3. Ochrona danych osobowych (RODO/GDPR)

BulenCoin jest projektowany z myślą o minimalizacji danych:

- węzły komunikują się w sieci P2P na podstawie adresów IP i identyfikatorów węzłów,
- stan łańcucha zawiera adresy i kwoty, a nie dane osobowe,
- w dokumentacji telemetrycznej (specyfikacja) zakłada się anonimizację i agregację.

W praktycznym wdrożeniu należy jednak założyć, że:

- adres IP urządzenia może być uznany za dane osobowe,
- logi serwera gateway (API) mogą zawierać identyfikatory użytkowników, nagłówki, adresy,
- dane telemetryczne, jeśli pozwalają na profilowanie użytkownika, mogą podlegać RODO.

Zalecenia dla operatorów węzłów i infrastruktury:

- ograniczać logi do niezbędnego minimum, stosować anonimizację lub pseudonimizację,
- ustalić czas retencji logów i dbać o ich bezpieczne przechowywanie,
- jeśli zbierane są dane identyfikujące użytkowników (np. przy rejestracji w usłudze
  bramkowej), należy:
  - poinformować użytkowników o zasadach przetwarzania danych (polityka prywatności),
  - zapewnić podstawy prawne przetwarzania (zgoda, umowa, obowiązek prawny),
  - umożliwić realizację praw osób, których dane dotyczą (dostęp, usunięcie, sprzeciw).

Prototypowa implementacja węzła BulenNode w tym repozytorium:

- nie zawiera modułu telemetrycznego,
- ma pole konfiguracyjne `BULEN_TELEMETRY_ENABLED`, które domyślnie jest wyłączone,
- pozostawia implementację telemetryki po stronie przyszłego, docelowego klienta.

# 4. Odpowiedzialność podatkowa

W Polsce (i innych krajach UE) obrót kryptoaktywami może rodzić skutki podatkowe, m.in.:

- podatek dochodowy (PIT/CIT) od zysków kapitałowych,
- możliwe obowiązki ewidencyjne (np. dokumentowanie transakcji),
- potencjalne kwestie VAT w przypadku świadczenia usług.

Projekt BulenCoin:

- nie zawiera mechanizmu księgowania ani raportowania podatkowego,
- nie prowadzi ksiąg transakcji użytkowników poza łańcuchem (off‑chain),
- nie zbiera informacji o rezydencji podatkowej uczestników.

Użytkownicy i operatorzy:

- sami odpowiadają za rozpoznanie swoich obowiązków podatkowych,
- powinni konsultować się z doradcą podatkowym w swojej jurysdykcji.

# 5. Bezpieczeństwo użytkownika i ostrzeżenia inwestycyjne

W repozytorium i na stronie WWW bulencoin:

- wyraźnie wskazano, że:
  - projekt ma charakter eksperymentalny,
  - nie ma gwarancji zysku,
  - utrata seed phrase oznacza utratę środków,
  - błędna konfiguracja węzła może prowadzić do strat (np. slashing),
- podkreślono, że treści nie stanowią porady inwestycyjnej.

Rekomendacje:

- nie traktować BulenCoin jako produktu oszczędnościowego lub inwestycyjnego bez
  zrozumienia ryzyka,
- nie składać obietnic zysku użytkownikom końcowym bez uprzedniego przeanalizowania
  konsekwencji prawnych,
- jasno komunikować ryzyko techniczne i ekonomiczne w materiałach marketingowych.

# 6. Minimalne dobre praktyki zgodności

Dla zespołu rozwijającego BulenCoin i operatorów węzłów:

- **rozgraniczenie ról**:
  - kod otwarto‑źródłowy i specyfikacja jako projekt techniczny,
  - ewentualne usługi (np. giełda, portfel custodialny) jako osobno regulowana działalność,
- **polityki wewnętrzne**:
  - polityka bezpieczeństwa IT (backupy, zarządzanie kluczami),
  - polityka prywatności (dla usług HTTP/API),
  - procedury reagowania na incydenty,
- **transparentność**:
  - jawne informowanie, kto stoi za daną instancją węzła bramkowego (firma, osoba fizyczna),
  - publikowanie informacji o aktualizacjach i znanych podatnościach.

Wdrożenie produkcyjne powinno być poprzedzone:

- analizą prawną (MiCA, AML, prawo krajowe),
- audytem bezpieczeństwa implementacji,
- przynajmniej podstawowym testowaniem obciążeniowym i scenariuszami awaryjnymi.

