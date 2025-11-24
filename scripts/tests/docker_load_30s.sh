#!/usr/bin/env bash
set -euo pipefail

# 30s load test inside Docker stack.
# Requires Docker & Docker Compose, run from repo root.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.yml"

export BULENNODE_API_BASE="http://bulennode:4100/api"

echo ">>> Ensuring stack is up (build + up -d)"
docker compose -f "${COMPOSE_FILE}" build
docker compose -f "${COMPOSE_FILE}" up -d

echo ">>> Waiting for node API..."
until docker compose -f "${COMPOSE_FILE}" exec -T bulennode curl -sf http://localhost:4100/api/health >/dev/null; do
  sleep 1
done

START=$(date +%s)
END=$((START + 30))
STATUS_COUNT=0
TX_COUNT=0
ERRORS=0

echo ">>> Running 30s load loop"
while [ "$(date +%s)" -lt "${END}" ]; do
  if ! docker compose -f "${COMPOSE_FILE}" exec -T bulennode curl -sf http://localhost:4100/api/status >/dev/null; then
    ERRORS=$((ERRORS + 1))
  fi
  STATUS_COUNT=$((STATUS_COUNT + 1))

  if [ $((STATUS_COUNT % 5)) -eq 0 ]; then
    docker compose -f "${COMPOSE_FILE}" exec -T bulennode curl -sf -X POST http://localhost:4100/api/faucet \
      -H 'Content-Type: application/json' -d '{"address":"docker-load","amount":5}' >/dev/null || true
    if docker compose -f "${COMPOSE_FILE}" exec -T bulennode curl -sf -X POST http://localhost:4100/api/transactions \
      -H 'Content-Type: application/json' -d '{"from":"docker-load","to":"sink","amount":1,"fee":0}' >/dev/null; then
      TX_COUNT=$((TX_COUNT + 1))
    fi
  fi
  sleep 0.6
done

echo "Status polls: ${STATUS_COUNT}"
echo "Transactions sent: ${TX_COUNT}"
echo "Errors: ${ERRORS}"

echo ">>> Done. To stop: docker compose -f ${COMPOSE_FILE} down"
