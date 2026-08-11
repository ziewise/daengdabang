from pathlib import Path
import random

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public" / "images" / "logo.png"
OUTPUT = ROOT / "public" / "images" / "pwa"


def make_icon(size: int, filename: str, logo_ratio: float) -> None:
    scale = 4
    canvas_size = size * scale
    image = Image.new("RGB", (canvas_size, canvas_size), "#fffaf0")
    draw = ImageDraw.Draw(image, "RGBA")

    # Soft, deterministic crayon-like marks that stay behind the brand mark.
    random.seed(818 + size)
    colors = [(7, 132, 158, 25), (239, 71, 111, 23), (233, 135, 8, 22)]
    for index in range(34):
        color = colors[index % len(colors)]
        x1 = random.randint(-canvas_size // 5, canvas_size)
        y1 = random.randint(-canvas_size // 5, canvas_size)
        length = random.randint(canvas_size // 8, canvas_size // 3)
        width = random.randint(max(2, scale), max(4, scale * 3))
        draw.line((x1, y1, x1 + length, y1 + random.randint(-24, 24) * scale), fill=color, width=width)

    margin = int(canvas_size * 0.075)
    draw.rounded_rectangle(
        (margin, margin, canvas_size - margin, canvas_size - margin),
        radius=int(canvas_size * 0.22),
        outline=(7, 132, 158, 56),
        width=max(scale, int(canvas_size * 0.009)),
    )

    logo = Image.open(SOURCE).convert("RGBA")
    alpha_box = logo.getchannel("A").getbbox()
    if alpha_box:
        logo = logo.crop(alpha_box)
    target = int(canvas_size * logo_ratio)
    source_width, source_height = logo.size
    resize_ratio = min(target / source_width, target / source_height)
    logo = logo.resize(
        (max(1, round(source_width * resize_ratio)), max(1, round(source_height * resize_ratio))),
        Image.Resampling.LANCZOS,
    )
    logo_layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
    logo_layer.alpha_composite(logo, ((canvas_size - logo.width) // 2, (canvas_size - logo.height) // 2))
    image = Image.alpha_composite(image.convert("RGBA"), logo_layer)

    image.resize((size, size), Image.Resampling.LANCZOS).convert("RGB").save(
        OUTPUT / filename,
        "PNG",
        optimize=True,
    )


OUTPUT.mkdir(parents=True, exist_ok=True)
make_icon(192, "icon-192x192.png", 0.64)
make_icon(512, "icon-512x512.png", 0.64)
make_icon(512, "icon-maskable-512x512.png", 0.50)
make_icon(180, "apple-touch-icon-180x180.png", 0.62)
