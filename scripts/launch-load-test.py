"""Bounded external mixed journey test against an authenticated isolated lab.

PSP approvals are simulated at a separate HTTP service. No production writes,
real card charges, email, social posting, or automatic write retries are allowed.
"""
import asyncio
import collections
import io
import json
import os
from pathlib import Path
import random
import statistics
import time
from urllib.parse import urlsplit

import aiohttp
from PIL import Image

BASE=os.environ['DDB_LAB_BASE'].rstrip('/')
TOKEN=os.environ['DDB_LAB_TOKEN']
parsed=urlsplit(BASE)
assert parsed.scheme=='https' and parsed.hostname=='api.daengdabang.com'
assert parsed.path.startswith('/_launch-test/') and len(parsed.path.split('/'))==3
assert not parsed.query and not parsed.fragment
PROFILE=json.loads(Path('scripts/launch-load-profile.json').read_text())
assert 1<=PROFILE['users']<=1500 and 10<=PROFILE['holdSeconds']<=360
assert 0<=PROFILE.get('userOffset',0)<=4000-PROFILE['users']
RUN=os.environ.get('GITHUB_RUN_ID',str(time.time_ns()))
samples=collections.defaultdict(list)
statuses=collections.Counter()
errors=collections.Counter()
examples=[]
visitors=set()
completed=collections.Counter()
stop=asyncio.Event()
active=0
peak=0
aborted=''
timeline=[]
start=time.monotonic()
deadline=start+PROFILE['rampSeconds']+PROFILE['holdSeconds']
randomizer=random.Random(20261116)
photo=Image.frombytes('RGB',(800,600),randomizer.randbytes(800*600*3)).resize((1600,1200))
out=io.BytesIO();photo.save(out,format='JPEG',quality=84);photo_bytes=out.getvalue()

async def request(session, kind, path, visitor, *, token=None, expected=200, **kwargs):
    assert path.startswith(('/lab/session/','/api/v1/products','/api/v1/showcase/','/api/v1/payments/toss/'))
    assert '..' not in path and '://' not in path
    headers={'X-DDB-Launch-Token':TOKEN,'X-Lab-Visitor':str(visitor)}
    if token:headers['Authorization']='Bearer '+token
    begun=time.monotonic();status=0;body=b''
    try:
        async with session.request(kwargs.pop('method','GET'),BASE+path,headers=headers,
                                   allow_redirects=False,**kwargs) as response:
            status=response.status;body=await response.read()
        statuses[f'{kind}:{status}']+=1
        if status!=expected:raise ValueError(f'HTTP {status}')
        if kind.endswith('photo'):return len(body)>100
        return json.loads(body)
    except (aiohttp.ClientError,asyncio.TimeoutError,ValueError) as exc:
        errors[kind]+=1
        if len(examples)<20:
            # Body may contain a synthetic order error. Never persist tokens,
            # headers, successful sessions, or generated JWTs in artifacts.
            examples.append({'kind':kind,'status':status,'error':type(exc).__name__,
                             'body':body[:250].decode(errors='replace') if status>=400 else ''})
        return None
    finally:
        samples[kind].append((time.monotonic()-begun)*1000)

async def checkout(session,visitor,token,iteration):
    key=f'launch-{RUN}-{visitor}-{iteration}'
    payload={'lines':[{'productId':'p_1','qty':1,'size':'S','color':'Red'}],
             'paymentMethod':'card','idempotencyKey':key,
             'delivery':{'recipientName':'부하검증','phone':'010-0000-0000','postalCode':'00000',
                         'addressLine1':'실배송 금지 부하검증 주소','addressLine2':'시험 데이터',
                         'deliveryZone':'mainland','requestCode':'front_door','requestNote':'시험용'}}
    order=await request(session,'create','/api/v1/payments/toss/orders',visitor,token=token,
                        method='POST',expected=201,json=payload)
    if not order:return
    if order.get('mode')!='test':raise RuntimeError('Lab safety boundary: non-test order')
    body={'orderId':order['orderId'],'paymentKey':'lab_payment_'+order['orderId'],'amount':order['amount']}
    result=await request(session,'confirm','/api/v1/payments/toss/confirm',visitor,token=token,method='POST',json=body)
    if result and result.get('status')=='test_paid' and result.get('providerStatus')=='DONE':
        completed['payments']+=1
        if iteration==0:
            # Explicitly test duplicate confirmation; never retry an unknown failure.
            duplicate=await request(session,'duplicate_confirm','/api/v1/payments/toss/confirm',visitor,
                                    token=token,method='POST',json=body)
            if duplicate and duplicate['orderId']==order['orderId'] and duplicate['status']=='test_paid':
                completed['idempotentConfirmations']+=1
            else:errors['idempotency']+=1
    elif result:errors['payment_semantics']+=1

