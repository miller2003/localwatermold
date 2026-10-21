"""Render the 1200x630 share images in site/public.
Usage: python make_og.py --state pa   (og-pa.png)
       python make_og.py --national   (og-us.png, the root pages)"""
import json
import re
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from states import STATES, state_from_args

NATIONAL = "--national" in sys.argv
ST = None if NATIONAL else state_from_args()[0]
HERE = Path(__file__).parent
SITE = HERE.parent / "site"

PAPER, INK, INK2, NEAR, BASE = "#fbf8f3", "#1b2a3a", "#44525f", "#b9d3e6", "#e9e3d8"
RED, CREAM = "#c0392b", "#f7f1e3"
FONTS = HERE / "fonts"
SLAB, COND, COND_SEMI = "AlfaSlabOne-Regular.ttf", "BarlowCondensed-Bold.ttf", "BarlowCondensed-SemiBold.ttf"
LOGO = HERE / "out" / "brand" / "horizontal.png"  # from make_brand.py


def font(name, size):
    return ImageFont.truetype(str(FONTS / name), size)


S = 2  # supersample for smooth edges
W, H = 1200 * S, 630 * S
BAND = 78 * S  # red sign band along the bottom
img = Image.new("RGB", (W, H), PAPER)
d = ImageDraw.Draw(img)

# Map on the right (state images only), clear of the bottom band.
if not NATIONAL:
    data = json.loads((ST["site"] / "counties.json").read_text(encoding="utf-8"))
    mp = json.loads((ST["site"] / "map.json").read_text(encoding="utf-8"))
    covered = {c["slug"] for c in data["counties"] if c.get("pilot")}
    _, _, vw, vh = map(float, mp["viewBox"].split())
    # Cap the map at 40% of the width so wide states leave room for the text.
    scale = min((H - BAND - 110 * S) / vh, 0.4 * W / vw)
    ox, oy = W - vw * scale - 60 * S, (H - BAND - vh * scale) / 2
    for slug, path in mp["paths"].items():
        for ring in re.findall(r"M([^Z]+)Z", path):
            pts = [tuple(map(float, p.split(","))) for p in ring.split("L")]
            poly = [(ox + x * scale, oy + y * scale) for x, y in pts]
            d.polygon(poly, fill=NEAR if slug in covered else BASE, outline=PAPER, width=2 * S)

# Pinstripe along the top; the logo top left on state images.
d.rectangle([0, 0, W, 8 * S], fill=RED)
d.rectangle([0, 14 * S, W, 16 * S], fill=INK)
x = 72 * S
logo = Image.open(LOGO)
lh = 74 * S
logo = logo.resize((round(logo.width * lh / logo.height), lh), Image.LANCZOS)
if not NATIONAL:
    img.paste(logo, (x - 6 * S, 52 * S), logo)
else:
    # No map on the root image, so the full truck-door logo fills the right side.
    big = Image.open(HERE / "out" / "brand" / "stacked.png")
    bw = 430 * S
    big = big.resize((bw, round(big.height * bw / big.width)), Image.LANCZOS)
    img.paste(big, (W - bw - 64 * S, (H - BAND - big.height) // 2 + 10 * S), big)

y = 196 * S
if NATIONAL:
    headline = ["Water in the house?", "Find local help, fast."]
    sub = ["County guides for what to do first, and", "a call line to restoration companies near you."]
    label = f"{len(STATES)} states, county by county"
else:
    headline = ["Water and mold help", f"for every {ST['name']} county"]
    sub = ["Local risk data, first steps, and a call line", "to restoration companies near you."]
    label = f"{len(covered)} county guides"
# Shrink the headline until it clears the map.
max_w = W - x - (500 * S if NATIONAL else 0.4 * W + 100 * S)
size = 58
while size > 34 and max(d.textlength(line, font=font(SLAB, size * S)) for line in headline) > max_w:
    size -= 2
for line in headline:
    d.text((x, y), line, font=font(SLAB, size * S), fill=INK)
    y += int(size * 1.22) * S
d.text((x, y + 22 * S), sub[0], font=font(COND_SEMI, 31 * S), fill=INK2)
d.text((x, y + 62 * S), sub[1], font=font(COND_SEMI, 31 * S), fill=INK2)

# Bottom band: what we cover on the left, the domain on the right.
d.rectangle([0, H - BAND, W, H], fill=RED)
d.rectangle([0, H - BAND - 6 * S, W, H - BAND - 4 * S], fill=INK)
bf = font(COND, 30 * S)
ty = H - BAND + (BAND - 30 * S) // 2 - 4 * S
left = f"{label.upper()}  ·  WATER · MOLD · FIRE · BASEMENTS"
d.text((x, ty), left, font=bf, fill=CREAM)
dom = "LOCALWATERMOLD.COM"
d.text((W - x - d.textlength(dom, font=bf), ty), dom, font=bf, fill=CREAM)

out = SITE / "public" / f"og-{'us' if NATIONAL else ST['abbr']}.png"
img.resize((1200, 630), Image.LANCZOS).save(out, optimize=True)
print("wrote", out, out.stat().st_size, "bytes")
