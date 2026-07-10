"""Build and validate 4x4 pet-companion motion sheets.

The generated source is a four-column by four-row green-screen atlas:

    idle
    walk
    run
    sniff

This processor deliberately keeps all sixteen frames.  It removes the green
screen one cell at a time, normalizes character height within each row, and
places the result into a 1024x1024 WebP made of sixteen 256x256 cells.  The
run row keeps its source vertical motion; the other rows share a y=232 paw
baseline.
"""

from __future__ import annotations

import argparse
import hashlib
from dataclasses import dataclass
from pathlib import Path
import re
from statistics import median
import sys
from typing import Iterable, Sequence

from PIL import Image, ImageFilter


GRID_SIZE = 4
CELL_SIZE = 256
OUTPUT_SIZE = GRID_SIZE * CELL_SIZE
ROW_NAMES = ("idle", "walk", "run", "sniff")
RUN_ROW = 2
BASELINE_Y = 232
SAFE_MARGIN = 12
MAX_HEIGHT_DEVIATION = 0.08
MIN_WEBP_QUALITY = 92

REPO_ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = REPO_ROOT / "artifacts" / "pet-companion" / "cute-v2"
OUTPUT_DIR = REPO_ROOT / "public" / "images" / "pet-companion" / "cute-v3-motion"
SOURCE_SUFFIX = "-motion-sheet-source-v1.png"


class ProcessingError(RuntimeError):
    """Raised when processing or validation cannot produce a safe atlas."""


@dataclass
class SourceFrame:
    row: int
    column: int
    image: Image.Image
    bounds: tuple[int, int, int, int]
    cell_width: int
    cell_height: int

    @property
    def width(self) -> int:
        return self.bounds[2] - self.bounds[0]

    @property
    def height(self) -> int:
        return self.bounds[3] - self.bounds[1]

    @property
    def center_y_normalized(self) -> float:
        return ((self.bounds[1] + self.bounds[3]) / 2) / self.cell_height


@dataclass(frozen=True)
class OutputFrameMetrics:
    row: int
    column: int
    bounds: tuple[int, int, int, int]

    @property
    def width(self) -> int:
        return self.bounds[2] - self.bounds[0]

    @property
    def height(self) -> int:
        return self.bounds[3] - self.bounds[1]

    @property
    def center_x(self) -> float:
        return (self.bounds[0] + self.bounds[2]) / 2

    @property
    def center_y(self) -> float:
        return (self.bounds[1] + self.bounds[3]) / 2


@dataclass(frozen=True)
class ValidationReport:
    pixel_size: tuple[int, int]
    cell_size: tuple[int, int]
    file_bytes: int
    max_corner_alpha: int
    max_green_fringe: int
    frames: tuple[OutputFrameMetrics, ...]


def _pixels(image: Image.Image) -> Iterable[tuple[int, int, int, int]]:
    """Return pixels without Pillow 12's deprecated getdata warning."""

    if hasattr(image, "get_flattened_data"):
        return image.get_flattened_data()
    return image.getdata()


def alpha_bounds(image: Image.Image, threshold: int) -> tuple[int, int, int, int] | None:
    alpha = image.getchannel("A")
    mask = alpha.point(lambda value: 255 if value >= threshold else 0)
    return mask.getbbox()


def remove_green_screen(
    image: Image.Image,
    *,
    key_tolerance: int,
    opaque_excess: int,
    transparent_excess: int,
    alpha_cutoff: int,
    spill_allowance: int,
) -> Image.Image:
    """Turn a #00ff00-style screen into alpha and neutralize edge spill.

    The source is generated rather than photographed, so green dominance is a
    more stable key than Euclidean RGB distance.  Near-key pixels are forced
    transparent.  Between the opaque and transparent green-excess limits we
    derive a soft matte, multiply it by any source alpha, then desaturate only
    the one-pixel alpha boundary.  Fully opaque interior colors are preserved.
    """

    rgba = image.convert("RGBA")
    source = rgba.tobytes()
    keyed = bytearray(len(source))
    denominator = transparent_excess - opaque_excess

    for offset in range(0, len(source), 4):
        red, green, blue, source_alpha = source[offset : offset + 4]
        key_distance = max(red, 255 - green, blue)
        green_excess = max(0, green - max(red, blue))

        if key_distance <= key_tolerance or green_excess >= transparent_excess:
            matte = 0
        elif green_excess <= opaque_excess:
            matte = 255
        else:
            matte = round(
                255
                * (transparent_excess - green_excess)
                / denominator
            )

        alpha = (source_alpha * matte + 127) // 255
        if alpha < alpha_cutoff:
            red = green = blue = alpha = 0

        keyed[offset : offset + 4] = bytes((red, green, blue, alpha))

    result = Image.frombytes("RGBA", rgba.size, bytes(keyed))
    return suppress_green_spill(
        result,
        spill_allowance=spill_allowance,
        alpha_cutoff=alpha_cutoff,
    )