async def visitor(session,ident):
    global active,peak
    await asyncio.sleep((ident-1)*PROFILE['rampSeconds']/PROFILE['users'])
    if stop.is_set():return
    active+=1;peak=max(peak,active);visitors.add(ident)
    try:
        auth=await request(session,'session',f'/lab/session/{ident+PROFILE.get("userOffset",0)}',ident)
        if not auth:return
        if not auth.get('lab') or auth.get('provider')!='local-http-simulator':
            raise RuntimeError('Not the isolated mixed-write lab')
        token=auth['token'];iteration=0
        while time.monotonic()<deadline and not stop.is_set():
            await request(session,'products','/api/v1/products?limit=20',ident)
            feed=await request(session,'feed','/api/v1/showcase/posts?limit=12',ident)
            if feed:
                posts=feed.get('items',[])[:4]
                results=await asyncio.gather(*(request(session,'feed_photo',p['image_url']+'?size=card',ident) for p in posts))
                if len(results)==4 and all(results):completed['fourPhotoViews']+=1
            if iteration==0 and ident%5==0 and not stop.is_set():
                form=aiohttp.FormData()
                for k,v in {'caption':'외부 부하 시험용 사진입니다.','display_name':'부하 검증',
                            'public_display_consent':'true','privacy_notice_version':auth['privacyNoticeVersion']}.items():
                    form.add_field(k,v)
                form.add_field('file',photo_bytes,filename='synthetic.jpg',content_type='image/jpeg')
                post=await request(session,'upload','/api/v1/showcase/posts',ident,token=token,
                                   method='POST',expected=201,data=form)
                if post:
                    visible=await request(session,'uploaded_photo',post['image_url']+'?size=card',ident)
                    if visible:completed['uploadsAndReadback']+=1
                    else:errors['upload_readback']+=1
            if ident%10==0 and iteration%5==0 and not stop.is_set():
                await checkout(session,ident,token,iteration)
            completed['journeys']+=1;iteration+=1
            await asyncio.sleep(4+(ident%5))
    finally:active-=1

async def guard():
    global aborted
    previous_requests=0;previous_errors=0;bad_health=0
    async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=7)) as health:
        while time.monotonic()<deadline and not stop.is_set():
            await asyncio.sleep(10)
            count=sum(len(v) for v in samples.values());failed=sum(errors.values())
            window=count-previous_requests;bad=failed-previous_errors
            health_start=time.monotonic();health_status=0
            try:
                async with health.get('https://api.daengdabang.com/health',allow_redirects=False) as r:
                    health_status=r.status;await r.read()
            except Exception:pass
            elapsed=time.monotonic()-health_start
            bad_health=bad_health+1 if health_status!=200 or elapsed>5 else 0
            row={'second':round(time.monotonic()-start),'activeUsers':active,'requests':count,
                 'errors':failed,'healthStatus':health_status,'healthMs':round(elapsed*1000)}
            timeline.append(row);print(json.dumps(row),flush=True)
            if bad_health>=2:aborted='Production health exceeded guard threshold twice'
            if window>=100 and bad/window>.05:aborted='More than 5% lab errors in a ten-second window'
            if aborted:stop.set()
            previous_requests=count;previous_errors=failed

def quantile(values,q):
    values=sorted(values)
    return round(values[min(len(values)-1,int((len(values)-1)*q))],1) if values else None

async def main():
    connector=aiohttp.TCPConnector(limit=7500,limit_per_host=7500,ttl_dns_cache=300)
    tasks=[]
    try:
        async with aiohttp.ClientSession(connector=connector,timeout=aiohttp.ClientTimeout(total=30)) as session:
            tasks=[asyncio.create_task(visitor(session,i)) for i in range(1,PROFILE['users']+1)]
            monitor=asyncio.create_task(guard())
            await asyncio.gather(*tasks)
            stop.set();await monitor
    finally:
        report={'scope':'External GitHub-hosted generator, Cloudflare named tunnel, isolated PostgreSQL/Redis/media on the production PC. PSP HTTP simulator: NOT Toss/card-network capacity proof.',
                'profile':PROFILE,'runId':RUN,'durationSeconds':round(time.monotonic()-start,2),
                'peakActiveUsers':peak,'uniqueVisitors':len(visitors),'aborted':aborted,
                'completed':dict(completed),'errors':dict(errors),'examples':examples,'statuses':dict(statuses),
                'uploadBytesEach':len(photo_bytes),'timeline':timeline,
                'latencyMs':{k:{'count':len(v),'p50':quantile(v,.5),'p95':quantile(v,.95),
                                'p99':quantile(v,.99),'max':round(max(v),1)} for k,v in samples.items()}}
        Path('launch-load-result.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
        print(json.dumps({k:report[k] for k in ['peakActiveUsers','uniqueVisitors','aborted','completed','errors','latencyMs']},ensure_ascii=False),flush=True)
    if aborted or errors:raise SystemExit(1)

asyncio.run(main())
