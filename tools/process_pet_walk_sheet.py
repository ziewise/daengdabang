"""Build an anchored eight-frame pet-companion walk atlas.

The generated source is a 4x2 green-screen storyboard.  Frames are read in
row-major order and written as an 8x1 transparent WebP atlas.  Unlike the
legacy core-sheet processor, this tool aligns the upper-body anchor rather
than each full silhouette bbox, so an outstretched paw cannot make the dog
slide sideways from frame to frame.
"""

from __future__ import annotations

import argparse
import hashlib
from dataclasses import dataclass
from pathlib import Path
from typing import Sequence

from PIL import Image, ImageFilter

from process_pet_motion_sheet import (
    ProcessingError,
    alpha_bounds,
    remove_green_screen,
    suppress_green_spill,
)


SOURCE_COLUMNS = 4
SOURCE_ROWS = 2
FRAME_COUNT = SOURCE_COLUMNS * SOURCE_ROWS
CELL_SIZE = 256
OUTPUT_SIZE = (CELL_SIZE * FRAME_COUNT, CELL_SIZE)
BASELINE_Y = 242
BODY_ANCHOR_X = CELL_SIZE // 2
SAFE_MARGIN = 8


@dataclass(frozen=True)
class KeyedFrame:
    image: Image.Image
    bounds: tuple[int, int, int, int]
    body_center_x: float


def _body_center_x(image: Image.Image, bounds: tuple[int, int, int, int]) -> float:
    """Return an alpha-weighted torso/head anchor that ignores reaching paws."""

    left, top, right, bottom = bounds
    height = bottom - top
    body_bottom = min(bottom, top + round(height * 0.72))
    alpha = image.getchannel("A")
    weighted_x = 0
    weight = 0
    for y in range(top, body_bottom):
        for x in range(left, right):
            value = alpha.getpixel((x, y))
            if value < 48:
                continue
            weighted_x += x * value
            weight += value
    if not weight:
        return (left + right) / 2
    return weighted_x / weight


def trim_disconnected_alpha_noise(
    image: Image.Image,
    *,
    strong_threshold: int,
    alpha_cutoff: int,
) -> Image.Image:
    """Drop faint generated-screen haze while retaining fur antialiasing.

    Low-alpha pixels survive only when they sit within two pixels of the solid
    character matte.  This removes cell-shaped haze without hard-clipping the
    soft curls and whiskers around the actual silhouette.
    """

    rgba = image.convert("RGBA")
    alpha = rgba.getchannel("A")
    strong = alpha.point(lambda value: 255 if value >= strong_threshold else 0)
    near_character = strong.filter(ImageFilter.MaxFilter(5)).tobytes()
    cleaned = bytearray(rgba.tobytes())
    for index, nearby in enumerate(near_character):
        offset = index * 4
        pixel_alpha = cleaned[offset + 3]
        if pixel_alpha < alpha_cutoff or (pixel_alpha < strong_threshold and not nearby):
            cleaned[offset : offset + 4] = b"\x00\x00\x00\x00"
    return Image.frombytes("RGBA", rgba.size, bytes(cleaned))


def split_and_key(source: Image.Image, args: argparse.Namespace) -> list[KeyedFrame]:
    if source.width < 800 or source.height < 400:
        raise ProcessingError(
            f"Walk source is unexpectedly small: {source.width}x{source.height}"
        )

    x_edges = [round(index * source.width / SOURCE_COLUMNS) for index in range(SOURCE_COLUMNS + 1)]
    y_edges = [round(index * source.height / SOURCE_ROWS) for index in range(SOURCE_ROWS + 1)]
    frames: list[KeyedFrame] = []
    for row in range(SOURCE_ROWS):
        for column in range(SOURCE_COLUMNS):
            cell = source.crop(
                (
                    x_edges[column],
                    y_edges[row],
                    x_edges[column + 1],
                    y_edges[row + 1],
                )
            )
            keyed = remove_green_screen(
                cell,
                key_tolerance=args.key_tolerance,
                opaque_excess=args.opaque_excess,
                transparent_excess=args.transparent_excess,
                alpha_cutoff=args.alpha_cutoff,
                spill_allowance=args.spill_allowance,
            )
            bounds = alpha_bounds(keyed, args.bbox_threshold)
            if not bounds:
                raise ProcessingError(f"Walk frame {len(frames) + 1} is empty")
            frames.append(
                KeyedFrame(
                    image=keyed,
                    bounds=bounds,
                    body_center_x=_body_center_x(keyed, bounds),
                )
            )
    return frames


