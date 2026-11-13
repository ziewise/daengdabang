#!/bin/sh
set -eu
# ANRs are logged by system_server, so app-PID-only logcat misses them.
adb logcat -d -v threadtime > "$1"
if grep -E 'ANR in com\.daengdabang\.app|am_anr.*com\.daengdabang\.app|Input dispatching timed out.*com\.daengdabang\.app|Process: com\.daengdabang\.app, PID:' "$1"; then
    echo 'Android startup/navigation was unresponsive or crashed.' >&2
    exit 1
fi
