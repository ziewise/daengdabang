#!/bin/sh

set -eu

package_name="com.daengdabang.app"
apk_path="android/app/build/outputs/apk/debug/app-debug.apk"
artifact_dir="android/app/build/outputs/apk/debug"
launch_log="$artifact_dir/app-debug-launch.txt"
app_log="$artifact_dir/app-debug-logcat.txt"

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
adb shell uiautomator dump --compressed /sdcard/app-debug-ui.xml
adb pull /sdcard/app-debug-ui.xml "$artifact_dir/app-debug-ui.xml"
if ! grep -F "댕다방 앱 홈" "$artifact_dir/app-debug-ui.xml"; then
  cat "$artifact_dir/app-debug-ui.xml"
  exit 1
fi
adb exec-out screencap -p > "$artifact_dir/app-debug-launch.png"
adb logcat -d -v threadtime --pid="$app_pid" > "$app_log"

if grep -F "FATAL EXCEPTION" "$app_log"; then
  cat "$app_log"
  exit 1
fi
