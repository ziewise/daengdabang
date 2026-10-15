"""탭바 3D 아이콘(투명 PNG) → 여백 다듬고 정사각 · 192px webp."""
import sys
from pathlib import Path
from PIL import Image
src, dst = Path(sys.argv[1]), Path(sys.argv[2])
jobs = {"메뉴홈.png": "tab-home.webp", "메뉴연구소.png": "tab-lab.webp", "메뉴쇼핑.png": "tab-shop.webp", "메뉴댕다방.png": "tab-dang.webp", "메뉴마이.png": "tab-my.webp"}
for s, o in jobs.items():
    im = Image.open(src / s).convert("RGBA")
    a = im.split()[3].point(lambda v: 255 if v > 12 else 0)
    box = a.getbbox()
    im = im.crop(box)
    side = int(max(im.size) * 1.06)
    sq = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    sq.paste(im, ((side - im.width) // 2, (side - im.height) // 2))
    sq = sq.resize((192, 192), Image.LANCZOS)
    sq.save(dst / o, "WEBP", quality=90, method=6)
    print(o, (dst / o).stat().st_size // 1024, "KB", Image.open(src / s).size)
