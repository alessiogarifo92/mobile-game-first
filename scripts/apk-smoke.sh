#!/usr/bin/env bash
# Runs inside the Android emulator job (see .github/workflows/android.yml): installs the debug APK, starts it, checks it
# reaches the map, then updates it in place (adb install -r, as a new APK would be) and checks the progress survived.
set -euo pipefail

APK="${1:-apk/app-debug.apk}"
PKG=com.alessiogarifo.mixsplash
OUT="${SMOKE_OUT:-smoke-out}"
mkdir -p "$OUT"

launch() {
  adb shell am force-stop "$PKG"
  adb logcat -c || true
  # The emulator image shows "not responding" dialogs from Google apps while it settles; they take the foreground.
  adb shell am broadcast -a android.intent.action.CLOSE_SYSTEM_DIALOGS > /dev/null || true
  adb shell input keyevent KEYCODE_WAKEUP || true
  adb shell wm dismiss-keyguard || true
  adb shell monkey -p "$PKG" -c android.intent.category.LAUNCHER 1 > /dev/null
  sleep 5
  adb shell am broadcast -a android.intent.action.CLOSE_SYSTEM_DIALOGS > /dev/null || true
  echo "foreground: $(adb shell dumpsys activity activities | tr -d '\r' | grep -m1 -E 'mResumedActivity|topResumedActivity' || echo unknown)"
  # The debug WebView exposes a DevTools socket named after the app's pid.
  local sock=""
  for _ in $(seq 1 60); do
    sock=$(adb shell cat /proc/net/unix | tr -d '\r' | grep -o 'webview_devtools_remote_[0-9]*' | head -1 || true)
    [ -n "$sock" ] && break
    sleep 2
  done
  [ -n "$sock" ] || { echo "WebView DevTools socket not found: the app did not start"; adb logcat -d | tail -80; exit 1; }
  adb forward --remove-all || true
  adb forward tcp:9222 "localabstract:$sock"
}

adb wait-for-device
adb shell input keyevent 82 || true   # unlock
adb install -r "$APK"
launch
node scripts/apk-smoke.mjs first "$OUT"
adb exec-out screencap -p > "$OUT/01-map.png"

# Update in place: the same package with the same signature, as the next APK of this branch is.
adb install -r "$APK"
launch
node scripts/apk-smoke.mjs after-update "$OUT"
adb exec-out screencap -p > "$OUT/02-after-update.png"
echo "APK smoke test passed"