def build_atlas(source: Image.Image, args: argparse.Namespace) -> Image.Image:
    frames = split_and_key(source.convert("RGBA"), args)
    heights = [frame.bounds[3] - frame.bounds[1] for frame in frames]
    # A single scale for the full cycle preserves body volume.  Constrain each
    # side independently around the torso anchor so a reaching paw cannot be
    # clipped even when the full silhouette is deliberately asymmetric.
    scale_limits = [(BASELINE_Y - SAFE_MARGIN) / max(heights)]
    for frame in frames:
        left, _, right, _ = frame.bounds
        left_extent = max(1.0, frame.body_center_x - left)
        right_extent = max(1.0, right - frame.body_center_x)
        scale_limits.extend(
            (
                (BODY_ANCHOR_X - 1) / left_extent,
                (CELL_SIZE - BODY_ANCHOR_X - 1) / right_extent,
            )
        )
    scale = min(scale_limits)

    atlas = Image.new("RGBA", OUTPUT_SIZE, (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        left, top, right, bottom = frame.bounds
        crop = frame.image.crop((left, top, right, bottom))
        resized = crop.resize(
            (
                max(1, round(crop.width * scale)),
                max(1, round(crop.height * scale)),
            ),
            Image.Resampling.LANCZOS,
        )
        resized = suppress_green_spill(
            resized,
            spill_allowance=args.spill_allowance,
            alpha_cutoff=args.alpha_cutoff,
        )
        resized = trim_disconnected_alpha_noise(
            resized,
            strong_threshold=args.bbox_threshold,
            alpha_cutoff=args.alpha_cutoff,
        )
        anchor_in_crop = (frame.body_center_x - left) * scale
        paste_x = round(BODY_ANCHOR_X - anchor_in_crop)
        paste_y = BASELINE_Y - resized.height
        if (
            paste_x < 0
            or paste_y < 0
            or paste_x + resized.width > CELL_SIZE
            or paste_y + resized.height > CELL_SIZE
        ):
            raise ProcessingError(
                f"Walk frame {index + 1} exceeds its cell after anchored placement"
            )
        atlas.alpha_composite(resized, (index * CELL_SIZE + paste_x, paste_y))

    return atlas


def validate(atlas: Image.Image, args: argparse.Namespace) -> None:
    if atlas.size != OUTPUT_SIZE:
        raise ProcessingError(f"Output is {atlas.size}, expected {OUTPUT_SIZE}")
    body_centers: list[float] = []
    bottoms: list[int] = []
    for index in range(FRAME_COUNT):
        cell = atlas.crop((index * CELL_SIZE, 0, (index + 1) * CELL_SIZE, CELL_SIZE))
        bounds = alpha_bounds(cell, args.bbox_threshold)
        if not bounds:
            raise ProcessingError(f"Output walk frame {index + 1} is empty")
        left, top, right, bottom = bounds
        if left < 1 or top < SAFE_MARGIN or right > CELL_SIZE - 1 or bottom > CELL_SIZE - SAFE_MARGIN:
            raise ProcessingError(
                f"Output walk frame {index + 1} bbox {bounds} violates the safety margin"
            )
        body_centers.append(_body_center_x(cell, bounds))
        bottoms.append(bottom)

    center_span = max(body_centers) - min(body_centers)
    if center_span > 4:
        raise ProcessingError(f"Upper-body anchor span is {center_span:.2f}px; expected <= 4px")
    if max(abs(bottom - BASELINE_Y) for bottom in bottoms) > 1:
        raise ProcessingError(f"Ground baseline drift: {bottoms}")


def significant_component_areas(image: Image.Image, threshold: int) -> list[int]:
    """Return connected alpha-component areas, largest first."""

    alpha = image.getchannel("A")
    width, height = image.size
    visible = bytearray(
        1 if alpha.getpixel((x, y)) >= threshold else 0
        for y in range(height)
        for x in range(width)
    )
    areas: list[int] = []
    for start in range(width * height):
        if not visible[start]:
            continue
        visible[start] = 0
        stack = [start]
        area = 0
        while stack:
            index = stack.pop()
            area += 1
            x = index % width
            y = index // width
            if x > 0 and visible[index - 1]:
                visible[index - 1] = 0
                stack.append(index - 1)
            if x + 1 < width and visible[index + 1]:
                visible[index + 1] = 0
                stack.append(index + 1)
            if y > 0 and visible[index - width]:
                visible[index - width] = 0
                stack.append(index - width)
            if y + 1 < height and visible[index + width]:
                visible[index + width] = 0
                stack.append(index + width)
        if area >= 4:
            areas.append(area)
    return sorted(areas, reverse=True)


def validate_saved_output(path: Path, args: argparse.Namespace) -> None:
    if path.stat().st_size > args.max_bytes:
        raise ProcessingError(
            f"Walk atlas is {path.stat().st_size} bytes; expected <= {args.max_bytes}"
        )
    with Image.open(path) as stored:
        stored.load()
        if stored.format != "WEBP":
            raise ProcessingError(f"Output format is {stored.format!r}, expected WEBP")
        decoded = stored.convert("RGBA")
    validate(decoded, args)
    hashes: list[bytes] = []
    for index in range(FRAME_COUNT):
        cell = decoded.crop((index * CELL_SIZE, 0, (index + 1) * CELL_SIZE, CELL_SIZE))
        hashes.append(hashlib.sha256(cell.tobytes()).digest())
        components = significant_component_areas(cell, args.bbox_threshold)
        if len(components) > 1 and components[1] > args.max_fragment_area:
            raise ProcessingError(
                f"Walk frame {index + 1} has a detached alpha component "
                f"of {components[1]}px"
            )
    if len(set(hashes)) != FRAME_COUNT:
        raise ProcessingError("Walk atlas contains duplicate decoded frames")


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Process a 4x2 green walk storyboard into an 8x1 WebP atlas.")
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--lossless", action="store_true")
    parser.add_argument("--quality", type=int, default=96)
    parser.add_argument("--key-tolerance", type=int, default=18)
    parser.add_argument("--opaque-excess", type=int, default=18)
    parser.add_argument("--transparent-excess", type=int, default=210)
    parser.add_argument("--alpha-cutoff", type=int, default=8)
    parser.add_argument("--bbox-threshold", type=int, default=48)
    parser.add_argument("--spill-allowance", type=int, default=3)
    parser.add_argument("--max-bytes", type=int, default=300_000)
    parser.add_argument("--max-fragment-area", type=int, default=18)
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv)
    if not args.input.is_file():
        raise ProcessingError(f"Source image not found: {args.input}")
    with Image.open(args.input) as source:
        source.load()
        atlas = build_atlas(source, args)
    validate(atlas, args)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    temporary = args.output.with_name(f"{args.output.stem}.tmp{args.output.suffix}")
    atlas.save(
        temporary,
        format="WEBP",
        lossless=args.lossless,
        quality=100 if args.lossless else args.quality,
        method=6,
        exact=True,
    )
    validate_saved_output(temporary, args)
    temporary.replace(args.output)
    print(
        f"output={args.output} size={args.output.stat().st_size} bytes "
        f"grid=8x1 baseline={BASELINE_Y}px"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
