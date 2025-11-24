#!/usr/bin/env bash
set -euo pipefail

# Simple Docker-based smoke test for BulenCoin stack.
# Requires: Docker & Docker Compose installed, run from repo root.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.yml"

export BULENNODE_API_BASE="http://bulennode:4100/api"
export EXPLORER_PORT=4200
export STATUS_PORT=4300

echo ">>> Building images"
docker compose -f "${COMPOSE_FILE}" build

echo ">>> Starting stack"
docker compose -f "${COMPOSE_FILE}" up -d

echo ">>> Waiting for node API..."
until docker compose -f "${COMPOSE_FILE}" exec -T bulennode curl -sf http://localhost:4100/api/status >/dev/null; do
  sleep 1
done

echo ">>> Running smoke checks"
docker compose -f "${COMPOSE_FILE}" exec -T bulennode curl -sf http://localhost:4100/api/status
docker compose -f "${COMPOSE_FILE}" exec -T bulen-explorer curl -sf http://localhost:4200/ | head -n 5
docker compose -f "${COMPOSE_FILE}" exec -T bulen-status curl -sf http://localhost:4300/status

echo ">>> Submitting test transaction (faucet + tx)..."
docker compose -f "${COMPOSE_FILE}" exec -T bulennode curl -sf -X POST http://localhost:4100/api/faucet \
  -H 'Content-Type: application/json' -d '{"address":"docker-alice","amount":1000}'
docker compose -f "${COMPOSE_FILE}" exec -T bulennode curl -sf -X POST http://localhost:4100/api/transactions \
  -H 'Content-Type: application/json' -d '{"from":"docker-alice","to":"docker-bob","amount":25,"fee":0}'

echo ">>> Fetching latest blocks"
docker compose -f "${COMPOSE_FILE}" exec -T bulennode curl -sf "http://localhost:4100/api/blocks?limit=5&offset=0"

echo ">>> Done. To stop: docker compose -f ${COMPOSE_FILE} down"
