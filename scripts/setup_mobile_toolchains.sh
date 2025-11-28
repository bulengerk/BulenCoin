#!/usr/bin/env bash
set -euo pipefail

# Prepare Android toolchain via Docker (preferred) or local sdkmanager, then optionally build an Android client.
# iOS/TestFlight still requires macOS + Xcode (cannot be built here).
#
# Usage:
#   ./scripts/setup_mobile_toolchains.sh                  # download SDK into .android-sdk
#   MOBILE_APP_DIR=/path/to/android/app ./scripts/setup_mobile_toolchains.sh build

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-"$ROOT_DIR/.android-sdk"}"
ANDROID_NDK_VERSION="${ANDROID_NDK_VERSION:-26.1.10909125}"
DIST_DIR="${DIST_DIR:-$ROOT_DIR/dist/mobile}"
MOBILE_APP_DIR="${MOBILE_APP_DIR:-}"

mkdir -p "$ANDROID_SDK_ROOT" "$DIST_DIR"

ANDROID_CANDIDATES=(
  "ghcr.io/cirruslabs/android-sdk:34-ndk26"
  "ghcr.io/cirruslabs/android-sdk:34"
  "cirruslabs/android-sdk:34-ndk"
  "cirruslabs/android-sdk:34"
)

choose_docker_image() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "[BulenCoin] Docker not available; will fall back to local sdkmanager." >&2
    return 1
  fi
  for image in "${ANDROID_CANDIDATES[@]}"; do
    echo "[BulenCoin] Trying Android SDK image: $image"
    if docker pull "$image" >/dev/null 2>&1; then
      ANDROID_IMAGE="$image"
      echo "[BulenCoin] Using Android image: $ANDROID_IMAGE"
      return 0
    fi
    echo "[BulenCoin] Image unavailable: $image"
  done
  echo "[BulenCoin] No Android images available; falling back to local sdkmanager." >&2
  return 1
}

install_with_docker() {
  echo "[BulenCoin] Ensuring SDK is cached at $ANDROID_SDK_ROOT (mounted to /opt/android-sdk)."
  docker run --rm \
    -e ANDROID_SDK_ROOT=/opt/android-sdk \
    -v "$ANDROID_SDK_ROOT":/opt/android-sdk \
    "$ANDROID_IMAGE" \
    bash -lc "ls /opt/android-sdk/platforms >/dev/null 2>&1 || yes | sdkmanager --sdk_root=\$ANDROID_SDK_ROOT 'platforms;android-34' 'build-tools;34.0.0' 'ndk;${ANDROID_NDK_VERSION}' >/dev/null && yes | sdkmanager --licenses >/dev/null"
}

install_with_sdkmanager() {
  if [[ -x "$ANDROID_SDK_ROOT/cmdline-tools/latest/bin/sdkmanager" && -d "$ANDROID_SDK_ROOT/platforms/android-34" && -d "$ANDROID_SDK_ROOT/build-tools/34.0.0" ]]; then
    echo "[BulenCoin] Local SDK already present at $ANDROID_SDK_ROOT (cmdline-tools/platforms/build-tools). Skipping download."
    export PATH="$ANDROID_SDK_ROOT/cmdline-tools/latest/bin:$ANDROID_SDK_ROOT/platform-tools:$PATH"
    return
  fi
  echo "[BulenCoin] Downloading Android cmdline tools locally (no Docker)..."
  local url=${ANDROID_URL:-https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip}
  local tmpzip
  tmpzip="$(mktemp /tmp/cmdline-tools.XXXXXX.zip)"
  curl -L "$url" -o "$tmpzip"
  mkdir -p "$ANDROID_SDK_ROOT/cmdline-tools"
  unzip -q "$tmpzip" -d "$ANDROID_SDK_ROOT/cmdline-tools"
  rm "$tmpzip"
  if [[ -d "$ANDROID_SDK_ROOT/cmdline-tools/cmdline-tools" ]]; then
    rm -rf "$ANDROID_SDK_ROOT/cmdline-tools/latest"
    mv "$ANDROID_SDK_ROOT/cmdline-tools/cmdline-tools" "$ANDROID_SDK_ROOT/cmdline-tools/latest"
  fi
  export PATH="$ANDROID_SDK_ROOT/cmdline-tools/latest/bin:$ANDROID_SDK_ROOT/platform-tools:$PATH"
  echo "[BulenCoin] Installing platforms/build-tools/NDK locally..."
  yes | sdkmanager --sdk_root="$ANDROID_SDK_ROOT" \
    "platform-tools" \
    "platforms;android-34" \
    "build-tools;34.0.0" \
    "ndk;${ANDROID_NDK_VERSION}" >/dev/null
  yes | sdkmanager --sdk_root="$ANDROID_SDK_ROOT" --licenses >/dev/null
}

build_app() {
  if [[ -z "$MOBILE_APP_DIR" || ! -d "$MOBILE_APP_DIR" ]]; then
    echo "[BulenCoin] Set MOBILE_APP_DIR to your Android project root (with gradlew) to build." >&2
    exit 1
  fi
  if [[ -n "${ANDROID_IMAGE:-}" ]]; then
    echo "[BulenCoin] Building Android app via Docker image $ANDROID_IMAGE ..."
    docker run --rm \
      -e ANDROID_SDK_ROOT=/opt/android-sdk \
      -e JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 \
      -v "$ANDROID_SDK_ROOT":/opt/android-sdk \
      -v "$MOBILE_APP_DIR":/workspace \
      -w /workspace \
      "$ANDROID_IMAGE" \
      bash -lc "./gradlew assembleRelease"
  else
    echo "[BulenCoin] Building Android app locally with installed SDK..."
    (cd "$MOBILE_APP_DIR" && ANDROID_SDK_ROOT="$ANDROID_SDK_ROOT" ./gradlew assembleRelease)
  fi

  echo "[BulenCoin] Copying built APKs/AABs to $DIST_DIR ..."
  find "$MOBILE_APP_DIR" -path "*/build/outputs/*/*.apk" -o -path "*/build/outputs/*/*.aab" | while read -r artifact; do
    cp "$artifact" "$DIST_DIR"/
  done
  echo "[BulenCoin] Artifacts copied to $DIST_DIR. Sign/notarize as required."
}

if choose_docker_image; then
  install_with_docker
else
  install_with_sdkmanager
fi

if [[ "${1:-}" == "build" ]]; then
  build_app
fi

cat <<EOF

[BulenCoin] Android toolchain ready.
- SDK cached at $ANDROID_SDK_ROOT (mounts to /opt/android-sdk in Docker).
- To build: set MOBILE_APP_DIR to your Android project (with gradlew) and run:
    MOBILE_APP_DIR=/path/to/app ./scripts/setup_mobile_toolchains.sh build
- Outputs land in $DIST_DIR

iOS/TestFlight:
- Requires macOS with Xcode/fastlane; build and upload from a Mac (cannot ship from this script).
EOF
