"""Put both web payloads in the same CI-only debug shell for a fair comparison."""
import os
from pathlib import Path
import subprocess
import sys
import zipfile

assert os.environ.get('GITHUB_ACTIONS') == 'true', 'Disposable CI emulator only'
template, previous, destination = map(Path, sys.argv[1:])
destination.mkdir(parents=True, exist_ok=True)
tools = sorted((Path(os.environ['ANDROID_HOME']) / 'build-tools').iterdir(), key=lambda p: tuple(int(n) for n in p.name.split('.') if n.isdigit()))[-1]
for label, payload in [('baseline', previous), ('candidate', template)]:
    unsigned = destination / f'{label}-unsigned.apk'
    aligned = destination / f'{label}.apk'
    with zipfile.ZipFile(template) as shell, zipfile.ZipFile(payload) as assets, zipfile.ZipFile(unsigned, 'w') as out:
        for info in shell.infolist():
            if info.filename.startswith(('assets/public/', 'META-INF/')):
                continue
            out.writestr(info, shell.read(info))
        for original in assets.infolist():
            if not original.filename.startswith('assets/public/'):
                continue
            # Same compression and metadata for both asset sets.
            info = zipfile.ZipInfo(original.filename, (2026, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            out.writestr(info, assets.read(original))
    subprocess.run([str(tools / 'zipalign'), '-f', '-P', '16', '4', str(unsigned), str(aligned)], check=True)
    subprocess.run([str(tools / 'apksigner'), 'sign', '--ks', str(Path.home() / '.android/debug.keystore'), '--ks-pass', 'pass:android', '--key-pass', 'pass:android', str(aligned)], check=True)
    subprocess.run([str(tools / 'apksigner'), 'verify', str(aligned)], check=True)
    # Assert payload bytes stayed exactly equal to the source APK.
    with zipfile.ZipFile(payload) as source, zipfile.ZipFile(aligned) as result:
        for name in source.namelist():
            if name.startswith('assets/public/'):
                assert source.read(name) == result.read(name), name
print('Prepared identical debug shells with byte-verified baseline and candidate web payloads')
