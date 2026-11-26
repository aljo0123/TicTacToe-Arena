"""
Tic Tac Toe Arena — CrazyGames cover art generator.
Three separate compositions from the actual brand system:

  Palette (style.css tokens):
    bg      #07090d   panel   #11151f
    X blue  #4f7cff   O pink  #ff5c7a
    gold    #ffc85a   text    #f2f5f9

  Assets used: assets/logo-512.png (unchanged), assets/mark-256.png
  Typography: bold sans (Inter-like) with tight letterspacing.

Compositions are drawn independently — different layouts, not crops.
"""

from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os

OUT = "assets/marketing/crazygames"
os.makedirs(OUT, exist_ok=True)

BG = (7, 9, 13)
BG_SOFT = (12, 15, 22)
PANEL = (17, 21, 31)
X_BLUE = (79, 124, 255)
O_PINK = (255, 92, 122)
GOLD = (255, 200, 90)
TEXT = (242, 245, 249)
MUTED = (152, 162, 179)


def font(size, bold=True):
    for name in (
        "C:/Windows/Fonts/inter-bold.ttf" if bold else "C:/Windows/Fonts/inter-regular.ttf",
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
    ):
        if os.path.exists(name):
            return ImageFont.truetype(name, size)
    return ImageFont.load_default()


def vertical_bg(w, h, top=(10, 14, 24), bottom=(5, 6, 9)):
    """Dark gradient base with a blue-violet glow up top."""
    img = Image.new("RGB", (w, h))
    d = ImageDraw.Draw(img)
    for y in range(h):
        t = y / h
        r = int(top[0] + (bottom[0] - top[0]) * t)
        g = int(top[1] + (bottom[1] - top[1]) * t)
        b = int(top[2] + (bottom[2] - top[2]) * t)
        d.line([(0, y), (w, y)], fill=(r, g, b))
    return img


