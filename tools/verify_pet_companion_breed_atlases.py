#!/usr/bin/env python3
"""Strictly validate every catalog-specific pet companion motion atlas."""

from __future__ import annotations

import re
import sys
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

from PIL import Image

from process_pet_motion_sheet import parse_args, validate_output


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
        with Image.open(path) as core, Image.open(poster_path) as poster:
            core.load()
            poster.load()
            expected = core.convert("RGBA").crop((0, 0, 256, 256))
            actual = poster.convert("RGBA")
        if actual.size != (256, 256):
            raise RuntimeError(f"Poster has wrong size: {actual.size}")
        if actual.tobytes() != expected.tobytes():
            raise RuntimeError("Poster does not exactly match core idle frame 1")
    except Exception as error:  # Report every bad atlas in a single run.
        return path.name, str(error)
    return path.name, None


def main() -> int:
    breed_ids = catalog_breed_ids()
    expected_names = {f"{breed_id}-core.webp" for breed_id in breed_ids}
    actual_names = {path.name for path in ASSET_DIRECTORY.glob("*-core.webp")}
    missing = sorted(expected_names - actual_names)
    unexpected = sorted(actual_names - expected_names)
    if missing or unexpected:
        print(
            f"ERROR: atlas coverage is {len(actual_names)}/120",
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
        "120 breed atlases, 1,920 aligned transparent frames."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
