#!/usr/bin/env bash
# Churn/chaos soak: start N local validators with deterministic genesis, then repeatedly
# kill/restart a subset to observe finality/height behaviour. Intended for local/dev use.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WORKDIR="${WORKDIR:-$ROOT/data/soak-churn}"
REPORT_DIR="${REPORT_DIR:-$ROOT/scripts/soak/reports}"

NODES="${NODES:-5}"
DURATION_SEC="${DURATION_SEC:-120}"
CHURN_INTERVAL_SEC="${CHURN_INTERVAL_SEC:-25}"
RESTART_DELAY_SEC="${RESTART_DELAY_SEC:-4}"
BASE_HTTP_PORT="${BASE_HTTP_PORT:-7010}" # p2p uses +1
CHAIN_ID="${CHAIN_ID:-bulencoin-soak}"
BLOCK_INTERVAL_MS="${BLOCK_INTERVAL_MS:-800}"
COMMITTEE_SIZE="${COMMITTEE_SIZE:-3}"
STATUS_TOKEN="${STATUS_TOKEN:-status-token}"
METRICS_TOKEN="${METRICS_TOKEN:-metrics-token}"
P2P_TOKEN="${P2P_TOKEN:-p2p-token}"
ALLOW_SINGLE_CERT="${ALLOW_SINGLE_CERT:-true}"
ALLOW_EMPTY_BLOCKS="${ALLOW_EMPTY_BLOCKS:-true}"
WEBHOOK_SECRET="${WEBHOOK_SECRET:-webhook-secret}"

print_usage() {
  cat <<'EOF'
Usage: scripts/soak/soak_churn.sh [--nodes=N] [--duration=SECONDS] [--churn=SECONDS] [--base-port=PORT]
Environment overrides:
  NODES (default 5)                    How many validators to launch (>=3 recommended)
  DURATION_SEC (default 120)           Total duration of churn loop
  CHURN_INTERVAL_SEC (default 25)      How often to kill/restart nodes
  RESTART_DELAY_SEC (default 4)        Wait time before restarting killed nodes
  BASE_HTTP_PORT (default 7010)        First HTTP port; each node increments by +10
  BLOCK_INTERVAL_MS (default 800)      Bulen block interval
  COMMITTEE_SIZE (default 3)           Committee size env flag
  ALLOW_SINGLE_CERT (default true)     Allow single-validator certificates (for churn survival)
  ALLOW_EMPTY_BLOCKS (default true)    Permit empty blocks to keep height moving
EOF
}

for arg in "$@"; do
  case "$arg" in
    --nodes=*) NODES="${arg#*=}" ;;
    --duration=*) DURATION_SEC="${arg#*=}" ;;
    --churn=*) CHURN_INTERVAL_SEC="${arg#*=}" ;;
    --base-port=*) BASE_HTTP_PORT="${arg#*=}" ;;
    --help|-h) print_usage; exit 0 ;;
    *) echo "Unknown arg: $arg" >&2; print_usage; exit 1 ;;
  esac
done

mkdir -p "$WORKDIR" "$REPORT_DIR"
rm -f "$WORKDIR"/validator_*.pem "$WORKDIR"/validators.json "$WORKDIR"/genesis.txt
rm -rf "$WORKDIR"/node_*

log() {
  echo "[$(date --iso-8601=seconds)] $*"
}

# Generate deterministic validators and genesis
log "Preparing $NODES validators under $WORKDIR"
ROOT_PATH="$ROOT" WORKDIR="$WORKDIR" NODES="$NODES" node <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { deriveAddressFromPublicKey } = require(path.join(process.env.ROOT_PATH, 'bulennode/src/identity'));

const n = Number(process.env.NODES || 5);
const dir = process.env.WORKDIR;
fs.mkdirSync(dir, { recursive: true });

const validators = [];
for (let i = 0; i < n; i += 1) {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'secp256k1' });
  const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' });
  const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' });
  const address = deriveAddressFromPublicKey(publicKeyPem);
  const keyPath = path.join(dir, `validator_${i}.pem`);
  fs.writeFileSync(keyPath, privateKeyPem, { mode: 0o600 });
  validators.push({ idx: i, address, stake: 1000, keyPath });
}
fs.writeFileSync(path.join(dir, 'validators.json'), JSON.stringify(validators, null, 2));
fs.writeFileSync(
  path.join(dir, 'genesis.txt'),
  validators.map((v) => `${v.address}:${v.stake}`).join(','),
);
NODE

GENESIS=$(cat "$WORKDIR/genesis.txt")
PEERS=""
for i in $(seq 0 $((NODES - 1))); do
  port=$((BASE_HTTP_PORT + (i * 10)))
  url="http://127.0.0.1:${port}"
  if [[ -z "$PEERS" ]]; then
    PEERS="$url"
  else
    PEERS="$PEERS,$url"
  fi
done

declare -a PIDS
declare -a RESTARTS

cleanup() {
  log "Stopping all nodes"
  for pid in "${PIDS[@]:-}"; do
    if [[ -n "$pid" ]]; then
      kill "$pid" 2>/dev/null || true
    fi
  done
}
trap cleanup EXIT

