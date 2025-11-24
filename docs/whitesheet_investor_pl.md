# BulenCoin – whitesheet dla inwestorów

Dokument streszcza założenia projektu BulenCoin z perspektywy inwestora: problem, produkt, rynek, model ekonomiczny, bezpieczeństwo oraz plan wdrożeniowy.

## W skrócie

- **Cel:** udowodnić, że pełna sieć PoS może działać na powszechnych urządzeniach (telefony, laptopy, serwery) z przewidywalnymi nagrodami za uptime.  
- **Produkt:** klient BulenNode (mobilny, desktopowy, gateway), eksplorator bloków, status page i zestaw instalatorów/systemd.  
- **Stan:** działający prototyp (HTTP API, produkcja bloków, prosta nagroda za uptime), komplet dokumentacji technicznej i bezpieczeństwa, strona www z i18n.  
- **Model:** inflacyjna nagroda bazowa + opłaty transakcyjne + jawna nagroda za dostępność; preferencja dla tańszych urządzeń, aby sieć była zdywersyfikowana sprzętowo.  
- **Roadmap:** publiczny testnet → bootstrap mainnetu z mieszanym zestawem węzłów → stopniowa decentralizacja komitetów walidatorów.  
- **Potrzeby:** finansowanie na rozwój pełnego klienta, UX mobilny/desktopowy, audyty bezpieczeństwa i bootstrap infrastruktury testnetu.

## Problem

Dzisiejsze sieci L1 wymagają kosztownego sprzętu lub scentralizowanych dostawców RPC. Użytkownicy, którzy chcą wspierać sieć, zderzają się z wysokimi kosztami energii, dysku i stałym nadzorem operacyjnym. W efekcie rośnie centralizacja i bariera wejścia.

## Propozycja wartości

- **Uptime jako produkt:** sieć wynagradza realną dostępność na typowych urządzeniach – nie tylko stake.  
- **Lekki klient:** jeden kod bazowy działa na telefonach, laptopach i serwerach; parametry (porty, limity, faucet) dobierane są per profil.  
- **Doświadczenie użytkownika:** tryby nocne / Wi‑Fi‑only na mobile, limity dysku na desktopie, instalatory i systemd na serwerach.  
- **Koszty przewidywalne:** energooszczędny PoS, małe komitety, brak GPU/ASIC.

## Produkt i architektura

- **BulenNode:** modularny klient (networking, konsensus PoS, storage, wallet, monitor zasobów) z P2P przez HTTP, podpisami ECDSA i mechanizmem reputacji.  
- **Profile urządzeń:** `mobile-light`, `desktop-full`, `server-full`, `raspberry`, `gateway` – każdy ma osobne porty, wagi nagród i ustawienia faucet.  
- **Warstwa danych:** nagłówki + stan kont + mempool; bloki zawierają transakcje z opłatą i stake walidatora.  
- **Infrastruktura web:** eksplorator, status page, statyczna strona z i18n, skrypty instalacyjne i obrazy Docker.  
- **Bezpieczeństwo:** ograniczenie rozmiaru JSON, opcjonalny wymóg podpisów, token P2P, rate limiting, zalecenia hardeningu w `docs/security_hardening_pl.md`.

## Model ekonomiczny

- **Źródła nagród:** inflacyjny blok + fee + eksplicytna nagroda za uptime kalibrowana do klasy urządzenia.  
- **Reputacja i różnorodność:** rzadkie profile (np. telefony) dostają niewielki boost selekcji, co utrzymuje heterogeniczność sieci.  
- **Slashing:** kary za podwójne podpisy i inne próby ataku; reputacja obniża szansę wyboru do komitetu.  
- **Delegacja:** użytkownicy mobile mogą delegować stake do walidatorów pełnych, zachowując uproszczony UX.

## Rynek i zastosowania

- **Segmenty:** entuzjaści krypto z urządzeniami always‑on, posiadacze starszych telefonów/SBC, operatorzy małych serwerów oraz integratorzy potrzebujący lekkiej sieci PoS.  
- **Use‑case’y:** mikropłatności, API dla gier i aplikacji mobilnych, edukacyjne wdrożenia PoS, eksperymenty badawcze z dywersyfikacją sprzętową.

## Strategia wejścia na rynek

- **Testnet otwarty:** szybka dystrybucja klienta z faucetem, program nagród za uptime, leaderboard.  
- **Partnerzy sprzętowi:** obrazy dla Raspberry Pi i mini‑serwerów; instalatory desktopowe i paczki mobilne.  
- **Społeczność:** dokumentacja w trzech językach, prosty onboarding na stronie, kampanie edukacyjne o bezpieczeństwie kluczy.  
- **Ekosystem:** wczesne API dla zewnętrznych portfeli i giełd, gotowy gateway node.

## Roadmap operacyjny

1. **Faza 0 – prototyp (ukończone):** HTTP API, produkcja bloków, eksplorator/status, dokumentacja i strona.  
2. **Faza 1 – publiczny testnet:** audyty bezpieczeństwa, telemetria minimalizująca dane, kampania mobilna/desktopowa, program uptime rewards.  
3. **Faza 2 – bootstrap mainnetu:** mieszana pula węzłów zespołu i społeczności, ograniczone parametry centralizacji, wdrożenie delegacji stake.  
4. **Faza 3 – decentralizacja:** redukcja udziału węzłów zespołu, rozszerzone komitety walidatorów, governance nad parametrami nagród.

## Bezpieczeństwo i zgodność

- **Operacyjne:** separacja użytkowników systemowych, firewall/TLS, limity żądań, kontrola pochodzenia (CORS).  
- **Prawne:** analiza MiCA/AML/RODO na poziomie koncepcyjnym (zawarta w `docs/legal_compliance_pl.md`); jasne ostrzeżenie, że projekt ma charakter eksperymentalny.  
- **Prywatność:** brak telemetryki domyślnie; planowane są zgody użytkownika i minimalizacja danych w przyszłych wersjach.

## Model finansowania i wykorzystanie środków

- **Rozwój produktu (40%):** pełny klient (storage, konsensus, sieć), aplikacje mobilne/desktopowe, UX, audyty kodu.  
- **Infrastruktura (25%):** bootstrap testnetu/mainnetu, monitoring, CDN dla binariów, infrastruktura CI i testów integracyjnych.  
- **Bezpieczeństwo i compliance (20%):** audyty zewnętrzne, procesy SDLC, konsultacje prawne.  
- **Ekosystem i community (15%):** granty dla integratorów, hackathony, materiały edukacyjne.

## Kluczowe KPI

- Liczba aktywnych węzłów w testnecie/mainnecie z podziałem na klasy urządzeń.  
- Średni uptime i czas finalizacji bloku.  
- Udział społecznościowych walidatorów w produkcji bloków (decentralizacja).  
- Wolumen transakcji i liczba integracji API/gateway.

## Wezwanie do działania

Szukamy partnerów finansowych i technologicznych na fazę testnetu → mainnet bootstrap. Jesteśmy gotowi do audytów i pilotaży na sprzęcie partnerów. Kontakt: core@bulencoin.example (tymczasowy alias do ustalenia z inwestorami).
