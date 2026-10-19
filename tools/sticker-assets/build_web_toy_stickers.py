# 웹 배경 "강아지 장난감 벽지" 스티커 만들기(2026-10-18) — 장난감 그림 9장(originals/web-toys) → 작은 스티커 18장
# - 장난감마다 방향이 다른 2장(a: 기울기, b: 좌우 뒤집기 + 다른 기울기) — 같은 장난감도 매번 다른 방향으로 보이게
# - 농도 42%(2026-10-19 사용자 "좀더 연하게" · 처음 60%)를 그림에 미리 넣음 — 화면에서 투명도 처리를 따로 하지 않아도 되게(가벼움)
# - 크기는 화면 최대 약 110px × 2배 선명도 = 긴 변 220px 안. 한 장 수 KB · 18장 합쳐도 폰 메모리 2MB 안팎
#   (예전 무늬 한 장 3000px 은 메모리 약 36MB)
# 사용: python tools/sticker-assets/build_web_toy_stickers.py
import math, os, random
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "originals", "web-toys", "toy-{}.webp")
OUT = os.path.join(HERE, "..", "..", "public", "images", "ui", "toys")
MAX = 220          # 긴 변(px)
OPACITY = 0.42     # 농도 42%(처음 60% → 2026-10-19 더 연하게)
os.makedirs(OUT, exist_ok=True)
rnd = random.Random(2026_10_18)
for i in range(1, 10):
    im = Image.open(SRC.format(i)).convert("RGBA")
    r, g, b, a = im.split()
    a = a.point(lambda v: 0 if v < 30 else v)          # 둘레의 옅은 번짐 제거
    im = Image.merge("RGBA", (r, g, b, a)).crop(a.getbbox())
    # 눈에 보이는 면적을 같게 맞춤(길쭉한 밧줄 · 덤벨이 작아 보이지 않게)
    area = sum(1 for v in im.split()[3].getdata() if v > 60)
    scale = min(math.sqrt(170 * 170 * 0.55 / area), 170 * 1.35 / max(im.size))
    im = im.resize((max(1, int(im.width * scale)), max(1, int(im.height * scale))), Image.LANCZOS)
    for variant in ("a", "b"):
        v = im.transpose(Image.FLIP_LEFT_RIGHT) if variant == "b" else im
        angle = rnd.uniform(8, 38) * (1 if rnd.random() < 0.5 else -1)
        v = v.rotate(angle, resample=Image.BICUBIC, expand=True)
        v = v.crop(v.split()[3].getbbox())
        if max(v.size) > MAX:
            s = MAX / max(v.size); v = v.resize((int(v.width * s), int(v.height * s)), Image.LANCZOS)
        r, g, b, a = v.split()
        v = Image.merge("RGBA", (r, g, b, a.point(lambda x: int(x * OPACITY))))
        path = os.path.join(OUT, f"toy-{i}{variant}.webp")
        v.save(path, "WEBP", quality=76, method=6)
        print(os.path.relpath(path), v.size, os.path.getsize(path))