def suppress_green_spill(
    image: Image.Image,
    *,
    spill_allowance: int,
    alpha_cutoff: int,
) -> Image.Image:
    """Neutralize green in the antialiased boundary of an RGBA image."""

    result = image.convert("RGBA")
    # Include the first opaque pixel adjacent to transparency in spill cleanup.
    alpha = result.getchannel("A")
    eroded_alpha = alpha.filter(ImageFilter.MinFilter(3)).tobytes()
    cleaned = bytearray(result.tobytes())
    for index, eroded in enumerate(eroded_alpha):
        offset = index * 4
        red, green, blue, pixel_alpha = cleaned[offset : offset + 4]
        if pixel_alpha < alpha_cutoff:
            cleaned[offset : offset + 4] = b"\x00\x00\x00\x00"
            continue
        if eroded < 255:
            maximum_non_green = max(red, blue)
            green = min(green, maximum_non_green + spill_allowance)
            cleaned[offset + 1] = green

    return Image.frombytes("RGBA", result.size, bytes(cleaned))


def split_source(
    atlas: Image.Image,
    *,
    bbox_threshold: int,
    key_tolerance: int,
    opaque_excess: int,
    transparent_excess: int,
    alpha_cutoff: int,
    spill_allowance: int,
) -> list[SourceFrame]:
    width, height = atlas.size
    if width < 800 or height < 800:
        raise ProcessingError(f"Source is unexpectedly small: {width}x{height}")

    # Do not require divisibility.  These rounded boundaries preserve every
    # source pixel exactly once for dimensions such as 1254x1254.
    x_edges = [round(index * width / GRID_SIZE) for index in range(GRID_SIZE + 1)]
    y_edges = [round(index * height / GRID_SIZE) for index in range(GRID_SIZE + 1)]
    if x_edges[0] != 0 or x_edges[-1] != width or y_edges[0] != 0 or y_edges[-1] != height:
        raise ProcessingError("Rounded grid boundaries do not cover the source")

    frames: list[SourceFrame] = []
    for row in range(GRID_SIZE):
        for column in range(GRID_SIZE):
            source_cell = atlas.crop(
                (
                    x_edges[column],
                    y_edges[row],
                    x_edges[column + 1],
                    y_edges[row + 1],
                )
            )
            keyed = remove_green_screen(
                source_cell,
                key_tolerance=key_tolerance,
                opaque_excess=opaque_excess,
                transparent_excess=transparent_excess,
                alpha_cutoff=alpha_cutoff,
                spill_allowance=spill_allowance,
            )
            bounds = alpha_bounds(keyed, bbox_threshold)
            if not bounds:
                raise ProcessingError(
                    f"No visible character in {ROW_NAMES[row]} frame {column + 1}"
                )
            frames.append(
                SourceFrame(
                    row=row,
                    column=column,
                    image=keyed,
                    bounds=bounds,
                    cell_width=source_cell.width,
                    cell_height=source_cell.height,
                )
            )
    return frames


def _row_target_sizes(frames: Sequence[SourceFrame]) -> list[tuple[int, int]]:
    natural_heights = [
        frame.height * CELL_SIZE / frame.cell_height
        for frame in frames
    ]
    row_median = median(natural_heights)
    minimum_height = row_median * (1 - MAX_HEIGHT_DEVIATION)
    maximum_height = row_median * (1 + MAX_HEIGHT_DEVIATION)
    target_heights = [
        min(max(height, minimum_height), maximum_height)
        for height in natural_heights
    ]

    sizes = [
        (
            max(1, round(frame.width * target_height / frame.height)),
            max(1, round(target_height)),
        )
        for frame, target_height in zip(frames, target_heights)
    ]
    available_width = CELL_SIZE - SAFE_MARGIN * 2
    # Fixed-baseline rows have 220px between the top safety margin and y=232.
    # Using the same cap for every row also leaves extra room for run offsets.
    available_height = BASELINE_Y - SAFE_MARGIN
    largest_width = max(width for width, _ in sizes)
    largest_height = max(height for _, height in sizes)
    fit_scale = min(
        1.0,
        available_width / largest_width,
        available_height / largest_height,
    )
    if fit_scale < 1:
        sizes = [
            (max(1, round(width * fit_scale)), max(1, round(height * fit_scale)))
            for width, height in sizes
        ]
    return sizes