start_node() {
  local idx="$1"
  local http_port=$((BASE_HTTP_PORT + (idx * 10)))
  local p2p_port=$((http_port + 1))
  local data_dir="$WORKDIR/node_$idx"
  local log_file="$WORKDIR/node_${idx}.log"
  mkdir -p "$data_dir"

  BULEN_HTTP_PORT="$http_port" \
  BULEN_P2P_PORT="$p2p_port" \
  BULEN_NODE_ID="val$idx" \
  BULEN_NODE_ROLE="validator" \
  BULEN_NODE_PROFILE="server-full" \
  BULEN_DATA_DIR="$data_dir" \
  BULEN_CHAIN_ID="$CHAIN_ID" \
  BULEN_PEERS="$PEERS" \
  BULEN_BLOCK_INTERVAL_MS="$BLOCK_INTERVAL_MS" \
  BULEN_REQUIRE_SIGNATURES="true" \
  BULEN_ALLOW_UNSIGNED_BLOCKS="false" \
  BULEN_ALLOW_EMPTY_BLOCKS="$ALLOW_EMPTY_BLOCKS" \
  BULEN_ALLOW_SINGLE_VALIDATOR_CERT="$ALLOW_SINGLE_CERT" \
  BULEN_GENESIS_VALIDATORS="$GENESIS" \
  BULEN_STATUS_TOKEN="$STATUS_TOKEN" \
  BULEN_WEBHOOK_SECRET="$WEBHOOK_SECRET" \
  BULEN_METRICS_TOKEN="$METRICS_TOKEN" \
  BULEN_P2P_TOKEN="$P2P_TOKEN" \
  BULEN_P2P_REQUIRE_HANDSHAKE="true" \
  BULEN_ENABLE_FAUCET="false" \
  BULEN_SECURITY_PRESET="strict" \
  BULEN_NODE_KEY_FILE="$WORKDIR/validator_${idx}.pem" \
  BULEN_COMMITTEE_SIZE="$COMMITTEE_SIZE" \
  node "$ROOT/bulennode/src/index.js" >"$log_file" 2>&1 &

  PIDS[$idx]=$!
  RESTARTS[$idx]=$(( ${RESTARTS[$idx]:-0} + 1 ))
  log "Started node val$idx (http=${http_port}, p2p=${p2p_port}, pid=${PIDS[$idx]})"
}

wait_for_status() {
  local port="$1"
  local attempts=40
  while ((attempts > 0)); do
    if curl -sSf -H "x-bulen-status-token: ${STATUS_TOKEN}" "http://127.0.0.1:${port}/api/status" >/dev/null 2>&1; then
      return 0
    fi
    attempts=$((attempts - 1))
    sleep 0.5
  done
  return 1
}

log "Starting $NODES nodes (chainId=$CHAIN_ID, committeeSize=$COMMITTEE_SIZE)"
for i in $(seq 0 $((NODES - 1))); do
  start_node "$i"
done

for i in $(seq 0 $((NODES - 1))); do
  port=$((BASE_HTTP_PORT + (i * 10)))
  wait_for_status "$port" || log "WARNING: node val$i failed health check"
done

deadline=$(( $(date +%s) + DURATION_SEC ))
iteration=0
while (( $(date +%s) < deadline )); do
  sleep "$CHURN_INTERVAL_SEC"
  iteration=$((iteration + 1))

  # choose victims to kill (leave at least 1 running)
  mapfile -t alive < <(printf "%s\n" "${!PIDS[@]}" | while read -r idx; do
    pid="${PIDS[$idx]}"
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      echo "$idx"
    fi
  done)

  if ((${#alive[@]} <= 1)); then
    log "Only one node alive; skipping churn iteration $iteration"
    continue
  fi

  # Kill up to 2 nodes or 1/3 of the cluster, whichever is greater but not all
  max_kill=$((NODES / 3))
  if ((max_kill < 2)); then max_kill=2; fi
  victims_count=$((max_kill < (${#alive[@]} - 1) ? max_kill : (${#alive[@]} - 1)))
  mapfile -t victims < <(printf "%s\n" "${alive[@]}" | shuf | head -n "$victims_count")

  log "Iteration $iteration: killing nodes ${victims[*]}"
  for idx in "${victims[@]}"; do
    pid="${PIDS[$idx]}"
    if [[ -n "$pid" ]]; then
      kill "$pid" 2>/dev/null || true
    fi
    PIDS[$idx]=""
  done

  sleep "$RESTART_DELAY_SEC"
  for idx in "${victims[@]}"; do
    start_node "$idx"
  done
done

log "Churn window elapsed; collecting final status"
summary_file="$REPORT_DIR/soak_churn_summary_$(date +%Y%m%dT%H%M%S).json"

ROOT_PATH="$ROOT" BASE_HTTP_PORT="$BASE_HTTP_PORT" NODES="$NODES" STATUS_TOKEN="$STATUS_TOKEN" summary_file="$summary_file" node <<'NODE'
const fs = require('node:fs');
const http = require('node:http');

const statuses = [];
function fetchStatus(port) {
  return new Promise((resolve) => {
    const req = http.get(
      {
        hostname: '127.0.0.1',
        port,
        path: '/api/status',
        headers: { 'x-bulen-status-token': process.env.STATUS_TOKEN || '' },
        timeout: 4000,
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          try {
            const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
            resolve({ port, status: res.statusCode, body });
          } catch (error) {
            resolve({ port, status: res.statusCode, error: error.message });
          }
        });
      },
    );
    req.on('error', (error) => resolve({ port, error: error.message }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ port, error: 'timeout' });
    });
  });
}

async function main() {
  const n = Number(process.env.NODES || 0);
  for (let i = 0; i < n; i += 1) {
    const port = Number(process.env.BASE_HTTP_PORT) + i * 10;
    // eslint-disable-next-line no-await-in-loop
    statuses.push(await fetchStatus(port));
  }
  fs.writeFileSync(process.env.summary_file, JSON.stringify({ generatedAt: new Date().toISOString(), statuses }, null, 2));
  console.log(`Wrote summary to ${process.env.summary_file}`);
}
main();
NODE

log "Done. Summary: $summary_file (logs in $WORKDIR)"
