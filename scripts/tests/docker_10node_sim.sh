#!/usr/bin/env bash
#
# BulenCoin 10-node docker simulation (manual run)
# - Builds bulennode image if missing (or uses IMAGE override)
# - Spawns NODE_COUNT=10 containers on a private docker network
# - Waits WAIT_SECONDS (default 300s) for the mini-network to gossip
# - Prints per-node height/peer counts
# - Tears everything down
#
# Usage:
#   IMAGE=bulennode:local NODE_COUNT=10 WAIT_SECONDS=300 ./scripts/tests/docker_10node_sim.sh
#
# This script is intentionally not run by default test suites.

set -euo pipefail

IMAGE="${IMAGE:-bulennode:local}"
NETWORK="${NETWORK:-bulen-sim-net}"
NODE_COUNT="${NODE_COUNT:-10}"
WAIT_SECONDS="${WAIT_SECONDS:-300}"
BASE_HTTP_PORT="${BASE_HTTP_PORT:-5200}"
P2P_TOKEN="${P2P_TOKEN:-matrix-token}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BULENNODE_DIR="${BULENNODE_DIR:-${PROJECT_ROOT}/bulennode}"
LOGS_DIR="${LOGS_DIR:-${PROJECT_ROOT}/scripts/tests/.tmp-logs}"

log() {
  printf "[sim] %s\n" "$*"
}

warn() {
  printf "[sim][warn] %s\n" "$*" >&2
}

cleanup() {
  log "Stopping nodes..."
  docker ps -aq --filter "name=bulen-node-" | xargs -r docker rm -f >/dev/null
  if docker network inspect "$NETWORK" >/dev/null 2>&1; then
    docker network rm "$NETWORK" >/dev/null || true
  fi
}

trap cleanup EXIT

if ! docker network inspect "$NETWORK" >/dev/null 2>&1; then
  log "Creating network $NETWORK"
  docker network create "$NETWORK" >/dev/null
fi

mkdir -p "$LOGS_DIR"

if ! docker image inspect "$IMAGE" >/dev/null 2>&1; then
  log "Building image $IMAGE (once) from $BULENNODE_DIR"
  docker build -t "$IMAGE" "$BULENNODE_DIR" >/dev/null
fi

log "Starting $NODE_COUNT nodes on $NETWORK..."
for i in $(seq 1 "$NODE_COUNT"); do
  name="bulen-node-$i"
  host_port=$((BASE_HTTP_PORT + i))
  peers=""
  if [ "$i" -gt 1 ]; then
    peers="http://bulen-node-1:4100"
  fi
  docker run -d --name "$name" --network "$NETWORK" \
    -p "${host_port}:4100" \
    -e NODE_ENV="development" \
    -e BULEN_NODE_PROFILE="desktop-full" \
    -e BULEN_HTTP_PORT="4100" \
    -e BULEN_P2P_PORT=$((5000 + i)) \
    -e BULEN_P2P_TOKEN="$P2P_TOKEN" \
    -e BULEN_STATUS_TOKEN="sim-status" \
    -e BULEN_METRICS_TOKEN="sim-metrics" \
    -e BULEN_PEERS="$peers" \
    -e BULEN_REQUIRE_SIGNATURES="false" \
    "$IMAGE" >/dev/null
  docker logs -f "$name" >"$LOGS_DIR/$name.log" 2>&1 &
done

log "Waiting ${WAIT_SECONDS}s for nodes to gossip..."
sleep "$WAIT_SECONDS"

log "Collecting heights/peers:"
for i in $(seq 1 "$NODE_COUNT"); do
  name="bulen-node-$i"
  if ! docker ps --format '{{.Names}}' | grep -q "^$name$" >/dev/null 2>&1; then
    warn " - $name: not running (see $LOGS_DIR/$name.log)"
    continue;
  fi
status=$(docker exec "$name" node -e "fetch('http://localhost:4100/api/status').then(r=>r.json()).then(j=>{const h=j.height||j.state?.height||j.blockHeight||0; const peers=(j.peers&&j.peers.length)||j.peerCount||0; console.log(JSON.stringify({height:h, peers}));}).catch(err=>{console.error(err); process.exit(1);});")
  height=$(echo "$status" | sed -n 's/.*"height":\([0-9]*\).*/\1/p')
  peers=$(echo "$status" | sed -n 's/.*"peers":\([0-9]*\).*/\1/p')
  printf " - %s: height=%s peers=%s (http://localhost:%s/api/status)\n" "$name" "${height:-?}" "${peers:-?}" "$((BASE_HTTP_PORT + i))"
done

log "Done. Containers remain for inspection until cleanup exit."
