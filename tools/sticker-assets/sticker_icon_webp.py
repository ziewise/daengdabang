"""혜택 아이콘 4장(투명 PNG) → 작은 떨어진 점만 지우고(반짝이 같은 장식은 유지) · 여백 정리 · 384px webp."""
import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

src_dir = Path(sys.argv[1])
out_dir = Path(sys.argv[2])
out_dir.mkdir(parents=True, exist_ok=True)
jobs = {"혜택멤버십.png": "benefit-membership.webp", "혜택브랜드.png": "benefit-brand.webp", "혜택굿즈.png": "benefit-goods.webp", "혜택돌봄.png": "benefit-care.webp"}

if len(sys.argv) > 4:
    jobs = {sys.argv[3]: sys.argv[4]}

for src, out in jobs.items():
    im = Image.open(src_dir / src).convert("RGBA")
    arr = np.array(im)
    alpha = arr[:, :, 3]
    S = 4
    h, w = alpha.shape
    small = alpha[: h - h % S, : w - w % S].reshape(h // S, S, w // S, S).max(axis=(1, 3)) > 24
    seen = np.zeros_like(small, dtype=bool)
    comps = []
    for y0 in range(small.shape[0]):
        for x0 in range(small.shape[1]):
            if not small[y0, x0] or seen[y0, x0]:
                continue
            comp, q = [], deque([(y0, x0)])
            seen[y0, x0] = True
            while q:
                y, x = q.popleft()
                comp.append((y, x))
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (1, -1), (-1, 1), (-1, -1)):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < small.shape[0] and 0 <= nx < small.shape[1] and small[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        q.append((ny, nx))
            comps.append(comp)
    biggest = max(len(c) for c in comps)
    keep_small = np.zeros_like(small)
    kept = 0
    for c in comps:
        # 큰 덩어리의 0.4% 이상이면 장식(반짝이 등)으로 보고 남김, 그보다 작은 점은 지움
        if len(c) >= biggest * 0.004:
            kept += 1
            for y, x in c:
                keep_small[y, x] = True
    keep = np.kron(keep_small, np.ones((S, S), dtype=bool))
    pad = np.zeros_like(alpha, dtype=bool)
    pad[: keep.shape[0], : keep.shape[1]] = keep
    grown = pad.copy()
    for dy in (-S, 0, S):
        for dx in (-S, 0, S):
            grown |= np.roll(np.roll(pad, dy, axis=0), dx, axis=1)
    arr[:, :, 3] = np.where(grown, alpha, 0)
    clean = Image.fromarray(arr)
    bbox = clean.getbbox()
    side = max(bbox[2] - bbox[0], bbox[3] - bbox[1])
    m = int(side * 0.03)
    cx, cy = (bbox[0] + bbox[2]) // 2, (bbox[1] + bbox[3]) // 2
    half = side // 2 + m
    # 정사각형으로(가운데 맞춤) 잘라 크기 통일
    sq = Image.new("RGBA", (half * 2, half * 2), (0, 0, 0, 0))
    sq.paste(clean.crop((cx - half, cy - half, cx + half, cy + half)), (0, 0))
    sq = sq.resize((384, 384), Image.LANCZOS)
    sq.save(out_dir / out, "WEBP", quality=90, method=6)
    print(out, "parts kept", kept, "of", len(comps), (out_dir / out).stat().st_size // 1024, "KB")