def _fit_run_placements(
    frames: Sequence[SourceFrame],
    sizes: list[tuple[int, int]],
) -> tuple[list[tuple[int, int]], list[int]]:
    source_centers = [frame.center_y_normalized for frame in frames]
    median_source_center = median(source_centers)
    median_height = median(height for _, height in sizes)
    reference_center = BASELINE_Y - median_height / 2

    offsets = [
        (source_center - median_source_center) * CELL_SIZE
        for source_center in source_centers
    ]

    def positions(
        current_sizes: Sequence[tuple[int, int]],
        current_offsets: Sequence[float],
    ) -> list[int]:
        return [
            round(reference_center + offset - height / 2)
            for (_, height), offset in zip(current_sizes, current_offsets)
        ]

    paste_y = positions(sizes, offsets)
    minimum_top = min(paste_y)
    maximum_bottom = max(
        top + height for top, (_, height) in zip(paste_y, sizes)
    )
    available = CELL_SIZE - SAFE_MARGIN * 2
    envelope = maximum_bottom - minimum_top
    if envelope > available:
        scale = available / envelope
        sizes = [
            (max(1, round(width * scale)), max(1, round(height * scale)))
            for width, height in sizes
        ]
        offsets = [offset * scale for offset in offsets]
        median_height = median(height for _, height in sizes)
        reference_center = BASELINE_Y - median_height / 2
        paste_y = positions(sizes, offsets)
        minimum_top = min(paste_y)
        maximum_bottom = max(
            top + height for top, (_, height) in zip(paste_y, sizes)
        )

    lower_shift = SAFE_MARGIN - minimum_top
    upper_shift = CELL_SIZE - SAFE_MARGIN - maximum_bottom
    if lower_shift > upper_shift:
        raise ProcessingError("Run-row motion envelope cannot fit the 12px safety area")
    if lower_shift > 0:
        common_shift = lower_shift
    elif upper_shift < 0:
        common_shift = upper_shift
    else:
        common_shift = 0
    paste_y = [top + common_shift for top in paste_y]
    return sizes, paste_y


