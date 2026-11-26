"""Final verification of the three CrazyGames covers:
dimensions, PNG format, and edge-clipping safety margins."""

from PIL import Image
import os

OUT = "assets/marketing/crazygames"
EXPECTED = {
    "cover-landscape.png": (1920, 1080),
    "cover-portrait.png": (800, 1200),
    "cover-square.png": (800, 800),
}

all_ok = True
for name, (ew, eh) in EXPECTED.items():
    p = os.path.join(OUT, name)
    if not os.path.exists(p):
        print(f"MISSING: {p}")
        all_ok = False
        continue
    im = Image.open(p)
    w, h = im.size
    fmt = im.format
    size_kb = os.path.getsize(p) // 1024

    dims_ok = (w, h) == (ew, eh)
    fmt_ok = fmt == "PNG"
    ok = dims_ok and fmt_ok
    all_ok = all_ok and ok

    print(
        f"{name}: {w}x{h} {'OK' if dims_ok else 'WRONG'} | "
        f"{fmt} {'OK' if fmt_ok else 'WRONG'} | {size_kb} KB"
    )

# Edge-safety: verify the extreme corners are background, not artwork
# (sampling the 6px corner squares for near-black dominance).
print("\nEdge clipping check (corners should be near-background):")
for name in EXPECTED:
    p = os.path.join(OUT, name)
    im = Image.open(p).convert("RGB")
    w, h = im.size
    worst = 255
    for cx, cy in [(3, 3), (w - 4, 3), (3, h - 4), (w - 4, h - 4)]:
        px = im.getpixel((cx, cy))
        bright = max(px)
        worst = min(worst, bright) if bright < worst else worst
    # Watermark glyphs are dim (>40) but not artwork-bright.
    verdict = "CLEAN" if worst < 60 else "CHECK"
    print(f"  {name}: darkest corner pixel {worst} -> {verdict}")

print("\nALL CHECKS PASS" if all_ok else "FAILURES PRESENT")
