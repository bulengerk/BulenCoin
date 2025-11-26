#!/usr/bin/env bash
set -euo pipefail

# One-click installer for BulenCoin nodes on macOS.
# - Installs Node.js (via Homebrew if available, otherwise via nvm under the current user).
# - Installs npm dependencies for bulennode.
# - Prints recommended environment for the chosen profile.

PROFILE="${1:-desktop-full}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "[BulenCoin] Installing ${PROFILE} node in ${REPO_ROOT}"

ensure_node() {
  if command -v node >/dev/null 2>&1; then
    echo "[BulenCoin] Node.js detected: $(node -v)"
    return
  fi

  local brew_bin=""
  if command -v brew >/dev/null 2>&1; then
    brew_bin="$(command -v brew)"
  elif [ -x "/opt/homebrew/bin/brew" ]; then
    brew_bin="/opt/homebrew/bin/brew"
  fi

  if [ -n "${brew_bin}" ]; then
    echo "[BulenCoin] Installing Node.js via Homebrew (${brew_bin})..."
    "${brew_bin}" install node
    # Ensure brew's node is on PATH for the remainder of the script.
    eval "$("${brew_bin}" shellenv)"
    return
  fi

  echo "[BulenCoin] Homebrew not found; installing Node.js via nvm in ${HOME}..."
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  if [ ! -s "${NVM_DIR}/nvm.sh" ]; then
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  fi
  if [ -s "${NVM_DIR}/nvm.sh" ]; then
    # shellcheck source=/dev/null
    . "${NVM_DIR}/nvm.sh"
  else
    echo "[BulenCoin] nvm installation failed (missing ${NVM_DIR}/nvm.sh)"; exit 1
  fi
  nvm install 18
}

ensure_node
echo "[BulenCoin] Using npm $(npm -v)"

cd "${REPO_ROOT}/bulennode"
echo "[BulenCoin] Installing npm dependencies for bulennode..."
npm install

ENABLE_FAUCET="true"
if [[ "${PROFILE}" == "server-full" || "${PROFILE}" == "gateway" ]]; then
  ENABLE_FAUCET="false"
fi

cat <<EOF

[BulenCoin] ${PROFILE} node installation finished (macOS).

Recommended environment:

  export BULEN_NODE_PROFILE=${PROFILE}
  export BULEN_REQUIRE_SIGNATURES=true
  export BULEN_ENABLE_FAUCET=${ENABLE_FAUCET}
  export BULEN_P2P_TOKEN='replace-with-strong-secret-token'
  # Optional hardening:
  # export BULEN_STATUS_TOKEN='replace-with-status-secret'
  # export BULEN_METRICS_TOKEN='replace-with-metrics-secret'

Then run:

  cd "${REPO_ROOT}/bulennode"
  npm start

EOF
