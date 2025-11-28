#!/usr/bin/env bash
set -euo pipefail

# Build the BulenCoin mobile Android app end-to-end.
# - Prepares Android SDK/NDK (via scripts/setup_mobile_toolchains.sh)
# - Ensures Expo prebuild for Android exists (generates android/ + gradlew if missing)
# - Runs assembleRelease and copies APK/AAB to dist/mobile

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MOBILE_DIR="${MOBILE_APP_DIR:-$ROOT_DIR/mobile}"
DIST_DIR="${DIST_DIR:-$ROOT_DIR/dist/mobile}"
ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-$ROOT_DIR/.android-sdk-user}"

if [[ ! -d "$MOBILE_DIR" ]]; then
  echo "[BulenCoin] mobile/ app not found at $MOBILE_DIR" >&2
  exit 1
fi

mkdir -p "$DIST_DIR"

echo "[BulenCoin] Preparing Android SDK/NDK..."
ANDROID_SDK_ROOT="$ANDROID_SDK_ROOT" MOBILE_APP_DIR="$MOBILE_DIR" "$ROOT_DIR/scripts/setup_mobile_toolchains.sh"

cd "$MOBILE_DIR"

if [[ ! -f android/gradlew ]]; then
  echo "[BulenCoin] android/ directory missing; running Expo prebuild..."
  npx expo prebuild --platform android
fi

export ANDROID_SDK_ROOT
export PATH="$ANDROID_SDK_ROOT/cmdline-tools/latest/bin:$ANDROID_SDK_ROOT/platform-tools:$PATH"
if [[ -z "${JAVA_HOME:-}" ]]; then
  if JDK_PATH="$(ls -d "$ROOT_DIR"/.jdks/amazon-corretto-17* 2>/dev/null | head -n1)"; then
    export JAVA_HOME="$JDK_PATH"
    export PATH="$JAVA_HOME/bin:$PATH"
  fi
fi
export NODE_ENV=production
export GRADLE_USER_HOME="${GRADLE_USER_HOME:-$MOBILE_DIR/.gradle-user-local}"
mkdir -p "$GRADLE_USER_HOME"
PROJECT_CACHE_DIR="${PROJECT_CACHE_DIR:-$GRADLE_USER_HOME/project-cache}"
mkdir -p "$PROJECT_CACHE_DIR"
export TMPDIR="${TMPDIR:-$MOBILE_DIR/.tmp}"
mkdir -p "$TMPDIR"
export METRO_CACHE_DIR="${METRO_CACHE_DIR:-$MOBILE_DIR/.metro-cache}"
mkdir -p "$METRO_CACHE_DIR"

echo "[BulenCoin] Building release APK/AAB..."
(
  cd android
  ./gradlew --no-daemon --project-cache-dir "$PROJECT_CACHE_DIR" assembleRelease
)

echo "[BulenCoin] Collecting artifacts to $DIST_DIR"
find "$MOBILE_DIR/android" -path "*/build/outputs/*/*.apk" -o -path "*/build/outputs/*/*.aab" | while read -r artifact; do
  cp "$artifact" "$DIST_DIR"/
done

echo "[BulenCoin] Done. Artifacts in $DIST_DIR"
