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

# 2026-10-18: 우리 앱(app_pid)의 WebView 디버그 통로만 고른다. 예전에는 처음 보이는 통로를 골라
# 에뮬레이터의 다른 앱(구글 앱 등) 통로에 붙으면 "No debuggable Android WebView page" 로 실패했다.
# 통로가 늦게 생길 수 있어 최대 30초 기다린다. adb 출력의 \r 은 비교 전에 지운다.
devtools_socket=""
socket_attempt=0
while [ "$socket_attempt" -lt 30 ]; do
  devtools_socket="$(adb shell cat /proc/net/unix \
    | tr -d '\r' \
    | awk -v name="webview_devtools_remote_$app_pid" '{ value=$NF; sub(/^@/, "", value); if (value == name) { print value; exit } }')"
  [ -n "$devtools_socket" ] && break
  socket_attempt=$((socket_attempt + 1))
  sleep 1
done
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
