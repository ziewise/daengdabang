#!/usr/bin/env python3
"""Derive an independent first-frame poster for every breed motion atlas."""

from __future__ import annotations

import re
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
CATALOG_PATH = ROOT / "lib" / "pet-companion-breeds.ts"
ASSET_DIRECTORY = (
    ROOT / "public" / "images" / "pet-companion" / "cute-v4-breeds"
)
CELL_SIZE = 256


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


def main() -> int:
    breed_ids = catalog_breed_ids()
    for breed_id in breed_ids:
        core_path = ASSET_DIRECTORY / f"{breed_id}-core.webp"
        poster_path = ASSET_DIRECTORY / f"{breed_id}-poster.webp"
        with Image.open(core_path) as core:
            core.load()
            if core.size != (CELL_SIZE * 4, CELL_SIZE * 4):
                raise RuntimeError(f"Unexpected core size for {breed_id}: {core.size}")
            poster = core.convert("RGBA").crop((0, 0, CELL_SIZE, CELL_SIZE))
        if poster.getchannel("A").getbbox() is None:
            raise RuntimeError(f"Empty first frame for {breed_id}")
        poster.save(
            poster_path,
            format="WEBP",
            lossless=True,
            method=6,
            exact=True,
        )
    print("Wrote 120 independent breed poster fallbacks.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
