#!/usr/bin/env bash
set -euo pipefail

# Runs BulenCoin installer scripts inside a Debian-based Docker container.
# Useful for smoke-testing Linux installers without touching the host.

IMAGE="${IMAGE:-bulencoin/installers-test:debian12}"
CONTAINER="${CONTAINER:-bulencoin-installers-test}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
DOCKERFILE="${DOCKERFILE:-${REPO_ROOT}/scripts/docker/installers-test.Dockerfile}"

if ! command -v docker >/dev/null 2>&1; then
  echo "[BulenCoin] docker is required to run this script." >&2
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "[BulenCoin] docker is installed but not accessible (permission denied on docker.sock?)." >&2
  echo "[BulenCoin] Re-run with appropriate privileges (e.g., add user to docker group or use sudo)." >&2
  exit 1
fi

echo "[BulenCoin] Building image ${IMAGE} using ${DOCKERFILE} ..."
docker build -f "${DOCKERFILE}" -t "${IMAGE}" "${REPO_ROOT}"

cleanup() {
  docker rm -f "${CONTAINER}" >/dev/null 2>&1 || true
}
cleanup
trap cleanup EXIT

echo "[BulenCoin] Starting container ${CONTAINER}..."
docker run -d --name "${CONTAINER}" "${IMAGE}" tail -f /dev/null >/dev/null

scripts=(
  "install_server_node.sh"
  "install_desktop_node.sh"
  "install_gateway_node.sh"
  "install_raspberry_node.sh"
)

for script in "${scripts[@]}"; do
  echo "[BulenCoin] Running ${script} inside container..."
  docker exec "${CONTAINER}" bash -lc "cd /opt/bulencoin && ./scripts/${script}"
done

echo "[BulenCoin] Installer smoke tests completed successfully in ${IMAGE}"
