# Ongoing: priorytety wobec BTC/ETH

To nie jest porada inwestycyjna; lista braków/priorytetów wobec dojrzałych sieci (Bitcoin/Ethereum).

## Konsensus/finality
- Obecnie: mały komitet, dopuszczalne pojedyncze certyfikaty (dev), brak pełnego quorum podpisów i slashing. Priorytet: włączyć pełne certyfikaty komitetu, slashing i wymuszać `allowSingleValidatorCert=false` w prod.
- Finality checkpointy: dopiąć podpisy całego komitetu na snapshotach; publikować hash + podpisy w releasach.

## Permissioning
- Obecnie: deterministyczny genesis, brak permissionless onboardingu walidatorów. Decyzja: albo jasno permissioned (onboarding podpisany), albo dodać rejestr walidatorów + stake on-chain.

## Opłaty/mempool
- Obecnie: stałe opłaty i nagrody; brak rynku opłat → podatne na spam. Priorytet: model gas/priority fee (EIP-1559‑like) i lepsze zarządzanie mempoolem (pruning/fee floor).

## Skalowanie
- Brak L2/shardów; jeden łańcuch. Akceptowalne w MVP, ale potrzebny plan: rollupy, batching, limit TPS vs. hardware.

## Bezpieczeństwo P2P/HTTP
- Dodane: tokeny P2P, opcjonalne TLS/mTLS/QUIC, rate limit per peer, ban za zły cert; HTTP CSP/HSTS/nosniff/deny frame. Utrzymać w prod, dodać cert pinning i rotację tokenów w pipeline.

## Operacje/observability
- Mamy provision (systemd/logrotate/backup), alerty Prometheus, runbooki. Priorytet: wdrożyć w realnej infrastrukturze (5/10 node), dashboardy Grafana, logi scentralizowane (Loki/ELK).

## Roadmap krótkoterminowa
1) Włączyć wymaganie pełnych certyfikatów komitetu + slashing w prod; testy z quorum drop.
2) Dodać fee market + mempool fee floor, testy spam/DoS.
3) Określić model permissioned vs. permissionless i proces onboardingu walidatorów.
4) Publikować podpisane snapshoty (hash + podpisy komitetu) w releasach.
5) Ustawić monitoring/alerty w środowisku 5/10 węzłów (dashboardy, logi).
