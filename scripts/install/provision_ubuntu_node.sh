#!/usr/bin/env bash
# Idempotent-ish provisioning for Ubuntu hosts to run BulenNode as systemd service.
# Does not start the service; sets up user, directories, firewall, logrotate, and placeholders
# for env/config. Run as root (or via sudo) on each node.

set -euo pipefail

APP_USER="${APP_USER:-bulen}"
APP_GROUP="${APP_GROUP:-bulen}"
APP_DIR="${APP_DIR:-/opt/bulen}"
DATA_DIR="${DATA_DIR:-/var/lib/bulen}"
BIN_PATH="${BIN_PATH:-$APP_DIR/bulennode}" # expected to exist or be copied later
SERVICE_NAME="${SERVICE_NAME:-bulennode}"
HTTP_PORT="${HTTP_PORT:-4100}"
P2P_PORT="${P2P_PORT:-4101}"

info() { echo "[INFO] $*"; }
warn() { echo "[WARN] $*" >&2; }

require_root() {
  if [[ $EUID -ne 0 ]]; then
    echo "Run as root (sudo)"; exit 1;
  fi
}

create_user() {
  if ! id "$APP_USER" >/dev/null 2>&1; then
    info "Creating user/group $APP_USER"
    useradd --system --create-home --shell /usr/sbin/nologin "$APP_USER"
  fi
}

install_deps() {
  info "Installing base packages"
  apt-get update -qq
  apt-get install -y curl ca-certificates ufw logrotate
}

setup_dirs() {
  info "Preparing directories"
  mkdir -p "$APP_DIR" "$DATA_DIR" /etc/bulen
  chown -R "$APP_USER:$APP_GROUP" "$APP_DIR" "$DATA_DIR"
  chmod 750 "$APP_DIR" "$DATA_DIR"
}

setup_firewall() {
  if command -v ufw >/dev/null 2>&1; then
    info "Configuring ufw rules"
    ufw allow "${HTTP_PORT}/tcp" >/dev/null || true
    ufw allow "${P2P_PORT}/tcp" >/dev/null || true
    ufw allow "${P2P_PORT}/udp" >/dev/null || true
  else
    warn "ufw not installed; skipping firewall rules"
  fi
}

setup_env_file() {
  local env_file="/etc/bulen/env"
  if [[ ! -f "$env_file" ]]; then
    info "Creating env file at $env_file (edit tokens/keys before starting)"
    cat <<EOF >"$env_file"
# BulenNode environment (edit before enabling service)
NODE_ENV=production
BULEN_SECURITY_PRESET=strict
BULEN_DATA_DIR=$DATA_DIR
BULEN_HTTP_PORT=$HTTP_PORT
BULEN_P2P_PORT=$P2P_PORT
BULEN_STATUS_TOKEN=changeme-status
BULEN_METRICS_TOKEN=changeme-metrics
BULEN_P2P_TOKEN=changeme-p2p
BULEN_ALLOW_UNSIGNED_BLOCKS=false
BULEN_ENABLE_FAUCET=false
# Set either BULEN_NODE_PRIVATE_KEY or BULEN_NODE_KEY_FILE
# BULEN_GENESIS_VALIDATORS=addr_xxx:1000,addr_yyy:1000
EOF
    chown root:root "$env_file"
    chmod 640 "$env_file"
  fi
}

setup_systemd() {
  local service_file="/etc/systemd/system/${SERVICE_NAME}.service"
  info "Installing systemd unit ${SERVICE_NAME}.service"
  cat <<EOF >"$service_file"
[Unit]
Description=BulenNode
After=network-online.target
Wants=network-online.target

[Service]
User=$APP_USER
Group=$APP_GROUP
EnvironmentFile=/etc/bulen/env
ExecStart=$BIN_PATH/src/index.js
WorkingDirectory=$APP_DIR
Restart=on-failure
RestartSec=5
LimitNOFILE=65536
TimeoutStartSec=60

[Install]
WantedBy=multi-user.target
EOF
  chmod 644 "$service_file"
}

setup_logrotate() {
  local lr="/etc/logrotate.d/bulennode"
  info "Installing logrotate config"
  cat <<'EOF' >"$lr"
/var/log/bulennode/*.log {
  daily
  rotate 7
  missingok
  notifempty
  compress
  delaycompress
  copytruncate
}
EOF
  chmod 644 "$lr"
}

setup_backups() {
  local cronfile="/etc/cron.daily/bulen-backup"
  info "Installing daily backup cron (tar.gz of data dir)"
  cat <<EOF >"$cronfile"
#!/usr/bin/env bash
set -euo pipefail
dest="/var/backups/bulen-\$(date +%F).tar.gz"
tar -czf "\$dest" "$DATA_DIR"
find /var/backups -name "bulen-*.tar.gz" -mtime +14 -delete
EOF
  chmod 750 "$cronfile"
}

main() {
  require_root
  install_deps
  create_user
  setup_dirs
  setup_env_file
  setup_systemd
  setup_logrotate
  setup_backups
  setup_firewall
  info "Provisioning done. Populate /etc/bulen/env with real tokens/keys, then run: systemctl daemon-reload && systemctl enable --now $SERVICE_NAME"
}

main "$@"
