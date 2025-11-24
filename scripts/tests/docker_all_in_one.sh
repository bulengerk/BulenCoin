#!/usr/bin/env bash
set -euo pipefail

# All-in-one Docker workflow:
# 1. Build images (skips if up-to-date).
# 2. Run matrix of node profiles.
# 3. Run full stack (compose) smoke.
# 4. Run 30s load test.
#
# Requires Docker & Docker Compose with access to the daemon.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.yml"

NODE_IMAGE="bulen-node-matrix"
EXPLORER_IMAGE="bulen-explorer-matrix"
STATUS_IMAGE="bulen-status-matrix"

log() { echo ">>> $*"; }

build_image_if_needed() {
  local image="$1"
  local context="$2"
  if docker image inspect "${image}" >/dev/null 2>&1; then
    log "Image ${image} already exists; skipping build (touch rebuild by removing the image)."
  else
    log "Building ${image} from ${context}"
    docker build -t "${image}" "${context}"
  fi
}

run_matrix() {
  local base_port="${MATRIX_BASE_PORT:-5700}"
  local profiles=(
    "desktop-full:true:true"
    "server-full:true:true"
    "mobile-light:true:true"
    "tablet-light:true:true"
    "raspberry:true:true"
    "gateway:false:false"
    "desktop-full:false:false"
  )
  local idx=0
  local errors=0

  for entry in "${profiles[@]}"; do
    IFS=':' read -r profile faucet allowUnsigned <<<"${entry}"
    local http_port=$((base_port + idx * 5))
    local name="bulen-matrix-${idx}"
    local require_signatures="true"
    if [[ "${allowUnsigned}" == "true" ]]; then
      require_signatures="false"
    fi

    log "Matrix instance ${name} (profile=${profile}, faucet=${faucet}, requireSignatures=${require_signatures}) on host port ${http_port}"
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

    for _ in {1..60}; do
      if curl -sf "http://127.0.0.1:${http_port}/api/status" >/dev/null 2>&1; then
        break
      fi
      sleep 1
    done

    if ! curl -sf "http://127.0.0.1:${http_port}/api/status" >/dev/null 2>&1; then
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

    if [[ "${KEEP_MATRIX_CONTAINERS:-0}" == "0" ]]; then
      docker rm -f "${name}" >/dev/null
    else
      echo "Keeping container ${name} (KEEP_MATRIX_CONTAINERS=1)"
    fi
    idx=$((idx + 1))
  done

  if [[ "${errors}" -ne 0 ]]; then
    log "Matrix finished with ${errors} errors"
    return 1
  fi
  log "Matrix finished OK"
}

run_compose_smoke() {
  log "Compose build (uses cache if available)"
  docker compose -f "${COMPOSE_FILE}" build

  log "Compose up (detached)"
  docker compose -f "${COMPOSE_FILE}" up -d

  log "Waiting for node API..."
  ready=0
  for _ in {1..60}; do
    if docker compose -f "${COMPOSE_FILE}" exec -T bulennode curl -sf http://localhost:4100/api/status >/dev/null 2>&1; then
      ready=1
      break
    fi
    sleep 1
  done

  if [[ "${ready}" -ne 1 ]]; then
    log "Compose node did not start; showing compose ps/logs for bulennode"
    docker compose -f "${COMPOSE_FILE}" ps
    docker compose -f "${COMPOSE_FILE}" logs bulennode || true
    return 1
  fi

  log "Smoke: node status"
  docker compose -f "${COMPOSE_FILE}" exec -T bulennode curl -sf http://localhost:4100/api/status
  log "Smoke: explorer HTML"
  docker compose -f "${COMPOSE_FILE}" exec -T bulen-explorer curl -sf http://localhost:4200/ | head -n 5
  log "Smoke: status aggregator"
  docker compose -f "${COMPOSE_FILE}" exec -T bulen-status curl -sf http://localhost:4300/status

  log "Smoke: faucet + tx"
  docker compose -f "${COMPOSE_FILE}" exec -T bulennode curl -sf -X POST http://localhost:4100/api/faucet \
    -H 'Content-Type: application/json' -d '{"address":"docker-alice","amount":1000}' >/dev/null
  docker compose -f "${COMPOSE_FILE}" exec -T bulennode curl -sf -X POST http://localhost:4100/api/transactions \
    -H 'Content-Type: application/json' -d '{"from":"docker-alice","to":"docker-bob","amount":25,"fee":0}' >/dev/null || true
  docker compose -f "${COMPOSE_FILE}" exec -T bulennode curl -sf "http://localhost:4100/api/blocks?limit=5&offset=0"

  log "Compose smoke done (stack left running). To stop: docker compose -f ${COMPOSE_FILE} down"
}

run_load_30s() {
  log "Starting 30s load test (on compose stack already up)"
  local start end status_count tx_count errors
  start=$(date +%s)
  end=$((start + 30))
  status_count=0
  tx_count=0
  errors=0

  while [ "$(date +%s)" -lt "${end}" ]; do
    if ! docker compose -f "${COMPOSE_FILE}" exec -T bulennode curl -sf http://localhost:4100/api/status >/dev/null; then
      errors=$((errors + 1))
    fi
    status_count=$((status_count + 1))

    if [ $((status_count % 5)) -eq 0 ]; then
      docker compose -f "${COMPOSE_FILE}" exec -T bulennode curl -sf -X POST http://localhost:4100/api/faucet \
        -H 'Content-Type: application/json' -d '{"address":"docker-load","amount":5}' >/dev/null || true
      if docker compose -f "${COMPOSE_FILE}" exec -T bulennode curl -sf -X POST http://localhost:4100/api/transactions \
        -H 'Content-Type: application/json' -d '{"from":"docker-load","to":"sink","amount":1,"fee":0}' >/dev/null; then
        tx_count=$((tx_count + 1))
      fi
    fi
    sleep 0.6
  done

  log "Load test finished: status polls=${status_count}, tx sent=${tx_count}, errors=${errors}"
  if [[ "${errors}" -ne 0 ]]; then
    return 1
  fi
}

main() {
  build_image_if_needed "${NODE_IMAGE}" "${ROOT_DIR}/bulennode"
  build_image_if_needed "${EXPLORER_IMAGE}" "${ROOT_DIR}/explorer"
  build_image_if_needed "${STATUS_IMAGE}" "${ROOT_DIR}/status"

  run_matrix
  run_compose_smoke
  run_load_30s

  log "All-in-one workflow done. To stop compose stack: docker compose -f ${COMPOSE_FILE} down"
}

main "$@"
