#!/bin/sh

set -eu

package_name="com.daengdabang.app"
apk_path="android/app/build/outputs/apk/debug/app-debug.apk"
artifact_dir="android/app/build/outputs/apk/debug"
launch_log="$artifact_dir/app-debug-launch.txt"
app_log="$artifact_dir/app-debug-logcat.txt"
webview_state="$artifact_dir/app-debug-webview.json"

capture_exit() {
  result=$?
  trap - EXIT
  # Preserve the last screen/log even when the WebView check fails.
  adb exec-out screencap -p > "$artifact_dir/app-debug-launch.png" || true
  current_pid="$(adb shell pidof "$package_name" 2>/dev/null | tr -d '\r')"
  if [ -n "$current_pid" ]; then
    adb logcat -d -v threadtime --pid="$current_pid" > "$app_log" || true
  else
    adb logcat -d -v threadtime > "$app_log" || true
  fi
  adb forward --remove tcp:9222 >/dev/null 2>&1 || true
  exit "$result"
}
trap capture_exit EXIT

adb logcat -c
adb install -r "$apk_path"
adb shell am force-stop "$package_name"
adb shell am start -W -n "$package_name/.MainActivity" | tee "$launch_log"
sleep 8

app_pid="$(adb shell pidof "$package_name" | tr -d '\r')"
if [ -z "$app_pid" ]; then
  adb logcat -d -v threadtime > "$app_log"
  cat "$app_log"
  exit 1
fi

adb shell dumpsys activity activities \
  | grep -F -e "$package_name/.MainActivity" -e "$package_name/$package_name.MainActivity" \
  | tee -a "$launch_log"
adb exec-out screencap -p > "$artifact_dir/app-debug-launch.png"
adb logcat -d -v threadtime --pid="$app_pid" > "$app_log"

if grep -F "FATAL EXCEPTION" "$app_log"; then
  cat "$app_log"
  exit 1
fi

case "$app_pid" in
  ''|*[!0-9]*) echo "Expected one app process, found: $app_pid" >&2; exit 1 ;;
esac
# WebView names this socket with its owning process PID. Never inspect another app.
devtools_socket="webview_devtools_remote_$app_pid"
socket_ready=false
attempt=0
while [ "$attempt" -lt 20 ]; do
  if adb shell cat /proc/net/unix | tr -d '\r' \
    | awk -v expected="@$devtools_socket" '$NF == expected { found=1 } END { exit !found }'; then
    socket_ready=true
    break
  fi
  attempt=$((attempt + 1))
  sleep 1
done
printf 'App PID: %s; DevTools socket: %s; ready: %s\n' "$app_pid" "$devtools_socket" "$socket_ready" | tee -a "$launch_log"
if [ "$socket_ready" != true ]; then
  adb shell cat /proc/net/unix >> "$launch_log"
  cat "$app_log"
  exit 1
fi

adb forward tcp:9222 "localabstract:$devtools_socket"
node scripts/verify-android-webview.mjs > "$webview_state"
cat "$webview_state"
sleep 1
adb exec-out screencap -p > "$artifact_dir/app-debug-launch.png"
adb logcat -d -v threadtime --pid="$app_pid" > "$app_log"
if grep -F "FATAL EXCEPTION" "$app_log"; then
  cat "$app_log"
  exit 1
fi
