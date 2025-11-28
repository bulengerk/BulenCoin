#!/usr/bin/env bash
set -euo pipefail

# One-shot Android build runner that stays in user-writable paths (no sudo needed).
# - Ensures SDK/NDK + licenses in .android-sdk-user
# - Uses local JDK 17 if present under .jdks/
# - Builds release APK/AAB and drops artifacts in dist/mobile

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MOBILE_DIR="$ROOT_DIR/mobile"
SDK_ROOT="$ROOT_DIR/.android-sdk-user"
NDK_VERSION="26.1.10909125"
DIST_DIR="${DIST_DIR:-$ROOT_DIR/dist/mobile}"

if [[ "${EUID:-$(id -u)}" -eq 0 ]]; then
  echo "Do not run this script as root/sudo. Re-run without sudo." >&2
  exit 1
fi

if [[ ! -d "$MOBILE_DIR/android" ]]; then
  echo "mobile/android not found. Make sure the Expo prebuild exists." >&2
  exit 1
fi

mkdir -p "$SDK_ROOT" "$DIST_DIR"

maybe_set_java_home() {
  if [[ -n "${JAVA_HOME:-}" && -x "$JAVA_HOME/bin/java" ]]; then
    return
  fi
  local corretto
  corretto="$(find "$ROOT_DIR/.jdks" -maxdepth 1 -type d -name 'amazon-corretto-17*' 2>/dev/null | head -n1 || true)"
  if [[ -n "$corretto" ]]; then
    export JAVA_HOME="$corretto"
    export PATH="$JAVA_HOME/bin:$PATH"
    return
  fi
  if [[ -d "/usr/lib/jvm/java-17-openjdk-amd64" ]]; then
    export JAVA_HOME="/usr/lib/jvm/java-17-openjdk-amd64"
    export PATH="$JAVA_HOME/bin:$PATH"
    return
  fi
  echo "JDK 17 not found. Install one or drop it under .jdks/ (e.g., amazon-corretto-17*)" >&2
  exit 1
}

ensure_cmdline_tools() {
  if [[ -x "$SDK_ROOT/cmdline-tools/latest/bin/sdkmanager" ]]; then
    return
  fi
  echo "[android-one-shot] Downloading Android cmdline-tools to $SDK_ROOT ..."
  local url="https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip"
  local tmpzip
  tmpzip="$(mktemp /tmp/cmdline-tools.XXXXXX.zip)"
  curl -L "$url" -o "$tmpzip"
  mkdir -p "$SDK_ROOT/cmdline-tools"
  unzip -q "$tmpzip" -d "$SDK_ROOT/cmdline-tools"
  rm "$tmpzip"
  if [[ -d "$SDK_ROOT/cmdline-tools/cmdline-tools" ]]; then
    rm -rf "$SDK_ROOT/cmdline-tools/latest"
    mv "$SDK_ROOT/cmdline-tools/cmdline-tools" "$SDK_ROOT/cmdline-tools/latest"
  fi
}

ensure_sdk_bits() {
  export PATH="$SDK_ROOT/cmdline-tools/latest/bin:$SDK_ROOT/platform-tools:$PATH"
  yes | sdkmanager --sdk_root="$SDK_ROOT" \
    "platform-tools" \
    "platforms;android-34" \
    "build-tools;34.0.0" \
    "ndk;$NDK_VERSION" >/dev/null
  yes | sdkmanager --sdk_root="$SDK_ROOT" --licenses >/dev/null
}

build() {
  export ANDROID_SDK_ROOT="$SDK_ROOT"
  export NODE_ENV=production
  export GRADLE_USER_HOME="${GRADLE_USER_HOME:-$MOBILE_DIR/.gradle-user-local}"
  export PROJECT_CACHE_DIR="${PROJECT_CACHE_DIR:-$GRADLE_USER_HOME/project-cache}"
  export METRO_CACHE_DIR="${METRO_CACHE_DIR:-$MOBILE_DIR/.metro-cache}"
  export TMPDIR="${TMPDIR:-$MOBILE_DIR/.tmp}"
  mkdir -p "$GRADLE_USER_HOME" "$PROJECT_CACHE_DIR" "$METRO_CACHE_DIR" "$TMPDIR"

  echo "[android-one-shot] Building release APK/AAB ..."
  (cd "$MOBILE_DIR/android" && ./gradlew --no-daemon --project-cache-dir "$PROJECT_CACHE_DIR" assembleRelease)

  echo "[android-one-shot] Collecting artifacts to $DIST_DIR"
  find "$MOBILE_DIR/android" -path "*/build/outputs/*/*.apk" -o -path "*/build/outputs/*/*.aab" | while read -r artifact; do
    cp "$artifact" "$DIST_DIR"/
  done
  echo "[android-one-shot] Done. Artifacts in $DIST_DIR"
}

maybe_set_java_home
ensure_cmdline_tools
ensure_sdk_bits
build
