"""Split a 4x4 transparent pet atlas into lightweight per-rig WebP assets."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


RIG_IDS = [f"r{index:02d}" for index in range(1, 15)]


def split_atlas(source: Path, output_dir: Path, pose: str, size: int, quality: int) -> None:
    atlas = Image.open(source).convert("RGBA")
    width, height = atlas.size
    if width < 800 or height < 800:
        raise ValueError(f"Atlas is unexpectedly small: {width}x{height}")

    output_dir.mkdir(parents=True, exist_ok=True)
    for index, rig_id in enumerate(RIG_IDS):
        row, column = divmod(index, 4)
        left = round(column * width / 4)
        right = round((column + 1) * width / 4)
        top = round(row * height / 4)
        bottom = round((row + 1) * height / 4)
        cell = atlas.crop((left, top, right, bottom))
        alpha = cell.getchannel("A")
        bounds = alpha.getbbox()
        if not bounds:
            raise ValueError(f"No visible character found in {rig_id} cell")

        pad = max(7, round(max(cell.size) * 0.025))
        crop_left = max(0, bounds[0] - pad)
        crop_top = max(0, bounds[1] - pad)
        crop_right = min(cell.width, bounds[2] + pad)
        crop_bottom = min(cell.height, bounds[3] + pad)
        character = cell.crop((crop_left, crop_top, crop_right, crop_bottom))

        canvas_side = max(character.width, character.height) + pad * 2
        canvas = Image.new("RGBA", (canvas_side, canvas_side), (0, 0, 0, 0))
        paste_x = (canvas_side - character.width) // 2
        paste_y = canvas_side - character.height - pad
        canvas.alpha_composite(character, (paste_x, paste_y))
        canvas = canvas.resize((size, size), Image.Resampling.LANCZOS)

        output = output_dir / f"{rig_id}-{pose}.webp"
        canvas.save(output, "WEBP", quality=quality, method=6, exact=True)
        print(f"{output.name}\t{output.stat().st_size}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--out-dir", type=Path, required=True)
    parser.add_argument("--pose", choices=("idle", "recommend"), required=True)
    parser.add_argument("--size", type=int, default=384)
    parser.add_argument("--quality", type=int, default=84)
    args = parser.parse_args()
    split_atlas(args.input, args.out_dir, args.pose, args.size, args.quality)


if __name__ == "__main__":
    main()
