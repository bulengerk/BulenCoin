# Upgrade and rollback runbook

Goal: safely move BulenNode from version N to N+1, verify compatibility, and roll back if needed. Assumes systemd deployment (see `docs/provisioning_ubuntu.md`) and tokens enabled.

## Preflight

- Download new artifacts and verify checksums/signature (see `docs/genesis_and_release_signing.md`).
- Confirm protocol major compatibility: if `BULEN_PROTOCOL_VERSION` major changes, plan a coordinated network upgrade; otherwise, in-place restart is allowed.
- Capture current status: `curl -H "x-bulen-status-token: $STATUS_TOKEN" http://localhost:4100/api/status | jq '.height,.finalizedHeight,.protocolVersion,.checkpoint.snapshotHash'`.
- Create backup/snapshot: `sudo tar -czf /var/backups/bulen-preupgrade-$(date +%F).tar.gz /var/lib/bulen` (daily cron already does this, but take an extra one right before upgrade).

## Upgrade steps

1) Stop service:
```bash
sudo systemctl stop bulennode
```

2) Replace binary/build under `/opt/bulen` (or your `APP_DIR`):
```bash
sudo rsync -av /tmp/new-bulennode/ /opt/bulen/
sudo chown -R bulen:bulen /opt/bulen
```

3) (Optional) Bump protocol version/env if required:
```bash
sudo sed -i 's/^BULEN_PROTOCOL_VERSION=.*/BULEN_PROTOCOL_VERSION=0.1.1/' /etc/bulen/env
```

4) Start service:
```bash
sudo systemctl start bulennode
sudo systemctl status bulennode
```

5) Verify post-upgrade:
- `curl -H "x-bulen-status-token: $STATUS_TOKEN" http://localhost:4100/api/status | jq '.height,.finalizedHeight,.protocolVersion,.checkpoint.snapshotHash'`
- Ensure `checkpoint.snapshotHash` unchanged and `height` continues to grow.
- Check logs for protocol warnings or P2P rejects.

## Rollback

If issues appear immediately post-upgrade:
1) Stop service: `sudo systemctl stop bulennode`
2) Restore backup: `sudo rm -rf /var/lib/bulen && sudo tar -xzf /var/backups/bulen-preupgrade-*.tar.gz -C /`
3) Restore previous binary: `rsync -av /tmp/old-bulennode/ /opt/bulen/`
4) Start service and verify status/finality as in post-upgrade.

## Protocol compatibility check (quick local)

- Same major should be accepted (tested by `scripts/tests/protocol_version_compat.test.js`): headers `x-bulen-protocol-version: 1.x` OK; `2.x` rejected with 400.
- Before upgrading protocol major across the network:
  - Stage a canary node with the new binary and same major; confirm it syncs and serves `/api/status`.
  - For major bumps, coordinate a network-wide window; ensure peers are updated to avoid P2P 400s.

## 5/10 node verification (VMs)

- Provision nodes via `scripts/install/provision_ubuntu_node.sh` (set ports per host if needed).
- For each host:
  - Baseline: start old build, record `height`/`snapshotHash`.
  - Upgrade: deploy new build, restart, confirm `height` progresses and `checkpoint.snapshotHash` matches baseline.
- If running a small committee, keep at least one node on old version to observe mixed-version behavior (only if protocol major unchanged).