def resize_premultiplied(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    """Resize RGBA without introducing a dark transparent-edge halo."""

    return (
        image.convert("RGBa")
        .resize(size, Image.Resampling.LANCZOS)
        .convert("RGBA")
    )


def build_motion_sheet(source: Image.Image, args: argparse.Namespace) -> Image.Image:
    frames = split_source(
        source.convert("RGBA"),
        bbox_threshold=args.bbox_threshold,
        key_tolerance=args.key_tolerance,
        opaque_excess=args.opaque_excess,
        transparent_excess=args.transparent_excess,
        alpha_cutoff=args.alpha_cutoff,
        spill_allowance=args.spill_allowance,
    )
    output = Image.new("RGBA", (OUTPUT_SIZE, OUTPUT_SIZE), (0, 0, 0, 0))

    for row in range(GRID_SIZE):
        row_frames = [frame for frame in frames if frame.row == row]
        sizes = _row_target_sizes(row_frames)
        if row == RUN_ROW:
            sizes, paste_y_values = _fit_run_placements(row_frames, sizes)
        else:
            paste_y_values = [BASELINE_Y - height for _, height in sizes]

        for frame, size, paste_y in zip(row_frames, sizes, paste_y_values):
            crop = frame.image.crop(frame.bounds)
            resized = resize_premultiplied(crop, size)
            # Lanczos can create tiny RGB values outside the source matte; run
            # the same spill cleanup once more on the final-sized frame.
            resized = suppress_green_spill(
                resized,
                spill_allowance=args.spill_allowance,
                alpha_cutoff=args.alpha_cutoff,
            )
            paste_x = round((CELL_SIZE - size[0]) / 2)
            if (
                paste_x < SAFE_MARGIN
                or paste_x + size[0] > CELL_SIZE - SAFE_MARGIN
                or paste_y < SAFE_MARGIN
                or paste_y + size[1] > CELL_SIZE - SAFE_MARGIN
            ):
                raise ProcessingError(
                    f"{ROW_NAMES[row]} frame {frame.column + 1} violates the "
                    f"{SAFE_MARGIN}px safety margin"
                )
            output.alpha_composite(
                resized,
                (frame.column * CELL_SIZE + paste_x, row * CELL_SIZE + paste_y),
            )
    return output


def _cell_corner_max_alpha(alpha: Image.Image, sample_size: int) -> int:
    maximum = 0
    for row in range(GRID_SIZE):
        for column in range(GRID_SIZE):
            left = column * CELL_SIZE
            top = row * CELL_SIZE
            right = left + CELL_SIZE
            bottom = top + CELL_SIZE
            boxes = (
                (left, top, left + sample_size, top + sample_size),
                (right - sample_size, top, right, top + sample_size),
                (left, bottom - sample_size, left + sample_size, bottom),
                (right - sample_size, bottom - sample_size, right, bottom),
            )
            for box in boxes:
                extrema = alpha.crop(box).getextrema()
                maximum = max(maximum, extrema[1])
    return maximum


def _max_edge_green_fringe(image: Image.Image) -> int:
    alpha = image.getchannel("A")
    eroded = alpha.filter(ImageFilter.MinFilter(3))
    maximum = 0
    for pixel, eroded_alpha in zip(_pixels(image), eroded.get_flattened_data()):
        red, green, blue, pixel_alpha = pixel
        if pixel_alpha > 0 and eroded_alpha < 255:
            maximum = max(maximum, green - max(red, blue))
    return max(0, maximum)


def validate_output(path: Path, args: argparse.Namespace) -> ValidationReport:
    file_bytes = path.stat().st_size if path.exists() else 0
    if file_bytes <= 0:
        raise ProcessingError("Output WebP is empty")

    with Image.open(path) as stored:
        stored.load()
        if stored.format != "WEBP":
            raise ProcessingError(f"Output format is {stored.format!r}, expected WEBP")
        image = stored.convert("RGBA")

    if image.size != (OUTPUT_SIZE, OUTPUT_SIZE):
        raise ProcessingError(
            f"Output is {image.width}x{image.height}; expected {OUTPUT_SIZE}x{OUTPUT_SIZE}"
        )

    max_corner_alpha = _cell_corner_max_alpha(image.getchannel("A"), args.corner_sample)
    if max_corner_alpha > args.max_corner_alpha:
        raise ProcessingError(
            f"Cell corners are not transparent: max alpha {max_corner_alpha} "
            f"> {args.max_corner_alpha}"
        )

    max_green_fringe = _max_edge_green_fringe(image)
    if max_green_fringe > args.max_green_fringe:
        raise ProcessingError(
            f"Green edge fringe {max_green_fringe} exceeds {args.max_green_fringe}"
        )

    metrics: list[OutputFrameMetrics] = []
    for row in range(GRID_SIZE):
        row_metrics: list[OutputFrameMetrics] = []
        row_hashes: list[bytes] = []
        for column in range(GRID_SIZE):
            cell = image.crop(
                (
                    column * CELL_SIZE,
                    row * CELL_SIZE,
                    (column + 1) * CELL_SIZE,
                    (row + 1) * CELL_SIZE,
                )
            )
            row_hashes.append(hashlib.sha256(cell.tobytes()).digest())
            bounds = alpha_bounds(cell, args.bbox_threshold)
            if not bounds:
                raise ProcessingError(
                    f"Output {ROW_NAMES[row]} frame {column + 1} is empty"
                )
            frame = OutputFrameMetrics(row=row, column=column, bounds=bounds)
            left, top, right, bottom = bounds
            if (
                left < SAFE_MARGIN
                or top < SAFE_MARGIN
                or right > CELL_SIZE - SAFE_MARGIN
                or bottom > CELL_SIZE - SAFE_MARGIN
            ):
                raise ProcessingError(
                    f"Output {ROW_NAMES[row]} frame {column + 1} bbox {bounds} "
                    f"violates the {SAFE_MARGIN}px safety margin"
                )
            row_metrics.append(frame)
            metrics.append(frame)

        if len(set(row_hashes)) != GRID_SIZE:
            raise ProcessingError(
                f"{ROW_NAMES[row]} contains duplicate output frames"
            )

        center_x_deviation = max(
            abs(frame.center_x - CELL_SIZE / 2) for frame in row_metrics
        )
        if center_x_deviation > 1:
            raise ProcessingError(
                f"{ROW_NAMES[row]} horizontal center deviation is "
                f"{center_x_deviation:.2f}px"
            )

        median_height = median(frame.height for frame in row_metrics)
        height_deviation = max(
            abs(frame.height / median_height - 1) for frame in row_metrics
        )
        # One resized pixel can push a small frame fractionally beyond 8%.
        height_tolerance = MAX_HEIGHT_DEVIATION + 1 / median_height
        if height_deviation > height_tolerance:
            raise ProcessingError(
                f"{ROW_NAMES[row]} height deviation is {height_deviation:.2%}; "
                f"expected <= {MAX_HEIGHT_DEVIATION:.0%} (+1px rounding)"
            )

        if row != RUN_ROW:
            baseline_deviation = max(
                abs(frame.bounds[3] - BASELINE_Y) for frame in row_metrics
            )
            if baseline_deviation > 2:
                raise ProcessingError(
                    f"{ROW_NAMES[row]} baseline deviation is {baseline_deviation}px"
                )

    return ValidationReport(
        pixel_size=image.size,
        cell_size=(CELL_SIZE, CELL_SIZE),
        file_bytes=file_bytes,
        max_corner_alpha=max_corner_alpha,
        max_green_fringe=max_green_fringe,
        frames=tuple(metrics),
    )


def print_report(
    report: ValidationReport,
    rig_id: str,
    output: Path,
    args: argparse.Namespace,
) -> None:
    print(f"rig={rig_id} output={output}")
    print(f"pixel_size={report.pixel_size[0]}x{report.pixel_size[1]}")
    print(f"cell_size={report.cell_size[0]}x{report.cell_size[1]} grid=4x4")
    print(f"file_bytes={report.file_bytes}")
    print(f"max_corner_alpha={report.max_corner_alpha}")
    print(
        f"max_green_fringe={report.max_green_fringe} "
        f"limit={args.max_green_fringe}"
    )
    for row, name in enumerate(ROW_NAMES):
        frames = [frame for frame in report.frames if frame.row == row]
        center_x_deviation = max(abs(frame.center_x - CELL_SIZE / 2) for frame in frames)
        center_y_values = [frame.center_y for frame in frames]
        heights = [frame.height for frame in frames]
        widths = [frame.width for frame in frames]
        median_height = median(heights)
        height_deviation = max(abs(height / median_height - 1) for height in heights)
        bottoms = [frame.bounds[3] for frame in frames]
        margins = [
            min(
                frame.bounds[0],
                frame.bounds[1],
                CELL_SIZE - frame.bounds[2],
                CELL_SIZE - frame.bounds[3],
            )
            for frame in frames
        ]
        print(
            f"row={name} "
            f"bbox_sizes={','.join(f'{width}x{height}' for width, height in zip(widths, heights))} "
            f"center_x_dev={center_x_deviation:.2f}px "
            f"center_y_span={max(center_y_values) - min(center_y_values):.2f}px "
            f"height_dev={height_deviation:.2%} "
            f"bottoms={','.join(map(str, bottoms))} "
            f"min_margin={min(margins)}px"
        )


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Process 4x4 green-screen pet motion sheets into validated WebP files."
    )
    selection = parser.add_mutually_exclusive_group()
    selection.add_argument(
        "--rig",
        help="Process one rig such as r03 (defaults to r03 when omitted).",
    )
    selection.add_argument(
        "--all",
        action="store_true",
        help="Process every r?? motion-sheet source currently present.",
    )
    parser.add_argument(
        "--input",
        type=Path,
        help="Override the source for single-rig mode.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        help="Override the destination for single-rig mode.",
    )
    encoding = parser.add_mutually_exclusive_group()
    encoding.add_argument(
        "--lossless",
        dest="lossless",
        action="store_true",
        default=False,
        help="Write lossless WebP instead of the production lossy default.",
    )
    encoding.add_argument(
        "--lossy",
        dest="lossless",
        action="store_false",
        help="Write high-quality lossy WebP (default); --quality must be at least 92.",
    )
    parser.add_argument("--quality", type=int, default=96)
    parser.add_argument("--key-tolerance", type=int, default=18)
    parser.add_argument("--opaque-excess", type=int, default=18)
    parser.add_argument("--transparent-excess", type=int, default=210)
    parser.add_argument("--alpha-cutoff", type=int, default=8)
    # Generated green fields contain low-alpha compression/noise after keying.
    # 48 keeps asymmetric fringe out of alignment metrics while retaining the
    # visible antialiased fur in the composited frame itself.
    parser.add_argument("--bbox-threshold", type=int, default=48)
    parser.add_argument("--spill-allowance", type=int, default=3)
    parser.add_argument("--corner-sample", type=int, default=3)
    parser.add_argument("--max-corner-alpha", type=int, default=8)
    parser.add_argument("--max-green-fringe", type=int, default=18)
    args = parser.parse_args(argv)

    if not args.lossless and args.quality < MIN_WEBP_QUALITY:
        parser.error(f"lossy WebP quality must be >= {MIN_WEBP_QUALITY}")
    if not 0 <= args.quality <= 100:
        parser.error("quality must be between 0 and 100")
    if not 0 <= args.key_tolerance <= 255:
        parser.error("key-tolerance must be between 0 and 255")
    if not 0 <= args.opaque_excess < args.transparent_excess <= 255:
        parser.error("require 0 <= opaque-excess < transparent-excess <= 255")
    if not 0 <= args.alpha_cutoff <= args.bbox_threshold <= 255:
        parser.error("require 0 <= alpha-cutoff <= bbox-threshold <= 255")
    if not 0 <= args.spill_allowance <= args.max_green_fringe <= 255:
        parser.error("require 0 <= spill-allowance <= max-green-fringe <= 255")
    if not 1 <= args.corner_sample <= CELL_SIZE // 4:
        parser.error("corner-sample is out of range")
    if args.all and (args.input or args.output):
        parser.error("--input/--output overrides cannot be combined with --all")
    rig_id = (args.rig or "r03").lower()
    match = re.fullmatch(r"r(\d{2})", rig_id)
    if not args.all and (not match or not 1 <= int(match.group(1)) <= 14):
        parser.error("--rig must be between r01 and r14")
    args.rig = rig_id
    return args


