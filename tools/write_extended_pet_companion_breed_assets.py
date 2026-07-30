#!/usr/bin/env python3
"""Build dedicated motion atlases for the 35 extended companion breeds.

The verified canonical atlas listed for each breed is used only as a motion
source.  Every output frame receives a breed-specific body proportion and
colour treatment, is re-anchored inside its original 256 px cell, and is then
written under the extended breed's own ID.  This preserves the existing
idle/walk/run/sniff and up/down animation timing while making the result an
independent, reproducible asset rather than a runtime alias.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageEnhance

from process_pet_motion_sheet import suppress_green_spill


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIRECTORY = (
    ROOT / "public" / "images" / "pet-companion" / "cute-v4-breeds"
)
CELL_SIZE = 256
GRID_SIZE = 4
ATLAS_SIZE = CELL_SIZE * GRID_SIZE


@dataclass(frozen=True)
class BreedAssetProfile:
    breed_id: str
    source_id: str
    scale_x: float = 1.0
    scale_y: float = 1.0
    red: float = 1.0
    green: float = 1.0
    blue: float = 1.0
    saturation: float = 1.0
    brightness: float = 1.0
    contrast: float = 1.0
    x_shift: int = 0
    y_shift: int = 0
    lossless: bool = False


# Profiles follow the 7x5 art-direction board in
# artifacts/pet-companion/extended-breeds/visual-reference-20260730.png.
# Values are intentionally restrained: leg articulation comes from the
# canonical source while silhouette, body ratio and coat treatment become
# breed-specific without destabilising the shared sprite-cell contract.
PROFILES = (
    BreedAssetProfile("dachshund", "basset", 1.055, 0.900, 0.84, 0.72, 0.62, 1.15, 0.91, 1.08, y_shift=3),
    BreedAssetProfile("bichon-frise", "toy-poodle", 1.060, 1.015, 1.08, 1.07, 1.04, 0.58, 1.10, 0.96),
    BreedAssetProfile("jindo-dog", "dingo", 1.025, 1.045, 1.04, 0.97, 0.86, 0.86, 1.035, 1.02),
    BreedAssetProfile("sapsaree", "tibetan-terrier", 1.035, 1.020, 0.91, 0.86, 0.82, 0.82, 0.97, 1.04),
    BreedAssetProfile("pungsan-dog", "eskimo-dog", 1.035, 1.040, 1.08, 1.075, 1.04, 0.55, 1.08, 0.97),
    BreedAssetProfile("donggyeongi", "basenji", 0.985, 1.000, 0.90, 0.84, 0.75, 0.92, 0.94, 1.05, lossless=True),
    BreedAssetProfile("shiba-inu", "basenji", 1.025, 1.025, 1.08, 0.91, 0.72, 1.13, 1.00, 1.04),
    BreedAssetProfile("akita-inu", "malamute", 1.055, 1.045, 1.04, 0.94, 0.80, 0.94, 1.02, 1.03, lossless=True),
    BreedAssetProfile("japanese-spitz", "eskimo-dog", 0.970, 1.025, 1.10, 1.09, 1.06, 0.52, 1.10, 0.96),
    BreedAssetProfile("havanese", "lhasa", 0.980, 1.010, 0.92, 0.87, 0.82, 0.78, 0.98, 1.02, lossless=True),
    BreedAssetProfile("coton-de-tulear", "maltese-dog", 1.045, 1.000, 1.09, 1.08, 1.04, 0.48, 1.095, 0.96),
    BreedAssetProfile("bolognese", "maltese-dog", 0.985, 1.045, 1.08, 1.055, 0.99, 0.60, 1.06, 0.98),
    BreedAssetProfile("russian-toy", "toy-terrier", 0.920, 1.040, 0.82, 0.70, 0.64, 1.06, 0.91, 1.08),
    BreedAssetProfile("chinese-crested", "mexican-hairless", 0.950, 1.035, 1.04, 0.91, 0.88, 0.68, 1.02, 1.03),
    BreedAssetProfile("jack-russell-terrier", "wire-haired-fox-terrier", 0.965, 0.970, 1.04, 0.94, 0.83, 1.06, 1.02, 1.04, lossless=True),
    BreedAssetProfile("parson-russell-terrier", "wire-haired-fox-terrier", 0.995, 1.035, 0.96, 0.89, 0.82, 0.88, 0.99, 1.06),
    BreedAssetProfile("bull-terrier", "staffordshire-bullterrier", 0.970, 1.050, 1.08, 1.035, 0.98, 0.72, 1.06, 1.08),
    BreedAssetProfile("american-pit-bull-terrier", "american-staffordshire-terrier", 1.030, 1.025, 0.78, 0.80, 0.82, 0.72, 0.91, 1.10),
    BreedAssetProfile("english-bulldog", "french-bulldog", 1.075, 0.920, 1.03, 0.88, 0.74, 0.96, 0.97, 1.09, y_shift=3, lossless=True),
    BreedAssetProfile("american-bulldog", "boxer", 1.055, 0.985, 1.07, 1.02, 0.95, 0.76, 1.04, 1.07, lossless=True),
    BreedAssetProfile("cane-corso", "bull-mastiff", 1.050, 1.070, 0.68, 0.70, 0.72, 0.58, 0.82, 1.14),
    BreedAssetProfile("neapolitan-mastiff", "bull-mastiff", 1.075, 1.045, 0.75, 0.76, 0.76, 0.50, 0.86, 1.12, y_shift=1, lossless=True),
    BreedAssetProfile("dogue-de-bordeaux", "bull-mastiff", 1.035, 0.975, 1.07, 0.78, 0.60, 1.14, 0.94, 1.10, y_shift=2),
    BreedAssetProfile("australian-shepherd", "border-collie", 1.015, 1.025, 0.91, 0.94, 1.03, 1.08, 0.99, 1.06),
    BreedAssetProfile("miniature-american-shepherd", "shetland-sheepdog", 0.945, 0.985, 0.94, 0.91, 0.88, 1.02, 0.99, 1.04, lossless=True),
    BreedAssetProfile("belgian-tervuren", "groenendael", 1.025, 1.055, 1.08, 0.91, 0.72, 0.82, 0.94, 1.08),
    BreedAssetProfile("belgian-laekenois", "briard", 0.985, 1.025, 1.07, 0.91, 0.72, 0.94, 1.01, 1.08, lossless=True),
    BreedAssetProfile("portuguese-water-dog", "curly-coated-retriever", 0.985, 1.040, 0.69, 0.70, 0.72, 0.56, 0.84, 1.10),
    BreedAssetProfile("lagotto-romagnolo", "curly-coated-retriever", 0.945, 0.970, 1.03, 0.86, 0.72, 0.94, 1.01, 1.06),
    BreedAssetProfile("spanish-water-dog", "curly-coated-retriever", 0.980, 1.005, 0.87, 0.84, 0.80, 0.66, 0.94, 1.08),
    BreedAssetProfile("maltipoo", "toy-poodle", 0.950, 0.985, 1.08, 1.04, 0.96, 0.67, 1.07, 0.98, lossless=True),
    BreedAssetProfile("cockapoo", "toy-poodle", 1.015, 1.005, 1.06, 0.85, 0.68, 1.10, 0.97, 1.06),
    BreedAssetProfile("goldendoodle", "standard-poodle", 1.035, 1.025, 1.08, 0.88, 0.66, 1.12, 1.01, 1.05),
    BreedAssetProfile("labradoodle", "standard-poodle", 1.055, 1.000, 0.82, 0.69, 0.60, 1.03, 0.90, 1.09),
    BreedAssetProfile("pomsky", "pomeranian", 1.010, 1.045, 0.82, 0.87, 0.96, 0.74, 0.96, 1.09, lossless=True),
)


def _channel_table(factor: float) -> list[int]:
    return [min(255, max(0, round(value * factor))) for value in range(256)]


def recolour(image: Image.Image, profile: BreedAssetProfile) -> Image.Image:
    rgba = image.convert("RGBA")
    alpha = rgba.getchannel("A")
    rgb = rgba.convert("RGB")
    rgb = ImageEnhance.Color(rgb).enhance(profile.saturation)
    rgb = ImageEnhance.Contrast(rgb).enhance(profile.contrast)
    red, green, blue = rgb.split()
    rgb = Image.merge(
        "RGB",
        (
            red.point(_channel_table(profile.red)),
            green.point(_channel_table(profile.green)),
            blue.point(_channel_table(profile.blue)),
        ),
    )
    rgb = ImageEnhance.Brightness(rgb).enhance(profile.brightness)
    result = rgb.convert("RGBA")
    result.putalpha(alpha)
    return result


def transform_frame(
    frame: Image.Image,
    profile: BreedAssetProfile,
    row: int,
) -> Image.Image:
    rgba = recolour(frame, profile)
    bounds = rgba.getchannel("A").getbbox()
    if bounds is None:
        raise RuntimeError(f"Empty source frame for {profile.breed_id}")

    cropped = rgba.crop(bounds)
    target_width = max(1, round(cropped.width * profile.scale_x))
    target_height = max(1, round(cropped.height * profile.scale_y))
    target_width = min(target_width, CELL_SIZE - 24)
    target_height = min(
        target_height,
        220 if row != 2 else CELL_SIZE - 24,
    )
    resized = cropped.resize((target_width, target_height), Image.Resampling.LANCZOS)

    # Every canonical frame is centred at x=128. Re-centre after scaling so
    # per-row alignment remains within the strict one-pixel tolerance.
    target_left = round(CELL_SIZE / 2 - target_width / 2 + profile.x_shift)
    target_left = min(max(12, target_left), CELL_SIZE - target_width - 12)
    if row != 2:
        # idle/walk/sniff and vertical direction rows share the 232 px paw
        # baseline in the production contract.
        target_top = 232 - target_height
    else:
        target_bottom = bounds[3] + profile.y_shift
        target_top = min(
            max(12, target_bottom - target_height),
            CELL_SIZE - target_height - 12,
        )

    output = Image.new("RGBA", (CELL_SIZE, CELL_SIZE), (0, 0, 0, 0))
    output.alpha_composite(resized, (target_left, target_top))
    return suppress_green_spill(
        output,
        spill_allowance=0,
        alpha_cutoff=3,
    )


def transform_atlas(source: Image.Image, profile: BreedAssetProfile) -> Image.Image:
    if source.size != (ATLAS_SIZE, ATLAS_SIZE):
        raise RuntimeError(
            f"Unexpected {profile.source_id} atlas size: {source.size}"
        )
    result = Image.new("RGBA", source.size, (0, 0, 0, 0))
    source_rgba = source.convert("RGBA")
    for row in range(GRID_SIZE):
        for column in range(GRID_SIZE):
            left = column * CELL_SIZE
            top = row * CELL_SIZE
            frame = source_rgba.crop(
                (left, top, left + CELL_SIZE, top + CELL_SIZE)
            )
            result.alpha_composite(
                transform_frame(frame, profile, row),
                (left, top),
            )
    return result


def write_atlas_webp(
    image: Image.Image,
    path: Path,
    profile: BreedAssetProfile,
) -> None:
    # Match the canonical production encoder: high-quality lossy colour with
    # an exact alpha plane.  This keeps 32-frame downloads inside the existing
    # 650 KB per-atlas budget after breed-specific resampling.
    image.save(
        path,
        format="WEBP",
        lossless=profile.lossless,
        quality=100 if profile.lossless else 96,
        method=4,
        exact=True,
    )


def write_poster_webp(image: Image.Image, path: Path) -> None:
    image.save(path, format="WEBP", lossless=True, method=4, exact=True)


def main() -> int:
    if len(PROFILES) != 35 or len({profile.breed_id for profile in PROFILES}) != 35:
        raise RuntimeError("Expected 35 unique extended breed asset profiles")

    for profile in PROFILES:
        generated: dict[str, Image.Image] = {}
        for suffix in ("core", "vertical"):
            source_path = ASSET_DIRECTORY / f"{profile.source_id}-{suffix}.webp"
            if not source_path.exists():
                raise RuntimeError(f"Missing motion source: {source_path}")
            with Image.open(source_path) as source:
                source.load()
                generated[suffix] = transform_atlas(source, profile)
            write_atlas_webp(
                generated[suffix],
                ASSET_DIRECTORY / f"{profile.breed_id}-{suffix}.webp",
                profile,
            )

        # Derive the poster from the stored core so strict verification can
        # require byte-for-byte pixel equality with idle frame 1.
        core_path = ASSET_DIRECTORY / f"{profile.breed_id}-core.webp"
        with Image.open(core_path) as stored_core:
            stored_core.load()
            poster = stored_core.convert("RGBA").crop(
                (0, 0, CELL_SIZE, CELL_SIZE)
            )
        write_poster_webp(
            poster,
            ASSET_DIRECTORY / f"{profile.breed_id}-poster.webp",
        )
        print(
            f"{profile.breed_id}: {profile.source_id} motion -> dedicated atlas"
        )

    print("Wrote 35 dedicated breed atlas sets (1,120 motion frames).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
