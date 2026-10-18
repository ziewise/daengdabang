# 웹 배경 "강아지 장난감 벽지" 무늬 한 장 만들기 — 장난감 그림 9장(originals/web-toys)을 이음매 없이 고르게 흩뿌림
# 운영 값(2026-10-18 사용자 결정): python tools/sticker-assets/build_web_toy_wallpaper.py public/images/ui/web-toy-wallpaper.webp 3000 29 112 0.6 51 0.85:1.35 2000
# 인자: <출력.webp> <타일px> <개수> <그림크기px> <농도> <seed> <크기 최소:최대> <화면 표시 폭(css px)>
import sys, math, random, os
from PIL import Image
SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'originals', 'web-toys', 'toy-{}.webp')
out, T, N, SZ, OP, SEED = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4]), float(sys.argv[5]), int(sys.argv[6])
# 크기 다양하게: '0.85:1.35' 처럼 최소:최대 배율(작은 것도 모양이 또렷하게 보이게 최소를 높게) · 숫자 하나면 1±값
VARY = sys.argv[7] if len(sys.argv) > 7 else ''
VMIN, VMAX = ((float(VARY.split(':')[0]), float(VARY.split(':')[1])) if ':' in VARY else ((1 - float(VARY), 1 + float(VARY)) if VARY else (1, 1)))
rnd = random.Random(SEED)
toys = []
for i in range(1, 10):
    im = Image.open(SRC.format(i)).convert('RGBA')
    r, g, b, a = im.split(); a = a.point(lambda v: 0 if v < 30 else v)   # 옅은 번짐 제거
    im = Image.merge('RGBA', (r, g, b, a)); im = im.crop(a.getbbox())
    # 크기는 눈에 보이는 면적 기준(길쭉한 밧줄 · 덤벨이 작아 보이지 않게): 면적이 SZ×SZ×0.55 가 되게
    area = sum(1 for v in im.split()[3].getdata() if v > 60)
    s = math.sqrt(SZ * SZ * 0.55 / area); s = min(s, SZ * 1.35 / max(im.size)); toys.append(im.resize((max(1, int(im.width * s)), max(1, int(im.height * s))), Image.LANCZOS))
def layout(rnd):
    # 이음매 없이(가장자리끼리 붙는) 최소 간격 무작위 배치 — 목표 개수에 맞게 간격을 줄여 가며
    def tdist(p, q):
        dx = abs(p[0] - q[0]); dy = abs(p[1] - q[1]); return math.hypot(min(dx, T - dx), min(dy, T - dy))
    md = T / math.sqrt(N) * 1.05
    while True:
        pts = []
        for _ in range(20000):
            p = (rnd.random() * T, rnd.random() * T)
            if all(tdist(p, q) >= md for q in pts): pts.append(p)
            if len(pts) >= N: break
        if len(pts) >= N: break
        md *= 0.96
    # 종류 고르게 + 가까운 이웃과 다른 장난감
    EXTRA = [0, 1, 4, 8, 2, 3, 5, 6, 7]   # 두 번째로 나올 때 우선순위: 하트 · 별 · 발바닥 · 공 → 나머지(길쭉한 밧줄 · 뼈다귀는 마지막)
    want = {k: N // 9 for k in range(9)}
    for k in EXTRA[: N % 9]: want[k] += 1
    items = []
    for p in pts:
        near = {k for k, q in items if tdist(p, q) < md * 2.4}   # 같은 장난감끼리 더 멀리
        cands = sorted([k for k in range(9) if k not in near] or list(range(9)), key=lambda k: (-want[k], rnd.random()))
        k = cands[0]; want[k] -= 1; items.append((k, p))
    return items, md

DISP = float(sys.argv[8]) if len(sys.argv) > 8 else 1225
PC_W, PC_H, M_W, M_H = int(1440 * T / DISP), int(900 * T / DISP), int(390 * T / (DISP * 0.8)), int(844 * T / (DISP * 0.8))
def score(items):
    def kinds(w, h):
        seen = {}
        for k, (x, y) in items:
            for dx in range(0, w + T, T):
                for dy in range(0, h + T, T):
                    if x + dx - T < w and y + dy - T < h and x + dx - T > -60 and y + dy - T > -60 or (x + dx < w and y + dy < h and dx == 0 and dy == 0):
                        seen[k] = seen.get(k, 0) + 1
        return len(seen), max(seen.values()) if seen else 0
    kp, dp = kinds(PC_W, PC_H); km, dm = kinds(M_W, M_H)
    return kp * 3 + km * 2 - dp * 2 - dm
best = None
for sd in range(SEED, SEED + 40):
    r = random.Random(sd); it, m = layout(r); sc = score(it)
    if best is None or sc > best[0]: best = (sc, sd, it, m)
sc, SEED, items, md = best; rnd = random.Random(SEED * 7 + 1)
print('picked seed', SEED, 'score', sc)
tile = Image.new('RGBA', (T, T), (0, 0, 0, 0))
for k, (x, y) in items:
    im = toys[k]
    if VMAX != 1 or VMIN != 1:
        f = rnd.uniform(VMIN, VMAX); im = im.resize((max(1, int(im.width * f)), max(1, int(im.height * f))), Image.LANCZOS)
    if rnd.random() < 0.5: im = im.transpose(Image.FLIP_LEFT_RIGHT)   # 좌우 뒤집기 — 같은 장난감도 방향이 달라 보이게
    im = im.rotate(rnd.uniform(-40, 40), resample=Image.BICUBIC, expand=True)
    if OP < 1:
        r, g, b, a = im.split(); im = Image.merge('RGBA', (r, g, b, a.point(lambda v: int(v * OP))))
    for dx in (-T, 0, T):
        for dy in (-T, 0, T):
            tile.alpha_composite(im, (int(x + dx - im.width / 2), int(y + dy - im.height / 2))) if -im.width < x + dx - im.width / 2 < T and -im.height < y + dy - im.height / 2 < T else None
# 바탕색 위에 미리 합쳐(투명 없이) 가볍게
bg = Image.new('RGBA', (T, T), (247, 248, 251, 255)); bg.alpha_composite(tile)
bg.convert('RGB').save(out, 'WEBP', quality=82, method=6)
import os; print(out, os.path.getsize(out), 'items', len(items), 'minDist', round(md))
