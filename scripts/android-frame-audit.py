import hashlib,json,re,subprocess,sys,time,urllib.request,zipfile
from pathlib import Path
import xml.etree.ElementTree as ET

OUT=Path('audit'); OUT.mkdir(exist_ok=True)
PKG='com.daengdabang.app'
VERSIONS={'before':('android-v1.0.10-build11','fce51e5cb26087e5c214dd1e2e70bf5d19fcb219'),
          'current':('android-v1.0.11-build12','99dd51100c67578ffd420c2ab48db7ddf15330d8')}
def adb(*args,check=True,binary=False):
    r=subprocess.run(['adb',*args],check=check,capture_output=True,timeout=40)
    return r.stdout if binary else r.stdout.decode('utf-8',errors='replace')
def ui():
    adb('shell','uiautomator','dump','/sdcard/audit.xml')
    raw=adb('shell','cat','/sdcard/audit.xml')
    assert "isn't responding" not in raw,'ANR dialog'
    return ET.fromstring(raw)
def bounds(root,label,exact=False):
    for n in root.iter('node'):
        vs=[n.get('text',''),n.get('content-desc','')]
        if (label in vs) if exact else any(label in v for v in vs):
            b=list(map(int,re.findall(r'\d+',n.get('bounds',''))))
            if len(b)==4 and b[2]>b[0] and b[3]>b[1]: return b
def wait(label):
    for _ in range(6):
        root=ui()
        if bounds(root,label): return root
        time.sleep(1)
    raise AssertionError('Missing UI '+label)
def tap(b):
    assert b
    adb('shell','input','tap',str((b[0]+b[2])//2),str((b[1]+b[3])//2))

if sys.argv[1]=='download':
    for label,(tag,sha) in VERSIONS.items():
        base='https://github.com/ziewise/daengdabang/releases/download/'+tag+'/'
        info=json.load(urllib.request.urlopen(base+'build-info.json'))
        data=urllib.request.urlopen(base+'DaengDaBang-Android.apk').read()
        assert info['sourceCommit']==sha and hashlib.sha256(data).hexdigest()==info['apkSha256']
        Path(label+'.apk').write_bytes(data)
        (OUT/(label+'-build.json')).write_text(json.dumps(info))
    sys.exit(0)

from perfetto.trace_processor import TraceProcessor
CONFIG='''buffers { size_kb: 16384 fill_policy: RING_BUFFER }
duration_ms: 18000
data_sources { config { name: "android.surfaceflinger.frametimeline" } }
data_sources { config { name: "linux.process_stats" process_stats_config { scan_all_processes_on_start: true } } }
'''
(OUT/'config.txt').write_text(CONFIG)

def summarize(trace):
    with TraceProcessor(trace=str(trace)) as tp:
        rows=list(tp.query("SELECT dur/1e6 AS ms,jank_type,layer_name,on_time_finish FROM actual_frame_timeline_slice LEFT JOIN process USING(upid) WHERE process.name='com.daengdabang.app' AND dur>0 AND layer_name LIKE '%MainActivity%'"))
        assert rows,'No app FrameTimeline data; not a passing measurement'
        ds=sorted(r.ms for r in rows)
        return {'frames':len(ds),'p50Ms':ds[len(ds)//2],'p95Ms':ds[min(len(ds)-1,int(len(ds)*.95))],
                'maxMs':max(ds),'frozenOver700Ms':sum(d>700 for d in ds),
                'appDeadlineMissed':sum('App Deadline Missed' in (r.jank_type or '') for r in rows),
                'anyJank':sum(r.jank_type not in ('None',None) for r in rows),
                'jankTypes':{t:sum(r.jank_type==t for r in rows) for t in set(r.jank_type for r in rows)}}

def capture(stem,action):
    remote='/data/misc/perfetto-traces/'+stem+'.perfetto-trace'
    proc=subprocess.Popen(['adb','shell','perfetto','--txt','-c','-','-o',remote],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
    proc.stdin.write(CONFIG.encode()); proc.stdin.close(); proc.stdin=None
    time.sleep(1)
    action()
    stdout,stderr=proc.communicate(timeout=40)
    assert proc.returncode==0,stderr.decode()
    local=OUT/(stem+'.perfetto-trace')
    adb('pull',remote,str(local))
    stats=summarize(local)
    (OUT/(stem+'.json')).write_text(json.dumps(stats,indent=2))
    return stats

report={'scope':'Actual unchanged signed APKs; Android 15 emulator, 2 vCPU/3072 MiB, Lavapipe, 720x1600; not Galaxy S25 hardware. Native FrameTimeline includes GPU work. No UIAutomator polling during measured navigation/scroll.',
        'order':['before','current','current','before'],'runs':[]}
try:
    adb('root',check=False); adb('wait-for-device')
    adb('shell','wm','size','720x1600'); adb('shell','wm','density','320')
    time.sleep(45); time.sleep(45)
    boot=adb('shell','dumpsys','activity','lastanr'); (OUT/'boot-anr.txt').write_text(boot)
    if 'com.google.android.apps.nexuslauncher' in boot: adb('shell','am','force-stop','com.google.android.apps.nexuslauncher')
    adb('shell','wm','dismiss-keyguard'); ui()
    for idx,label in enumerate(report['order']):
        stem=f'{idx+1}-{label}'
        rec={'version':label,'order':idx+1}
        report['runs'].append(rec)
        adb('uninstall',PKG,check=False); adb('install',label+'.apk'); adb('logcat','-c')
        rec['launch']=adb('shell','am','start','-W','-n',PKG+'/.MainActivity')
        root=wait('댕다방에 오신 걸 환영해요')
        time.sleep(5)
        shop=bounds(root,'쇼핑',True)
        rec['firstShopFrames']=capture(stem+'-shop',lambda:tap(shop))
        root=wait('댕댕이의 일상')
        # The scrolling phase contains only real input swipes; UI dumping and
        # screenshots are deliberately outside its recording interval.
        def scroll():
            for n in range(12):
                start,end=(1150,500) if n<6 else (500,1150)
                adb('shell','input','swipe','360',str(start),'360',str(end),'500')
                time.sleep(.15)
        rec['scrollFrames']=capture(stem+'-scroll',scroll)
        (OUT/(stem+'.png')).write_bytes(adb('exec-out','screencap','-p',binary=True))
        logs=adb('logcat','-d','-v','threadtime'); (OUT/(stem+'.log')).write_text(logs)
        rec['anr']=bool(re.search(r'ANR in com\.daengdabang\.app|Input dispatching timed out.*com\.daengdabang\.app',logs))
        print(json.dumps(rec),flush=True)
    assert all(not r.get('anr') for r in report['runs'] if r['version']=='current')
finally:
    (OUT/'report.json').write_text(json.dumps(report,indent=2))
