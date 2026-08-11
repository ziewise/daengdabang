from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public" / "images" / "pwa" / "daengdabang-black-poodle-app-icon-master-v3.png"
OUTPUT = ROOT / "public" / "downloads" / "daengdabang-ai-install-v20260812.ico"


source = Image.open(SOURCE).convert("RGBA")
if source.width != source.height:
    raise ValueError("AI assistant app icon master must be square")

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
source.resize((256, 256), Image.Resampling.LANCZOS).save(
    OUTPUT,
    "ICO",
    sizes=[
        (16, 16),
        (20, 20),
        (24, 24),
        (32, 32),
        (40, 40),
        (48, 48),
        (64, 64),
        (128, 128),
        (256, 256),
    ],
)

print(f"Generated {OUTPUT.relative_to(ROOT)} ({OUTPUT.stat().st_size:,} bytes)")
