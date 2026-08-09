from __future__ import annotations

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
GOODS_DIR = ROOT / "public" / "images" / "goods"
UI_DIR = ROOT / "public" / "images" / "ui"
VIDEO_PATH = ROOT / "public" / "videos" / "goods-contest-hero.mp4"
CARD_FILES = sorted(path for path in GOODS_DIR.glob("goods-*.webp") if "goods-hero-" not in path.name)
HERO_BUDGETS = {
    "goods-hero-lifestyle.webp": ((960, 720), 180_000),
    "goods-hero-lineup.webp": ((1120, 630), 180_000),
}
UI_BUDGETS = {
    "pet-lens-128.webp": 20_000,
    "lang-globe-128.webp": 20_000,
}


def assert_image(path: Path, expected_size: tuple[int, int], max_bytes: int) -> int:
    if not path.is_file():
        raise SystemExit(f"missing image: {path.relative_to(ROOT)}")
    size = path.stat().st_size
    if size > max_bytes:
        raise SystemExit(f"image budget exceeded: {path.name} is {size:,}B (max {max_bytes:,}B)")
    with Image.open(path) as image:
        if image.size != expected_size:
            raise SystemExit(f"unexpected dimensions: {path.name} is {image.size}, expected {expected_size}")
        if image.format != "WEBP":
            raise SystemExit(f"unexpected format: {path.name} is {image.format}")
    return size


def main() -> None:
    if len(CARD_FILES) != 21:
        raise SystemExit(f"expected 21 goods cards, found {len(CARD_FILES)}")
    total = 0
    for path in CARD_FILES:
        total += assert_image(path, (720, 720), 90_000)
    for name, (dimensions, budget) in HERO_BUDGETS.items():
        total += assert_image(GOODS_DIR / name, dimensions, budget)
    if total > 1_300_000:
        raise SystemExit(f"goods image bundle is {total:,}B (max 1,300,000B)")
    for name, budget in UI_BUDGETS.items():
        path = UI_DIR / name
        if not path.is_file() or path.stat().st_size > budget:
            raise SystemExit(f"header icon budget failed: {name}")
        with Image.open(path) as image:
            if max(image.size) > 128 or image.format != "WEBP":
                raise SystemExit(f"header icon dimensions/format failed: {name} {image.size} {image.format}")
    if not VIDEO_PATH.is_file():
        raise SystemExit("missing goods contest hero video")
    video_size = VIDEO_PATH.stat().st_size
    if video_size > 4_000_000:
        raise SystemExit(f"hero video budget exceeded: {video_size:,}B (max 4,000,000B)")
    print(f"goods media budget OK: 23 images {total:,}B, video {video_size:,}B")


if __name__ == "__main__":
    main()
