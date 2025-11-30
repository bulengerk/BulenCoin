#!/usr/bin/env bash
set -euo pipefail

# Installer for a BulenCoin gateway node (API observer).
# This node is intended to serve as an HTTP/WebSocket gateway and should not run a faucet.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "[BulenCoin] Installing gateway node in ${REPO_ROOT}"

if ! command -v node >/dev/null 2>&1; then
  echo "[BulenCoin] Node.js not found. Attempting to install via apt (requires sudo)..."
  sudo apt update
  sudo apt install -y nodejs npm
fi

cd "${REPO_ROOT}/bulennode"
echo "[BulenCoin] Installing npm dependencies for bulennode..."
npm install

ENV_EXAMPLE="${REPO_ROOT}/bulennode/.env.gateway.example"
if [[ -f "${ENV_EXAMPLE}" ]]; then
  echo "[BulenCoin] Gateway env template available at ${ENV_EXAMPLE}"
else
  echo "[BulenCoin] Missing ${ENV_EXAMPLE} (should be in repo)."
fi

cat <<EOF

[BulenCoin] Gateway node installation finished.

Recommended environment (example for a public API gateway):

  export BULEN_NODE_PROFILE=gateway
  export BULEN_REQUIRE_SIGNATURES=true
  export BULEN_ENABLE_FAUCET=false
  export BULEN_P2P_TOKEN='replace-with-strong-secret-token'
  export BULEN_STATUS_TOKEN='replace-with-strong-status-token'
  export BULEN_METRICS_TOKEN='replace-with-strong-metrics-token'

Then run:

  cd "${REPO_ROOT}/bulennode"
  npm start

Systemd template (copy/edit as root):

  sudo cp scripts/systemd/bulennode-gateway.service /etc/systemd/system/
  sudo mkdir -p /opt/bulencoin/bulennode
  sudo cp -r bulennode/* /opt/bulencoin/bulennode/
  sudo cp bulennode/.env.gateway.example /opt/bulencoin/bulennode/.env.gateway
  sudo systemctl daemon-reload && sudo systemctl enable --now bulennode-gateway

This node should typically be:
- placed behind a reverse proxy with TLS termination (nginx/Traefik),
- rate-limited and monitored for abusive traffic,
- configured without faucet and with strict logging/retention policies.

EOF
