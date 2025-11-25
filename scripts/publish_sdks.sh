#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "== BulenCoin SDK publish helper =="
echo
echo "Prereqs:"
echo "- npm login (for JS/TS SDK)"
echo "- cargo login (for Rust crate)"
echo
read -r -p "Continue? [y/N] " CONFIRM
if [[ "${CONFIRM,,}" != "y" ]]; then
  echo "Aborting."
  exit 1
fi

echo "Packing JS/TS SDK..."
(cd "$ROOT/sdk" && npm pack)
JS_TARBALL="$(cd "$ROOT/sdk" && ls bulencoin-sdk-*.tgz | tail -n1)"
echo "JS tarball: $JS_TARBALL"

read -r -p "Publish JS SDK to npm now? [y/N] " PJS
if [[ "${PJS,,}" == "y" ]]; then
  (cd "$ROOT/sdk" && npm publish "$JS_TARBALL")
else
  echo "Skipping npm publish (tarball ready at sdk/$JS_TARBALL)"
fi

echo "Packing Rust crate..."
(cd "$ROOT/sdk-rs" && cargo package)

read -r -p "Publish Rust crate to crates.io now? [y/N] " PRS
if [[ "${PRS,,}" == "y" ]]; then
  (cd "$ROOT/sdk-rs" && cargo publish)
else
  echo "Skipping cargo publish (package ready in target/package)"
fi

echo "Done."
