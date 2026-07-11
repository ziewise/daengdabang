#!/usr/bin/env python3
"""Strictly validate every catalog-specific pet companion motion atlas."""

from __future__ import annotations

import re
import sys
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path
from statistics import median

from PIL import Image

from process_pet_motion_sheet import (
    CELL_SIZE,
    _motion_pair_metrics,
    _row_motion_metrics,
    parse_args,
    validate_output,
)


ROOT = Path(__file__).resolve().parents[1]
CATALOG_PATH = ROOT / "lib" / "pet-companion-breeds.ts"
ASSET_DIRECTORY = (
    ROOT / "public" / "images" / "pet-companion" / "cute-v4-breeds"
)


def catalog_breed_ids() -> list[str]:
    source = CATALOG_PATH.read_text(encoding="utf-8")
    start = source.find("const BREED_DEFINITIONS")
    end = source.find("\n];", start)
    if start < 0 or end < 0:
        raise RuntimeError("Unable to locate the pet companion breed catalog")
    breed_ids = re.findall(r'^\s*\["([^"]+)"', source[start:end], re.MULTILINE)
    if len(breed_ids) != 120 or len(set(breed_ids)) != 120:
        raise RuntimeError(
            f"Expected 120 unique catalog breeds; found {len(breed_ids)}/{len(set(breed_ids))}"
        )
    return breed_ids


def validate_one(path_text: str) -> tuple[str, str | None]:
    path = Path(path_text)
    try:
        validate_output(path, parse_args([]))
        poster_path = path.with_name(path.name.replace("-core.webp", "-poster.webp"))
        vertical_path = path.with_name(path.name.replace("-core.webp", "-vertical.webp"))
        validate_output(vertical_path, parse_args([]))
        with (
            Image.open(path) as core,
            Image.open(poster_path) as poster,
            Image.open(vertical_path) as vertical,
        ):
            core.load()
            poster.load()
            vertical.load()
            expected = core.convert("RGBA").crop((0, 0, 256, 256))
            core_rgba = core.convert("RGBA")
            actual = poster.convert("RGBA")
            vertical_rgba = vertical.convert("RGBA")
        if actual.size != (256, 256):
            raise RuntimeError(f"Poster has wrong size: {actual.size}")
        if actual.tobytes() != expected.tobytes():
            raise RuntimeError("Poster does not exactly match core idle frame 1")

        vertical_rows: list[list[Image.Image]] = []
        core_vertical_pair_metrics: list[tuple[float, float]] = []
        for row in range(4):
            cells = [
                vertical_rgba.crop(
                    (
                        column * CELL_SIZE,
                        row * CELL_SIZE,
                        (column + 1) * CELL_SIZE,
                        (row + 1) * CELL_SIZE,
                    )
                )
                for column in range(4)
            ]
            vertical_rows.append(cells)
            core_cells = [
                core_rgba.crop(
                    (
                        column * CELL_SIZE,
                        row * CELL_SIZE,
                        (column + 1) * CELL_SIZE,
                        (row + 1) * CELL_SIZE,
                    )
                )
                for column in range(4)
            ]
            core_vertical_pair_metrics.extend(
                _motion_pair_metrics(core_cells[column], cells[column])
                for column in range(4)
            )
            alpha_change, visual_change = _row_motion_metrics(cells)
            if alpha_change < 0.10 and visual_change < 0.025:
                raise RuntimeError(
                    f"Vertical row {row} is nearly static: alpha {alpha_change:.4f}, "
                    f"visual {visual_change:.4f}"
                )

        for up_row, down_row in ((0, 1), (2, 3)):
            direction_metrics = [
                _motion_pair_metrics(
                    vertical_rows[up_row][column],
                    vertical_rows[down_row][column],
                )
                for column in range(4)
            ]
            alpha_change = median(metric[0] for metric in direction_metrics)
            visual_change = median(metric[1] for metric in direction_metrics)
            if alpha_change < 0.16 and visual_change < 0.035:
                raise RuntimeError(
                    f"Up/down rows {up_row}/{down_row} are not visually distinct: "
                    f"alpha {alpha_change:.4f}, visual {visual_change:.4f}"
                )

        core_alpha_change = median(
            metric[0] for metric in core_vertical_pair_metrics
        )
        core_visual_change = median(
            metric[1] for metric in core_vertical_pair_metrics
        )
        if core_alpha_change < 0.14 and core_visual_change < 0.035:
            raise RuntimeError(
                "Vertical atlas still resembles the side-profile core atlas: "
                f"alpha {core_alpha_change:.4f}, visual {core_visual_change:.4f}"
            )
    except Exception as error:  # Report every bad atlas in a single run.
        return path.name, str(error)
    return path.name, None


def main() -> int:
    breed_ids = catalog_breed_ids()
    expected_core_names = {f"{breed_id}-core.webp" for breed_id in breed_ids}
    expected_vertical_names = {f"{breed_id}-vertical.webp" for breed_id in breed_ids}
    actual_core_names = {path.name for path in ASSET_DIRECTORY.glob("*-core.webp")}
    actual_vertical_names = {path.name for path in ASSET_DIRECTORY.glob("*-vertical.webp")}
    missing = sorted(
        (expected_core_names - actual_core_names)
        | (expected_vertical_names - actual_vertical_names)
    )
    unexpected = sorted(
        (actual_core_names - expected_core_names)
        | (actual_vertical_names - expected_vertical_names)
    )
    if missing or unexpected:
        print(
            "ERROR: atlas coverage is "
            f"{len(actual_core_names)}/120 core and "
            f"{len(actual_vertical_names)}/120 vertical",
            file=sys.stderr,
        )
        if missing:
            print("Missing: " + ", ".join(missing), file=sys.stderr)
        if unexpected:
            print("Unexpected: " + ", ".join(unexpected), file=sys.stderr)
        return 1

    paths = [str(ASSET_DIRECTORY / f"{breed_id}-core.webp") for breed_id in breed_ids]
    with ProcessPoolExecutor(max_workers=4) as executor:
        results = list(executor.map(validate_one, paths))
    failures = [(name, error) for name, error in results if error]
    if failures:
        print(
            f"ERROR: {len(failures)}/120 breed atlases failed strict frame validation",
            file=sys.stderr,
        )
        for name, error in failures:
            print(f"{name}: {error}", file=sys.stderr)
        return 1

    print(
        "Pet companion frame quality verified: "
        "120 core and 120 vertical breed atlases, "
        "3,840 aligned transparent frames."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
