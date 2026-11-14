#!/bin/sh

set -eu

package_name="com.daengdabang.app"
apk_path="android/app/build/outputs/apk/debug/app-debug.apk"
artifact_dir="android/app/build/outputs/apk/debug"
launch_log="$artifact_dir/app-debug-launch.txt"
app_log="$artifact_dir/app-debug-logcat.txt"
webview_state="$artifact_dir/app-debug-webview.json"

# First-boot package optimization is unrelated to app startup. Use the same
# phone-sized surface for every run, then measure without setup contention.
adb shell wm size 720x1600
adb shell wm density 320
sleep 45
sleep 45
# A fresh Google APIs emulator can leave a Pixel Launcher ANR above all apps
# before our APK is installed. Record it and close only that boot process.
# Never dismiss or suppress a DaengDaBang ANR during the actual checks.
adb shell dumpsys activity lastanr > "$artifact_dir/emulator-boot-anr.txt"
if grep -q 'com.google.android.apps.nexuslauncher' "$artifact_dir/emulator-boot-anr.txt"; then
    adb shell am force-stop com.google.android.apps.nexuslauncher
    sleep 10
fi
adb shell input keyevent KEYCODE_WAKEUP
adb shell wm dismiss-keyguard
adb shell uiautomator dump /sdcard/ddb-emulator-boot.xml > /dev/null
adb pull /sdcard/ddb-emulator-boot.xml "$artifact_dir/emulator-boot-window.xml" > /dev/null
if grep -E "isn.t responding|응답하지" "$artifact_dir/emulator-boot-window.xml"; then
    echo 'Android emulator is unresponsive before APK installation.' >&2
    exit 1
fi
trap 'test -f "$artifact_dir/startup-health.txt" || adb logcat -d -v threadtime > "$artifact_dir/startup-health.txt"' EXIT
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

# This log is captured before any explicit on-device feature request.
cp "$app_log" "$artifact_dir/app-debug-before-feature-logcat.txt"
if grep -F 'libonnxruntime' "$app_log"; then
  echo 'The optional inference runtime must not load during app startup.' >&2
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

# The WebView check explicitly exercises inference after the media checks.
grep -F 'libonnxruntime' "$app_log" > "$artifact_dir/app-debug-on-demand-runtime.txt"
echo 'Verified inference runtime loads on demand, not during app startup.'

sh scripts/assert-android-responsive.sh "$artifact_dir/startup-health.txt"

if [ -f android/app/build/outputs/apk/release/app-release.apk ]; then
  sh scripts/verify-android-release-startup.sh
fi
