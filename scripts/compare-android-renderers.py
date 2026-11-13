import hashlib, json, re, subprocess, sys, time, urllib.request, zipfile
from pathlib import Path
import xml.etree.ElementTree as ET

OUT=Path('verification'); OUT.mkdir(exist_ok=True)
PACKAGE='com.daengdabang.app'
def adb(*args, binary=False):
    r=subprocess.run(['adb',*args],capture_output=True,check=True,timeout=30)
    return r.stdout if binary else r.stdout.decode('utf-8',errors='replace')
def dump():
    adb('shell','uiautomator','dump','/sdcard/compare.xml')
    raw=adb('shell','cat','/sdcard/compare.xml')
    assert "isn't responding" not in raw, 'ANR dialog'
    return ET.fromstring(raw)
def node(root,label,exact=False):
    for n in root.iter('node'):
        values=[n.get('text',''),n.get('content-desc','')]
        match=label in values if exact else any(label in v for v in values)
        bounds=list(map(int,re.findall(r'\d+',n.get('bounds',''))))
        if match and len(bounds)==4 and bounds[2]>bounds[0] and bounds[3]>bounds[1]: return bounds
def wait(label):
    for _ in range(8):
        try:
            root=dump()
            if node(root,label): return root
        except (subprocess.SubprocessError,ET.ParseError): pass
        time.sleep(.5)
    raise AssertionError('UI missing: '+label)
def tap(root,label):
    b=node(root,label,True); assert b,label
    adb('shell','input','tap',str((b[0]+b[2])//2),str((b[1]+b[3])//2))

if sys.argv[1]=='download':
    base='https://github.com/ziewise/daengdabang/releases/latest/download/'
    info=json.load(urllib.request.urlopen(base+'build-info.json'))
    data=urllib.request.urlopen(base+'DaengDaBang-Android.apk').read()
    assert info['versionCode']==11
    assert hashlib.sha256(data).hexdigest()==info['apkSha256']
    Path('baseline.apk').write_bytes(data)
    (OUT/'baseline-build.json').write_text(json.dumps(info))
    sys.exit(0)

report={'renderer':sys.argv[1],'sameDevice':{'api':35,'cores':2,'ramMb':3072,'size':'720x1600'},'runs':[]}
try:
    adb('root'); adb('wait-for-device')
    adb('shell','wm','size','720x1600'); adb('shell','wm','density','320')
    for _ in range(3): time.sleep(30)
    for label,apk in [('baseline','baseline.apk'),('candidate','candidate/app-release.apk')]:
        data=Path(apk).read_bytes()
        with zipfile.ZipFile(apk) as z: metadata=json.loads(z.read('assets/public/native-build.json'))
        report[label]={'sha256':hashlib.sha256(data).hexdigest(),'metadata':metadata}
        if label=='candidate': assert metadata['sourceCommit']=='24958b616ef165811795ac19aa66442195d42696'
        adb('install','-r',apk)
        for run in range(3):
            record={'apk':label,'run':run+1}
            stem=f'{label}-{run+1}'
            try:
                adb('shell','am','force-stop',PACKAGE); time.sleep(1)
                adb('logcat','-c')
                start=time.monotonic()
                record['launch']=adb('shell','am','start','-W','-n',PACKAGE+'/.MainActivity')
                root=wait('댕다방에 오신 걸 환영해요')
                record['homeMs']=round((time.monotonic()-start)*1000)
                start=time.monotonic(); tap(root,'쇼핑'); wait('댕댕이의 일상')
                record['shopMs']=round((time.monotonic()-start)*1000)
                adb('shell','input','swipe','360','1150','360','600','350'); time.sleep(2)
                (OUT/(stem+'.png')).write_bytes(adb('exec-out','screencap','-p',binary=True))
                root=dump(); tap(root,'홈'); wait('댕다방에 오신 걸 환영해요')
                record['uiPassed']=True
            except Exception as e: record['error']=str(e)
            logs=adb('logcat','-d','-v','threadtime')
            (OUT/(stem+'.log')).write_text(logs)
            record['anr']=bool(re.search(r'ANR in com\.daengdabang\.app|Input dispatching timed out.*com\.daengdabang\.app',logs))
            record['unsupportedLocationPrompt']='GrantPermissionsViewModel: None of [android.permission.ACCESS_COARSE_LOCATION' in logs
            report['runs'].append(record)
            print(json.dumps(record),flush=True)
    candidates=[r for r in report['runs'] if r['apk']=='candidate']
    report['passed']=len(candidates)==3 and all(r.get('uiPassed') and not r['anr'] and not r['unsupportedLocationPrompt'] for r in candidates)
    assert report['passed'],report
finally:
    (OUT/'comparison.json').write_text(json.dumps(report,indent=2))
    (OUT/'last-anr.txt').write_text(adb('shell','dumpsys','activity','lastanr'))
    (OUT/'anr-traces.txt').write_text(adb('shell','cat /data/anr/anr_* 2>/dev/null'))
