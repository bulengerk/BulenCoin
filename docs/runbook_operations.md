# Runbook: operacje BulenNode

## Start/stop/restart (systemd)

```bash
sudo systemctl start bulennode
sudo systemctl stop bulennode
sudo systemctl restart bulennode
sudo systemctl status bulennode
journalctl -u bulennode -n 100 -f   # tail logs
```

## Recovery z backupu/snapshotu

1. Zatrzymaj usługę: `sudo systemctl stop bulennode`.
2. Przywróć backup (`/var/backups/bulen-YYYY-MM-DD.tar.gz` lub inny snapshot):
   ```bash
   sudo tar -xzf /var/backups/bulen-YYYY-MM-DD.tar.gz -C /
   # lub jeśli snapshot w innym miejscu:
   sudo rm -rf /var/lib/bulen && sudo tar -xzf snapshot.tar.gz -C /var/lib
   sudo chown -R bulen:bulen /var/lib/bulen
   ```
3. Zweryfikuj checksum/hash snapshotu:
   ```bash
   jq .checkpoint.snapshotHash /var/lib/bulen/state.json
   # porównaj z opublikowanym hash (docs/genesis_and_release_signing.md)
   ```
4. Uruchom usługę: `sudo systemctl start bulennode`.
5. Sprawdź status/finality: `curl -H "x-bulen-status-token: <STATUS_TOKEN>" http://localhost:4100/api/status | jq '.height, .finalizedHeight, .checkpoint.snapshotHash'`.

## Rotacja kluczy i tokenów

- **P2P/status/metrics tokens**: edytuj `/etc/bulen/env` (`BULEN_P2P_TOKEN`, `BULEN_STATUS_TOKEN`, `BULEN_METRICS_TOKEN`), następnie:
  ```bash
  sudo systemctl restart bulennode
  ```
  Rozpropaguj nowe wartości do peerów/monitoringu.
- **Klucz walidatora**: ustaw `BULEN_NODE_PRIVATE_KEY` w `/etc/bulen/env` (PEM) lub podmień `BULEN_NODE_KEY_FILE`, zachowując uprawnienia 600. Restart usługi jak wyżej. Uwaga: zmiana klucza zmienia adres walidatora; w sieci produkcyjnej wymaga rekonfiguracji/unstake/stake zgodnie z polityką.
- **Genesis validators**: nie rotuje się po starcie sieci; do nowych sieci ustaw `BULEN_GENESIS_VALIDATORS` przed pierwszym uruchomieniem.

## Procedura incydentowa (skrót)

1. **Izolacja**: jeśli node podejrzanie się zachowuje, `sudo systemctl stop bulennode`; odetnij P2P porty w firewall (ufw deny 4101/tcp/udp).
2. **Zbieranie danych**: skopiuj logi (`journalctl -u bulennode > incident.log`), `state.json` i `data` snapshot; zanotuj wersję (`/api/status -> protocolVersion`).
3. **Analiza**: sprawdź hash snapshotu vs opublikowany, porównaj binarkę z checksumą release; przeskanuj logi pod kątem 5xx, invalid signatures, stale finality.
4. **Odtworzenie**: przywróć ze znanego snapshotu (patrz sekcja recovery) lub uruchom świeży node z deterministycznym genesis + catch-up.
5. **Rotacja sekretów**: zmień tokens (status/metrics/P2P), rozważ nowy klucz walidatora; zaktualizuj monitoring, runbooki peera.
6. **Powrót do ruchu**: po weryfikacji stanu uruchom `systemctl start bulennode`, monitoruj alerty (lack of height growth, stale finality, 5xx/429).

## Szybkie checki zdrowia

- `curl -H "x-bulen-status-token: <STATUS_TOKEN>" http://localhost:4100/api/status`
- `curl -H "x-bulen-metrics-token: <METRICS_TOKEN>" http://localhost:4100/metrics | head`
- Logi: `journalctl -u bulennode -n 50`
- Finality: `jq '.finalizedHeight, .checkpoint.snapshotHash' <<< "$(curl -s -H "x-bulen-status-token: <STATUS_TOKEN>" http://localhost:4100/api/status)"`
