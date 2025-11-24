#!/usr/bin/env bash
set -euo pipefail

# Matrix test of BulenNode across profiles and security settings using Docker.
# Requirements: docker installed and access to the daemon (run with sudo if needed).

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

NODE_IMAGE="bulen-node-matrix"
EXPLORER_IMAGE="bulen-explorer-matrix"
STATUS_IMAGE="bulen-status-matrix"

echo ">>> Building images"
docker build -t "${NODE_IMAGE}" "${ROOT_DIR}/bulennode"
docker build -t "${EXPLORER_IMAGE}" "${ROOT_DIR}/explorer"
docker build -t "${STATUS_IMAGE}" "${ROOT_DIR}/status"

profiles=(
  "desktop-full:true:true"    # faucet + dev-style
  "server-full:true:true"
  "mobile-light:true:true"
  "tablet-light:true:true"
  "raspberry:true:true"
  "gateway:false:false"       # observer-like, faucet off
  "desktop-full:false:false"  # production-like: signatures on, faucet off
)

idx=0
errors=0

function run_check() {
  local profile="$1"
  local faucet="$2"
  local allowUnsigned="$3"

  local http_port=$((5600 + idx * 5))
  local name="bulen-matrix-${idx}"
  local require_signatures="true"
  if [[ "${allowUnsigned}" == "true" ]]; then
    require_signatures="false"
  fi

  echo ">>> Starting ${name} (profile=${profile}, faucet=${faucet}, requireSignatures=${require_signatures}) on host port ${http_port}"
    docker run -d --rm \
      --name "${name}" \
      -p "${http_port}:4100" \
      -e BULEN_NODE_PROFILE="${profile}" \
      -e BULEN_HTTP_PORT="4100" \
      -e BULEN_P2P_PORT="4101" \
      -e NODE_ENV="development" \
      -e BULEN_REQUIRE_SIGNATURES="${require_signatures}" \
      -e BULEN_ENABLE_FAUCET="${faucet}" \
      -e BULEN_P2P_TOKEN="matrix-token" \
      -e BULEN_LOG_FORMAT="tiny" \
      "${NODE_IMAGE}" >/dev/null

  # wait for status
    for _ in {1..60}; do
      if curl -sf "http://127.0.0.1:${http_port}/api/status" >/dev/null 2>&1; then
        break
      fi
      sleep 1
    done

  if ! curl -sf "http://127.0.0.1:${http_port}/api/status"; then
      echo "!!! status check failed for ${name} (showing logs)"
      docker logs "${name}" || true
      errors=$((errors + 1))
    fi

  if [[ "${faucet}" == "true" && "${require_signatures}" == "false" ]]; then
    curl -sf -X POST "http://127.0.0.1:${http_port}/api/faucet" \
      -H 'Content-Type: application/json' \
      -d '{"address":"matrix-alice","amount":100}' >/dev/null
    curl -sf -X POST "http://127.0.0.1:${http_port}/api/transactions" \
      -H 'Content-Type: application/json' \
      -d '{"from":"matrix-alice","to":"matrix-bob","amount":10,"fee":0}' >/dev/null || true
  fi

    docker rm -f "${name}" >/dev/null
  idx=$((idx + 1))
}

for entry in "${profiles[@]}"; do
  IFS=':' read -r profile faucet allowUnsigned <<<"${entry}"
  run_check "${profile}" "${faucet}" "${allowUnsigned}"
done

echo ">>> Matrix completed. Errors: ${errors}"
if [[ "${errors}" -ne 0 ]]; then
  exit 1
fi

echo ">>> (Optional) Explorer/Status images built as ${EXPLORER_IMAGE}, ${STATUS_IMAGE}"
