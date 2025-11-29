#!/usr/bin/env bash
set -euo pipefail

# Installer for a BulenCoin desktop-full node (Linux desktop / laptop).
# It installs Node.js and npm if missing, installs dependencies for bulennode,
# and prints recommended environment variables.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "[BulenCoin] Installing desktop-full node in ${REPO_ROOT}"

if ! command -v node >/dev/null 2>&1; then
  echo "[BulenCoin] Node.js not found. Attempting to install via apt (requires sudo)..."
  sudo apt update
  sudo apt install -y nodejs npm
fi

cd "${REPO_ROOT}/bulennode"
echo "[BulenCoin] Installing npm dependencies for bulennode..."
npm install

cat <<EOF

[BulenCoin] Desktop node installation finished.

Recommended environment (example for a validator on a laptop/PC):

  export BULEN_NODE_PROFILE=desktop-full
  export BULEN_REQUIRE_SIGNATURES=true
  export BULEN_ENABLE_FAUCET=false
  export BULEN_P2P_TOKEN='replace-with-strong-secret-token'
  export BULEN_STATUS_TOKEN='replace-with-strong-status-token'
  export BULEN_METRICS_TOKEN='replace-with-strong-metrics-token'

Then run:

  cd "${REPO_ROOT}/bulennode"
  npm start

EOF
