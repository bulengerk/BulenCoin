# Ubuntu provisioning for BulenNode (bare-metal/VM)

Use this checklist or automate via `scripts/install/provision_ubuntu_node.sh`. It sets up a dedicated user, firewall rules, systemd unit, logrotate, and daily backups. You must still copy the BulenNode build and fill secrets.

## Quick script (per node)

Run as root (or sudo):

```bash
APP_USER=bulen \
APP_DIR=/opt/bulen \
DATA_DIR=/var/lib/bulen \
HTTP_PORT=4100 P2P_PORT=4101 \
scripts/install/provision_ubuntu_node.sh
```

Then:

```bash
# copy build to /opt/bulen (or set BIN_PATH env to your binary/script)
rsync -av dist/bulennode/ root@node:/opt/bulen/
# edit tokens/keys
sudo nano /etc/bulen/env
sudo systemctl daemon-reload
sudo systemctl enable --now bulennode
sudo systemctl status bulennode
```

`/etc/bulen/env` includes required tokens/keys and disables unsigned blocks/faucet by default. Logrotate: `/var/log/bulennode/*.log` daily, 7 rotations. Backups: `/var/backups/bulen-YYYY-MM-DD.tar.gz`, keep 14 days.

## Applying to 5 or 10 machines (example loops)

Assuming SSH access as root and your build in `dist/bulennode/`:

```bash
NODES_5=("10.0.0.11" "10.0.0.12" "10.0.0.13" "10.0.0.14" "10.0.0.15")
for host in "${NODES_5[@]}"; do
  ssh root@"$host" "APP_USER=bulen APP_DIR=/opt/bulen DATA_DIR=/var/lib/bulen HTTP_PORT=4100 P2P_PORT=4101 bash -s" < scripts/install/provision_ubuntu_node.sh
  rsync -av dist/bulennode/ root@"$host":/opt/bulen/
  # replace per-node keys/tokens:
  ssh root@"$host" "sed -i 's/changeme-status/...' /etc/bulen/env; sed -i 's/changeme-p2p/...' /etc/bulen/env; sed -i 's/changeme-metrics/...' /etc/bulen/env"
  ssh root@"$host" "systemctl daemon-reload && systemctl enable --now bulennode"
done
```

For 10 nodes, extend the array. If you need unique ports, set `HTTP_PORT/P2P_PORT` per host in the loop.

## What the script configures

- Creates system user `bulen` (no shell), dirs `/opt/bulen`, `/var/lib/bulen`, `/etc/bulen`.
- ufw rules for HTTP/P2P ports (TCP + UDP on P2P).
- `/etc/bulen/env` template with `BULEN_SECURITY_PRESET=strict`, tokens required, faucet off, `BULEN_ALLOW_UNSIGNED_BLOCKS=false`.
- Systemd unit `/etc/systemd/system/bulennode.service` (uses `$APP_DIR/bulennode/src/index.js` by default; set `BIN_PATH` if different).
- Logrotate `/etc/logrotate.d/bulennode` and daily backup cron `/etc/cron.daily/bulen-backup`.

## Verification

After start:

```bash
curl -H "x-bulen-status-token: <STATUS_TOKEN>" http://<host>:4100/api/status
journalctl -u bulennode -n 50
```

Ensure `checkpoint.snapshotHash` matches published release values (see `docs/genesis_and_release_signing.md`).
