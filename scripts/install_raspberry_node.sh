#!/usr/bin/env bash
set -euo pipefail

# Installer for a BulenCoin node on Raspberry Pi (raspberry profile).
# Assumes Raspberry Pi OS / Debian-based distribution.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "[BulenCoin] Installing raspberry node in ${REPO_ROOT}"

if ! command -v node >/dev/null 2>&1; then
  echo "[BulenCoin] Node.js not found. Installing via apt (requires sudo)..."
  sudo apt update
  sudo apt install -y nodejs npm
fi

cd "${REPO_ROOT}/bulennode"
echo "[BulenCoin] Installing npm dependencies for bulennode..."
npm install

cat <<EOF

[BulenCoin] Raspberry node installation finished.

Recommended environment (example for a home Raspberry Pi node):

  export BULEN_NODE_PROFILE=raspberry
  export BULEN_REQUIRE_SIGNATURES=true
  export BULEN_ENABLE_FAUCET=false
  export BULEN_P2P_TOKEN='replace-with-strong-secret-token'
  export BULEN_STATUS_TOKEN='replace-with-strong-status-token'
  export BULEN_METRICS_TOKEN='replace-with-strong-metrics-token'

Then run:

  cd "${REPO_ROOT}/bulennode"
  npm start

For 24/7 operation, consider:
- placing the node behind a router with port forwarding for HTTP/P2P ports,
- using a process manager (systemd, pm2) to restart the node on failure or reboot.

EOF