def processing_tasks(args: argparse.Namespace) -> list[tuple[str, Path, Path]]:
    if args.all:
        tasks: list[tuple[str, Path, Path]] = []
        for source in sorted(SOURCE_DIR.glob(f"r??{SOURCE_SUFFIX}")):
            rig_id = source.name.removesuffix(SOURCE_SUFFIX).lower()
            match = re.fullmatch(r"r(\d{2})", rig_id)
            if match and 1 <= int(match.group(1)) <= 14:
                tasks.append((rig_id, source, OUTPUT_DIR / f"{rig_id}-core.webp"))
        found = {rig_id for rig_id, _, _ in tasks}
        expected = {f"r{index:02d}" for index in range(1, 15)}
        missing = sorted(expected - found)
        if missing:
            raise ProcessingError(
                "--all requires r01-r14 sources; missing " + ", ".join(missing)
            )
        return tasks

    source = args.input or SOURCE_DIR / f"{args.rig}{SOURCE_SUFFIX}"
    output = args.output or OUTPUT_DIR / f"{args.rig}-core.webp"
    return [(args.rig, source, output)]


def process_one(
    rig_id: str,
    source_path: Path,
    output_path: Path,
    args: argparse.Namespace,
) -> ValidationReport:
    if not source_path.is_file():
        raise ProcessingError(f"source image not found: {source_path}")

    temporary = output_path.with_name(f"{output_path.stem}.tmp{output_path.suffix}")
    try:
        with Image.open(source_path) as source:
            source.load()
            motion_sheet = build_motion_sheet(source, args)

        output_path.parent.mkdir(parents=True, exist_ok=True)
        save_options = {
            "format": "WEBP",
            "lossless": args.lossless,
            "quality": 100 if args.lossless else args.quality,
            "method": 6,
            "exact": True,
        }
        motion_sheet.save(temporary, **save_options)
        report = validate_output(temporary, args)
        temporary.replace(output_path)
        return report
    except Exception:
        temporary.unlink(missing_ok=True)
        raise


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv)
    tasks = processing_tasks(args)
    if not tasks:
        print(f"ERROR: no motion-sheet sources found in {SOURCE_DIR}", file=sys.stderr)
        return 2

    failed = False
    for rig_id, source_path, output_path in tasks:
        try:
            report = process_one(rig_id, source_path, output_path, args)
            print_report(report, rig_id, output_path, args)
        except (OSError, ProcessingError, ValueError) as error:
            failed = True
            print(f"ERROR [{rig_id}]: {error}", file=sys.stderr)
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
