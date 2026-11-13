#!/bin/sh
set -eu

# Runs only on the disposable CI emulator, after the debug WebView checks.
# The release signature differs from the CI-generated debug signature.
package_name="com.daengdabang.app"
artifact_dir="android/app/build/outputs/apk/release"
capture_receipts() {
    adb shell dumpsys activity activities > "$artifact_dir/activity.txt" || true
    adb logcat -d -v threadtime > "$artifact_dir/logcat.txt" || true
    adb exec-out screencap -p > "$artifact_dir/final-state.png" || true
}
trap capture_receipts EXIT
adb uninstall "$package_name"
adb logcat -c
# The google_apis CI emulator permits root; no user device is touched.
# Install the actual previous public release, create private app data, then
# update without uninstalling. A fresh-install-only test misses signing bugs.
test -n "$DDB_PREVIOUS_ANDROID_APK"
adb root > "$artifact_dir/emulator-root.txt"
adb wait-for-device
test "$(adb shell id -u | tr -d '\r')" = "0"
adb install "$DDB_PREVIOUS_ANDROID_APK" > "$artifact_dir/previous-install.txt"
adb shell am start -W -n "$package_name/.MainActivity" > "$artifact_dir/previous-launch.txt"
adb shell mkdir -p "/data/user/0/$package_name/files"
adb shell "echo ddb-upgrade-preserves-data > /data/user/0/$package_name/files/ddb-upgrade-proof"
adb install -r "$artifact_dir/app-release.apk" > "$artifact_dir/update-install.txt"
grep -q 'Success' "$artifact_dir/update-install.txt"
adb shell cat "/data/user/0/$package_name/files/ddb-upgrade-proof" | tr -d '\r' > "$artifact_dir/retained-data.txt"
grep -qx 'ddb-upgrade-preserves-data' "$artifact_dir/retained-data.txt"
adb shell dumpsys package "$package_name" > "$artifact_dir/installed-package.txt"
grep -q "versionCode=$DDB_ANDROID_VERSION_CODE " "$artifact_dir/installed-package.txt"
printf '{"fromVersionCode":%s,"toVersionCode":%s,"dataRetained":true}\n' "$DDB_PREVIOUS_ANDROID_VERSION_CODE" "$DDB_ANDROID_VERSION_CODE" > "$artifact_dir/upgrade-check.json"
# The old-version launch is only upgrade preparation; measure the new APK.
adb shell am force-stop "$package_name"
adb logcat -c
adb shell input keyevent KEYCODE_WAKEUP
adb shell wm dismiss-keyguard
adb shell am start -W -n "$package_name/.MainActivity" > "$artifact_dir/launch.txt"

attempt=0
while [ "$attempt" -lt 20 ]; do
    sleep 2
    # A freshly launched WebView may not have an accessibility root yet.
    # A failed dump/pull is a retry, not proof that the app failed to open.
    if adb shell uiautomator dump /sdcard/ddb-release-window.xml > /dev/null \
        && adb pull /sdcard/ddb-release-window.xml "$artifact_dir/window.xml" > /dev/null; then
        if grep -q '댕다방에 오신 걸 환영해요' "$artifact_dir/window.xml"; then break; fi
    fi
    attempt=$((attempt + 1))
done
grep -q '댕다방에 오신 걸 환영해요' "$artifact_dir/window.xml"
app_pid="$(adb shell pidof "$package_name" | tr -d '\r')"
test -n "$app_pid"
adb logcat -d -v threadtime --pid="$app_pid" > "$artifact_dir/logcat.txt"
if grep -q 'FATAL EXCEPTION' "$artifact_dir/logcat.txt"; then exit 1; fi
adb exec-out screencap -p > "$artifact_dir/launch.png"
sh scripts/assert-android-responsive.sh "$artifact_dir/startup-health.txt"
python3 scripts/verify-android-interactions.py "$artifact_dir"
