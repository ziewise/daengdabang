"""Verify the unmodified public APK on a disposable CI Android emulator."""
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys
import time
import urllib.request
import xml.etree.ElementTree as ET

OUT = Path('verification')
OUT.mkdir(exist_ok=True)
PACKAGE = 'com.daengdabang.app'
APK = Path('public-release.apk')
BASE = 'https://github.com/ziewise/daengdabang/releases/latest/download/'

def adb(*args, binary=False):
    result = subprocess.run(['adb', *args], capture_output=True, check=True, timeout=45)
    return result.stdout if binary else result.stdout.decode('utf-8', errors='replace')

def dump(name):
    adb('shell', 'uiautomator', 'dump', '/sdcard/ddb-verify.xml')
    raw = adb('shell', 'cat', '/sdcard/ddb-verify.xml')
    (OUT / f'{name}.xml').write_text(raw, encoding='utf-8')
    return ET.fromstring(raw)

def text(root):
    return '\n'.join(n.attrib.get('text', '') + ' ' + n.attrib.get('content-desc', '') for n in root.iter('node'))

def wait_text(needle, name, attempts=18):
    last = ''
    for _ in range(attempts):
        try:
            root = dump(name)
            last = text(root)
            if needle in last:
                return root
        except (subprocess.SubprocessError, ET.ParseError):
            pass
        time.sleep(2)
    raise AssertionError(f'{needle!r} not visible: {last[:600]}')

def screenshot(name):
    (OUT / f'{name}.png').write_bytes(adb('exec-out', 'screencap', '-p', binary=True))

def tap_node(root, label):
    candidates = [n for n in root.iter('node') if n.attrib.get('text') == label or n.attrib.get('content-desc') == label]
    assert candidates, f'No visible {label!r} control'
    x1, y1, x2, y2 = map(int, re.findall(r'\d+', candidates[-1].attrib['bounds']))
    assert x2 > x1 and y2 > y1
    adb('shell', 'input', 'tap', str((x1 + x2) // 2), str((y1 + y2) // 2))

if sys.argv[1] == 'download':
    with urllib.request.urlopen(BASE + 'build-info.json', timeout=60) as response:
        info = json.load(response)
    with urllib.request.urlopen(BASE + 'DaengDaBang-Android.apk', timeout=120) as response:
        data = response.read()
    assert hashlib.sha256(data).hexdigest() == info['apkSha256']
    APK.write_bytes(data)
    (OUT / 'public-build-info.json').write_text(json.dumps(info, indent=2), encoding='utf-8')
    print(json.dumps({'version': info['versionName'], 'versionCode': info['versionCode'], 'sha256Verified': True}))
    sys.exit(0)

report = {'publicApkUnmodified': True}
try:
    adb('install', str(APK))
    package = adb('shell', 'dumpsys', 'package', PACKAGE)
    (OUT / 'installed-package.txt').write_text(package, encoding='utf-8')
    info = json.loads((OUT / 'public-build-info.json').read_text())
    assert f"versionCode={info['versionCode']} " in package
    adb('shell', 'am', 'start', '-W', '-n', PACKAGE + '/.MainActivity')
    root = wait_text('댕다방에 오신 걸 환영해요', 'home')
    screenshot('home')
    tap_node(root, '쇼핑')
    time.sleep(8)
    root = dump('shopping-top')
    screenshot('shopping-top')
    assert '먹거리' in text(root), 'Shopping tab did not open'
    width, height = map(int, re.search(r'(\d+)x(\d+)', adb('shell', 'wm', 'size')).groups())
    for index in range(2):
        adb('shell', 'input', 'swipe', str(width // 2), str(int(height * .70)), str(width // 2), str(int(height * .38)), '450')
        time.sleep(3)
        root = dump(f'shopping-{index + 1}')
        screenshot(f'shopping-{index + 1}')
    report['shoppingRendered'] = True
    report['companionAccessibilityPresent'] = '산책 친구' in text(root)
    # Use the released app's existing incoming-link handler. It opens this
    # unbundled informational page in Android Custom Tabs, as an app link does.
    adb('shell', 'am', 'start', '-W', '-a', 'android.intent.action.VIEW', '-d',
        'https://www.daengdabang.com/brand-story/#bsw-giving', '-n', PACKAGE + '/.MainActivity')
    root = wait_text('구매가 많아질수록', 'brand-story', attempts=24)
    screenshot('brand-story')
    report['brandStoryPurchasePromiseVisible'] = True
    for index in range(3):
        if '유기견 보호 재단' in text(root):
            break
        adb('shell', 'input', 'swipe', str(width // 2), str(int(height * .68)), str(width // 2), str(int(height * .43)), '400')
        time.sleep(2)
        root = dump(f'brand-story-donation-{index}')
    assert '유기견 보호 재단' in text(root), 'Donation recipient wording not visible'
    screenshot('brand-story-donation')
    report['brandStoryDonationVisible'] = True
    report['brandStoryDisplay'] = 'Android Custom Tab opened by the native app'
    report['version'] = info['versionName']
    report['passed'] = True
finally:
    screenshot('final-state')
    (OUT / 'activity.txt').write_text(adb('shell', 'dumpsys', 'activity', 'activities'), encoding='utf-8')
    (OUT / 'report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps(report))
