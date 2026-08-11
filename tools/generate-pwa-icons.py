from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public" / "images" / "pwa" / "daengdabang-black-poodle-app-icon-master-v3.png"
OUTPUT = ROOT / "public" / "images" / "pwa"
APP = ROOT / "app"


def make_icon(size: int, destination: Path) -> None:
    source = Image.open(SOURCE).convert("RGB")
    if source.width != source.height:
        raise ValueError("PWA icon master must be square")

    source.resize((size, size), Image.Resampling.LANCZOS).save(
        destination,
        "PNG",
        optimize=True,
    )


OUTPUT.mkdir(parents=True, exist_ok=True)
make_icon(192, OUTPUT / "icon-v2-192x192.png")
make_icon(512, OUTPUT / "icon-v2-512x512.png")
make_icon(512, OUTPUT / "icon-maskable-v2-512x512.png")
make_icon(180, OUTPUT / "apple-touch-icon-v2-180x180.png")

# Next.js file-based metadata has precedence over metadata declared in layout.tsx.
make_icon(512, APP / "icon.png")
make_icon(180, APP / "apple-icon.png")
