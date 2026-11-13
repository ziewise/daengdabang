"""Exercise the signed APK's real touch path; never use a modified WebView."""
import json
from pathlib import Path
import re
import subprocess
import sys
import time
import xml.etree.ElementTree as ET

OUT = Path(sys.argv[1])
PACKAGE = 'com.daengdabang.app'

def adb(*args, binary=False):
    r = subprocess.run(['adb', *args], check=True, capture_output=True, timeout=30)
    return r.stdout if binary else r.stdout.decode('utf-8', errors='replace')

def screen():
    adb('shell', 'uiautomator', 'dump', '/sdcard/ddb-performance.xml')
    raw = adb('shell', 'cat', '/sdcard/ddb-performance.xml')
    root = ET.fromstring(raw)
    assert "isn't responding" not in raw and '응답하지' not in raw, 'Android ANR dialog'
    return root

def visible_node(root, label, exact=False):
    for n in root.iter('node'):
        values = (n.get('text', ''), n.get('content-desc', ''))
        matches = label in values if exact else any(label in value for value in values)
        if not matches:
            continue
        bounds = list(map(int, re.findall(r'\d+', n.get('bounds', ''))))
        if len(bounds) == 4 and bounds[2] > bounds[0] and bounds[3] > bounds[1]:
            return bounds
    return None

def wait_for(label):
    deadline = time.monotonic() + 20
    while time.monotonic() < deadline:
        try:
            root = screen()
            if visible_node(root, label):
                return root
        except (subprocess.SubprocessError, ET.ParseError):
            pass
        time.sleep(.5)
    raise AssertionError(f'Visible UI did not respond within 20s: {label}')

def tap(root, label):
    bounds = visible_node(root, label, exact=True)
    assert bounds, f'Missing visible {label} tab'
    x1, y1, x2, y2 = bounds
    adb('shell', 'input', 'tap', str((x1+x2)//2), str((y1+y2)//2))

timings = []
try:
    # Include force-stopped process starts, not just returning to a warm screen.
    for run in range(3):
        adb('shell', 'am', 'force-stop', PACKAGE)
        adb('logcat', '-c')
        start = time.monotonic()
        launch = adb('shell', 'am', 'start', '-W', '-n', PACKAGE+'/.MainActivity')
        root = wait_for('댕다방에 오신 걸 환영해요')
        home_ms = round((time.monotonic()-start)*1000)
        start = time.monotonic()
        tap(root, '쇼핑')
        wait_for('댕댕이의 일상')
        shop_ms = round((time.monotonic()-start)*1000)
        adb('shell', 'input', 'swipe', '360', '1150', '360', '600', '350')
        time.sleep(2)
        (OUT/f'interaction-{run+1}.png').write_bytes(adb('exec-out', 'screencap', '-p', binary=True))
        root = screen()
        tap(root, '홈')
        wait_for('댕다방에 오신 걸 환영해요')
        subprocess.run(['sh','scripts/assert-android-responsive.sh',str(OUT/f'interaction-{run+1}-logcat.txt')], check=True)
        timings.append({'run':run+1,'homeVisibleMs':home_ms,'shopVisibleMs':shop_ms,'launch':launch})
        print(json.dumps(timings[-1]), flush=True)
finally:
    (OUT/'interaction-timings.json').write_text(json.dumps({'scope':'Signed APK, API 35 emulator; timings include adb/accessibility polling','runs':timings},indent=2),encoding='utf-8')
