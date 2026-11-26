"""Create a small mark variant: crop the board emblem from the logo."""

from PIL import Image

src = Image.open("logo.png").convert("RGBA")
w, h = src.size  # e.g. 1024x1024

# The board emblem is the upper-center portion of the artwork.
# Crop a centered square from the top ~62% of the image.
crop = src.crop((int(w * 0.22), int(h * 0.05), int(w * 0.78), int(h * 0.61)))

# Squarify and resize.
side = min(crop.size)
left = (crop.width - side) // 2
top = (crop.height - side) // 2
crop = crop.crop((left, top, left + side, top + side))

crop = crop.resize((256, 256), Image.LANCZOS)
crop.save("assets/mark-256.png", optimize=True)
crop.save("assets/mark-256.webp", quality=90, method=6)

import os
for f in ["assets/mark-256.png", "assets/mark-256.webp"]:
    print(f, round(os.path.getsize(f) / 1024), "KB")
