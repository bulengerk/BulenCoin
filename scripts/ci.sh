#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

pushd "${ROOT_DIR}/bulennode" >/dev/null
npm ci
npm test
popd >/dev/null
