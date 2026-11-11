#!/bin/sh
set -eu

# Runs only on the disposable CI emulator, after the debug WebView checks.
# The release signature differs from the CI-generated debug signature.
package_name="com.daengdabang.app"
artifact_dir="android/app/build/outputs/apk/release"
adb uninstall "$package_name"
adb logcat -c
adb install "$artifact_dir/app-release.apk"
adb shell am start -W -n "$package_name/.MainActivity" > "$artifact_dir/launch.txt"

attempt=0
while [ "$attempt" -lt 20 ]; do
    sleep 2
    adb shell uiautomator dump /sdcard/ddb-release-window.xml > /dev/null
    adb pull /sdcard/ddb-release-window.xml "$artifact_dir/window.xml" > /dev/null
    if grep -q '댕다방에 오신 걸 환영해요' "$artifact_dir/window.xml"; then break; fi
    attempt=$((attempt + 1))
done
grep -q '댕다방에 오신 걸 환영해요' "$artifact_dir/window.xml"
app_pid="$(adb shell pidof "$package_name" | tr -d '\r')"
test -n "$app_pid"
adb logcat -d -v threadtime --pid="$app_pid" > "$artifact_dir/logcat.txt"
if grep -q 'FATAL EXCEPTION' "$artifact_dir/logcat.txt"; then exit 1; fi
adb exec-out screencap -p > "$artifact_dir/launch.png"

# A second installation of the same signed build must preserve app data.
adb install -r "$artifact_dir/app-release.apk" > "$artifact_dir/update-install.txt"
grep -q 'Success' "$artifact_dir/update-install.txt"
