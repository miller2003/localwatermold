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
BRAND = "Local Water & Mold"
TAGLINE = "Water · Mold · Fire · Basements"

PAPER, INK, INK2, WATER, NEAR, BASE, SIGNAL = "#fbf8f3", "#14202b", "#44525f", "#1f5f8b", "#b9d3e6", "#e9e3d8", "#c2410c"
FONTS = Path("C:/Windows/Fonts")


def font(name, size):
    return ImageFont.truetype(str(FONTS / name), size)


S = 2  # supersample for smooth edges
W, H = 1200 * S, 630 * S
img = Image.new("RGB", (W, H), PAPER)
d = ImageDraw.Draw(img)

# Map on the right (state images only).
if not NATIONAL:
    data = json.loads((ST["site"] / "counties.json").read_text(encoding="utf-8"))
    mp = json.loads((ST["site"] / "map.json").read_text(encoding="utf-8"))
    covered = {c["slug"] for c in data["counties"] if c.get("pilot")}
    _, _, vw, vh = map(float, mp["viewBox"].split())
    # Cap the map at 40% of the width so wide states leave room for the text.
    scale = min((H - 150 * S) / vh, 0.4 * W / vw)
    ox, oy = W - vw * scale - 60 * S, (H - vh * scale) / 2
    for slug, path in mp["paths"].items():
        for ring in re.findall(r"M([^Z]+)Z", path):
            pts = [tuple(map(float, p.split(","))) for p in ring.split("L")]
            poly = [(ox + x * scale, oy + y * scale) for x, y in pts]
            d.polygon(poly, fill=NEAR if slug in covered else BASE, outline=PAPER, width=2 * S)

# Text on the left.
x = 72 * S
d.rounded_rectangle([x, 70 * S, x + 56 * S, 126 * S], radius=14 * S, fill=WATER)
d.ellipse([x + 18 * S, 92 * S, x + 38 * S, 116 * S], fill=PAPER)
d.polygon([(x + 28 * S, 80 * S), (x + 19 * S, 101 * S), (x + 37 * S, 101 * S)], fill=PAPER)
d.text((x + 72 * S, 72 * S), BRAND, font=font("georgiab.ttf", 34 * S), fill=INK)
d.text((x + 72 * S, 112 * S), TAGLINE, font=font("segoeui.ttf", 20 * S), fill=INK2)

y = 200 * S
if NATIONAL:
    headline = ["Water damage, mold and fire:", "find local restoration help"]
    sub = ["County guides for what to do first, and", "a call line to restoration companies near you."]
    label = f"{len(STATES)} states, county by county"
else:
    headline = ["Water and mold help", f"for every {ST['name']} county"]
    sub = ["Local risk data, first steps, and a call line", "to restoration companies near you."]
    label = f"{len(covered)} county guides"
# Shrink the headline until it clears the map.
max_w = W - x - (0 if NATIONAL else 0.4 * W + 100 * S)
size = 52
while size > 34 and max(d.textlength(line, font=font("georgiab.ttf", size * S)) for line in headline) > max_w:
    size -= 2
for line in headline:
    d.text((x, y), line, font=font("georgiab.ttf", size * S), fill=INK)
    y += int(size * 1.27) * S
d.text((x, y + 24 * S), sub[0], font=font("segoeui.ttf", 27 * S), fill=INK2)
d.text((x, y + 62 * S), sub[1], font=font("segoeui.ttf", 27 * S), fill=INK2)
bf = font("segoeuib.ttf", 26 * S)
tw = d.textlength(label, font=bf)
d.rounded_rectangle([x, H - 112 * S, x + tw + 48 * S, H - 62 * S], radius=10 * S, fill=SIGNAL)
d.text((x + 24 * S, H - 104 * S), label, font=bf, fill="#ffffff")

out = SITE / "public" / f"og-{'us' if NATIONAL else ST['abbr']}.png"
img.resize((1200, 630), Image.LANCZOS).save(out, optimize=True)
print("wrote", out, out.stat().st_size, "bytes")