def glow(img, cx, cy, radius, color, strength=110):
    """Additive radial glow."""
    w, h = img.size
    layer = Image.new("RGB", (w, h), (0, 0, 0))
    d = ImageDraw.Draw(layer)
    for i in range(radius, 0, -6):
        a = int(strength * (1 - i / radius) ** 2)
        r = min(255, color[0] * a // 255)
        g = min(255, color[1] * a // 255)
        b = min(255, color[2] * a // 255)
        d.ellipse([cx - i, cy - i, cx + i, cy + i], fill=(r, g, b))
    layer = layer.filter(ImageFilter.GaussianBlur(radius // 3))
    from PIL import ImageChops
    return ImageChops.add(img, layer)


def draw_x(d, cx, cy, size, color, width):
    """Bold rounded X strokes (matches in-game mark weight)."""
    o = size // 2
    for pts in ([(cx - o, cy - o), (cx + o, cy + o)], [(cx - o, cy + o), (cx + o, cy - o)]):
        d.line(pts, fill=color, width=width)
        # Round caps: small circles at each end.
        for px, py in pts:
            r = width // 2
            d.ellipse([px - r, py - r, px + r, py + r], fill=color)


def draw_o(d, cx, cy, size, color, width):
    r = size // 2
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=color, width=width)


def draw_board(img, x, y, size, cells, cell_px, mark_ratio=0.55, line_w=None):
    """Draw a rounded game board with X/O glyphs placed by cell index.
    cells: dict index -> "X" | "O" """
    d = ImageDraw.Draw(img)
    radius = 34

    # Board panel with soft shadow
    shadow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle([x - 8, y + 10, x + size + 8, y + size + 26], radius, fill=(0, 0, 0, 140))
    shadow = shadow.filter(ImageFilter.GaussianBlur(18))
    img.paste(Image.new("RGB", img.size, (0, 0, 0)), (0, 0), shadow)

    d.rounded_rectangle(
        [x, y, x + size, y + size],
        radius,
        fill=PANEL,
        outline=(38, 44, 58),
        width=3,
    )

    gap = cell_px // 10
    inner = size - gap * 4
    cell = inner // 3

    for i in range(9):
        col, row = i % 3, i // 3
        cx0 = x + gap + col * (cell + gap)
        cy0 = y + gap + row * (cell + gap)
        d.rounded_rectangle(
            [cx0, cy0, cx0 + cell, cy0 + cell],
            radius=18,
            fill=(21, 25, 34),
            outline=(30, 36, 48),
            width=2,
        )
        mark = cells.get(i)
        if mark:
            ccx, ccy = cx0 + cell // 2, cy0 + cell // 2
            msize = int(cell * mark_ratio)
            lw = max(8, msize // 4)  # bold, matches in-game marks
            if mark == "X":
                draw_x(d, ccx, ccy, msize, X_BLUE, lw)
            else:
                draw_o(d, ccx, ccy, msize, O_PINK, lw)
    return cell


def title_block(d, cx, y, scale=1.0, subtitle=True):
    """TIC TAC TOE (eyebrow) + ARENA (huge). Returns bottom y."""
    f_small = font(int(34 * scale))
    f_big = font(int(118 * scale))

    small = "TIC  TAC  TOE"
    w = d.textlength(small, font=f_small)
    d.text((cx - w / 2, y), small, font=f_small, fill=GOLD)

    y2 = y + int(52 * scale)
    big = "ARENA"
    w2 = d.textlength(big, font=f_big)
    # subtle dark backing for contrast
    d.text((cx - w2 / 2 + 4, y2 + 5), big, font=f_big, fill=(0, 0, 0))
    d.text((cx - w2 / 2, y2), big, font=f_big, fill=TEXT)

    if subtitle:
        f_sub = font(int(24 * scale), bold=False)
        sub = "SEVEN MODES · ONE GRID · PROVE IT"
        w3 = d.textlength(sub, font=f_sub)
        ty = y2 + int(132 * scale)
        d.text((cx - w3 / 2, ty), sub, font=f_sub, fill=MUTED)
        return ty + int(40 * scale)
    return y2 + int(140 * scale)


# =========================================================
# COMPOSITION 1 — LANDSCAPE 1920x1080
# Hero board right, title block left, diagonal energy
# =========================================================
def landscape():
    W, H = 1920, 1080
    img = vertical_bg(W, H, top=(14, 18, 34), bottom=(4, 5, 8))

    # Large ambient glows: blue top-left, pink bottom-right
    img = glow(img, 420, 260, 620, X_BLUE, 60)
    img = glow(img, 1560, 880, 560, O_PINK, 48)

    d = ImageDraw.Draw(img)

    # Title block, left-center
    ty = title_block(d, 560, 250, scale=1.0)

    # NOTE: the raster logo asset is intentionally NOT pasted here —
    # at cover scale its glossy red/blue styling reads as a foreign
    # screenshot and breaks visual identity. The typographic lockup
    # (TIC TAC TOE / ARENA in brand gold/white) IS the identity.

    # Feature board right — a clean X-diagonal win over scattered O's.
    board_size = 640
    bx = 1090
    by = 220
    cells = {0: "X", 4: "X", 8: "X", 1: "O", 2: "O", 5: "O"}
    draw_board(img, bx, by, board_size, cells, board_size // 3)

    # Win-line stroke across 0-4-8 — endpoints AT the winning cells'
    # centers (like the in-game animation), with layered glow.
    d = ImageDraw.Draw(img)
    cell_step = board_size // 3
    p0 = (bx + cell_step // 2, by + cell_step // 2)
    p1 = (bx + cell_step * 5 // 2, by + cell_step * 5 // 2)
    for w_, col in ((30, (120, 150, 255)), (18, (200, 220, 255)), (9, (255, 255, 255))):
        d.line([p0, p1], fill=col, width=w_)

    # "PLAY VS AI" badge chip — anchored just below the board.
    f_badge = font(30)
    label = "PLAY  VS  AI"
    bw = d.textlength(label, font=f_badge) + 70
    bx0, by0 = bx + board_size // 2 - bw // 2, by + board_size + 46
    d.rounded_rectangle([bx0, by0, bx0 + bw, by0 + 62], 31, fill=(30, 38, 55), outline=(70, 90, 130), width=2)
    d.text((bx0 + 35, by0 + 14), label, font=f_badge, fill=TEXT)

    # Watermark glyphs — dim, brand-tinted, placed fully clear of the
    # board and canvas edges. Alpha-blend toward bg instead of
    # integer-darkening (which muddies the pink).
    d2 = ImageDraw.Draw(img)
    def tint(color, t):
        return tuple(int(c * t + b * (1 - t)) for c, b in zip(color, BG))
    draw_x(d2, 250, 900, 280, tint(X_BLUE, 0.42), 30)
    draw_o(d2, 1810, 130, 170, tint(O_PINK, 0.42), 22)

    img.save(f"{OUT}/cover-landscape.png", "PNG")
    return img


# =========================================================
# COMPOSITION 2 — PORTRAIT 800x1200
# Vertical: logo hero top, board center, title bottom
# =========================================================
def portrait():
    W, H = 800, 1200
    img = vertical_bg(W, H, top=(16, 20, 38), bottom=(4, 5, 9))

    img = glow(img, 400, 240, 500, X_BLUE, 70)
    img = glow(img, 400, 980, 420, O_PINK, 40)

    d = ImageDraw.Draw(img)

    # Logo hero — the actual, unaltered logo asset, presented exactly
    # as the in-game loading screen presents it: inside the glow
    # backdrop panel. This keeps brand consistency with the game.
    logo = Image.open("assets/logo-512.png").convert("RGBA").resize((260, 260), Image.LANCZOS)

    pad = 18
    panel = Image.new("RGB", (260 + pad * 2, 260 + pad * 2), BG_SOFT)
    pd = ImageDraw.Draw(panel)
    pd.rounded_rectangle([0, 0, panel.width, panel.height], 28, fill=(18, 22, 32))
    # Inner blue glow
    glow_layer = Image.new("RGB", panel.size, (0, 0, 0))
    gd = ImageDraw.Draw(glow_layer)
    for i in range(90, 0, -4):
        a = int(90 * (1 - i / 90) ** 2)
        gd.ellipse(
            [panel.width // 2 - i, panel.height // 2 - i, panel.width // 2 + i, panel.height // 2 + i],
            fill=(X_BLUE[0] * a // 255, X_BLUE[1] * a // 255, X_BLUE[2] * a // 255),
        )
    glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(28))
    from PIL import ImageChops
    panel = ImageChops.add(panel, glow_layer)
    panel.paste(logo, (pad, pad), logo)
    # Brighten the dark artwork like the loading screen does.
    panel = Image.eval(panel, lambda v: min(255, int(v * 1.12)))
    img.paste(panel, (W // 2 - panel.width // 2, 70))

    # Board mid-frame — O-winning column (O wins 2,5,8)
    board_size = 520
    cells = {2: "O", 5: "O", 8: "O", 0: "X", 4: "X", 6: "X"}
    draw_board(img, (W - board_size) // 2, 420, board_size, cells, board_size // 3)

    d = ImageDraw.Draw(img)
    # Win line down the right column 2-5-8 — slim, layered, ending at
    # the winning cells' centers.
    x_line = (W - board_size) // 2 + board_size * 5 // 6
    top_c = 420 + board_size // 6
    bot_c = 420 + board_size * 5 // 6
    for w_, col in ((20, (255, 170, 190)), (11, (255, 220, 230)), (6, (255, 255, 255))):
        d.line([(x_line, top_c), (x_line, bot_c)], fill=col, width=w_)

    # Title block at the bottom
    ty = title_block(d, W // 2, 1010, scale=0.62, subtitle=False)

    img.save(f"{OUT}/cover-portrait.png", "PNG")
    return img


# =========================================================
# COMPOSITION 3 — SQUARE 800x800
# Head-to-head duel: giant X vs O flanking a small board
# =========================================================
def square():
    W, H = 800, 800
    img = vertical_bg(W, H, top=(13, 17, 33), bottom=(4, 5, 9))

    img = glow(img, 190, 400, 420, X_BLUE, 80)
    img = glow(img, 610, 400, 420, O_PINK, 80)

    d = ImageDraw.Draw(img)

    # Title at top
    f_small = font(26)
    f_big = font(88)
    small = "TIC  TAC  TOE"
    w = d.textlength(small, font=f_small)
    d.text(((W - w) / 2, 56), small, font=f_small, fill=GOLD)
    big = "ARENA"
    w2 = d.textlength(big, font=f_big)
    d.text(((W - w2) / 2 + 3, 104), big, font=f_big, fill=(0, 0, 0))
    d.text(((W - w2) / 2, 100), big, font=f_big, fill=TEXT)

    # Dueling giant marks
    draw_x(d, 150, 430, 200, X_BLUE, 34)
    draw_o(d, 650, 430, 190, O_PINK, 30)

    # Central board — contested position, no winner shown
    board_size = 340
    cells = {0: "X", 1: "O", 4: "X", 3: "O", 8: "X", 6: "O"}
    draw_board(img, (W - board_size) // 2, 280, board_size, cells, board_size // 3)

    # Bottom tagline chip
    f_tag = font(24)
    tag = "SEVEN MODES · ONE GRID · PROVE IT"
    tw = d.textlength(tag, font=f_tag)
    d.rounded_rectangle(
        [(W - tw) / 2 - 30, 700, (W + tw) / 2 + 30, 756],
        28,
        fill=(20, 25, 36),
        outline=(60, 75, 110),
        width=2,
    )
    d.text(((W - tw) / 2, 716), tag, font=f_tag, fill=MUTED)

    img.save(f"{OUT}/cover-square.png", "PNG")
    return img


if __name__ == "__main__":
    landscape()
    portrait()
    square()

    # Verification
    for f in ["cover-landscape.png", "cover-portrait.png", "cover-square.png"]:
        p = os.path.join(OUT, f)
        im = Image.open(p)
        print(f"{p}: {im.size[0]}x{im.size[1]} format={im.format} size={os.path.getsize(p)//1024}KB")
