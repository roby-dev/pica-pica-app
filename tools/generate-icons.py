"""Builds every app icon from tools/icon-master.png: `python tools/generate-icons.py`.

The master is square artwork (dark base, lime ant, soft violet/coral glow). Icons are the master
recentred on the ant so the symbol sits in the middle, which also keeps it inside the maskable safe zone.
"""
from pathlib import Path

from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parent
PUBLIC = ROOT.parent / "public"
LIME_MIN = (200, 220, 60)


def recentred(master: Image.Image) -> Image.Image:
    rgb = master.convert("RGB")
    r, g, b = rgb.split()
    # Lime pixels only: high red and green, low blue.
    mask = ImageChops.multiply(r.point(lambda v: 255 if v > LIME_MIN[0] else 0), g.point(lambda v: 255 if v > LIME_MIN[1] else 0))
    mask = ImageChops.multiply(mask, b.point(lambda v: 255 if v < 140 else 0))
    left, top, right, bottom = mask.getbbox()
    dx = master.width // 2 - (left + right) // 2
    dy = master.height // 2 - (top + bottom) // 2
    return ImageChops.offset(rgb, dx, dy)


def main() -> None:
    art = recentred(Image.open(ROOT / "icon-master.png"))
    icons = PUBLIC / "icons"
    for name, size in {"apple-touch-icon": 180, "icon-192": 192, "icon-512": 512, "icon-maskable-512": 512}.items():
        art.resize((size, size), Image.LANCZOS).save(icons / f"{name}.png", optimize=True)
    art.resize((256, 256), Image.LANCZOS).save(PUBLIC / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])


if __name__ == "__main__":
    main()
