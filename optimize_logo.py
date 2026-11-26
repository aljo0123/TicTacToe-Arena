"""Optimize the logo: resize to web-friendly sizes and compress."""

from PIL import Image

src = Image.open("logo.png").convert("RGBA")

# Hero image for loading screen / menu: 512px is plenty (displayed max ~380px).
hero = src.resize((512, 512), Image.LANCZOS)
hero.save("assets/logo-512.png", optimize=True)

# WebP is dramatically smaller with no visible difference for this art style.
try:
    hero.save("assets/logo-512.webp", quality=88, method=6)
    print("webp ok")
except Exception as e:
    print("webp skipped:", e)

import os
for f in ["assets/logo-512.png", "assets/logo-512.webp", "logo.png"]:
    if os.path.exists(f):
        print(f, round(os.path.getsize(f) / 1024), "KB")
