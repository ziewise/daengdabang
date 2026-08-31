#!/bin/sh

set -eu

package_name="com.daengdabang.app"
apk_path="android/app/build/outputs/apk/debug/app-debug.apk"
artifact_dir="android/app/build/outputs/apk/debug"
launch_log="$artifact_dir/app-debug-launch.txt"
app_log="$artifact_dir/app-debug-logcat.txt"
webview_state="$artifact_dir/app-debug-webview.json"

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

devtools_socket="$(adb shell cat /proc/net/unix \
  | awk '/webview_devtools_remote/ { value=$NF; sub(/^@/, "", value); print value; exit }' \
  | tr -d '\r')"
if [ -z "$devtools_socket" ]; then
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
