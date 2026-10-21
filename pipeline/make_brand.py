"""Build the logo set from the sign-painter wordmark ("Local" in brush script over a slab "WATER & MOLD").
Text is converted to outlines, so nothing depends on fonts at view time.
Usage: python make_brand.py
Needs: fonttools, uharfbuzz, resvg-py, Pillow. Fonts are OFL, in pipeline/fonts.
Writes:
  site/src/data/brand.json         path data for the Logo component (header, footer)
  site/public/logo.svg, logo.png   stacked logo, logo.png is the 600x600 Organization logo for Google
  site/public/favicon.svg, favicon.ico, favicon-96x96.png, apple-touch-icon.png, icon-192.png, icon-512.png
  pipeline/out/brand/              lockup PNGs used by make_og.py, and a contact sheet"""
import io
import json
from pathlib import Path

import resvg_py
import uharfbuzz as hb
from fontTools.misc.transform import Transform
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from PIL import Image

HERE = Path(__file__).parent
FONTS = HERE / "fonts"
PUBLIC = HERE.parent / "site" / "public"
DATA = HERE.parent / "site" / "src" / "data"
OUT = HERE / "out" / "brand"

RED, INK, CREAM, WHITE = "#c0392b", "#1b2a3a", "#f7f1e3", "#ffffff"
SCRIPT, SLAB, COND = "MrDafoe-Regular.ttf", "AlfaSlabOne-Regular.ttf", "BarlowCondensed-Bold.ttf"
_fonts = {}


def load(name):
    if name not in _fonts:
        path = str(FONTS / name)
        face = hb.Face(hb.Blob.from_file_path(path))
        _fonts[name] = (TTFont(path), hb.Font(face), face.upem)
    return _fonts[name]


def text(name, s, size, x, y, anchor="start", tracking=0.0, rotate=0.0, origin=None):
    """Shape s and return (path d, bounds) with the baseline at (x, y). tracking is in px per glyph.
    rotate is in degrees (negative tilts the line up to the right, as in SVG), about origin."""
    tt, font, upem = load(name)
    buf = hb.Buffer()
    buf.add_str(s)
    buf.guess_segment_properties()
    hb.shape(font, buf, {"kern": True, "liga": True, "calt": True})
    k = size / upem
    advance = sum(p.x_advance for p in buf.glyph_positions) * k + tracking * (len(buf.glyph_infos) - 1)
    if anchor == "middle":
        x -= advance / 2
    ox, oy = origin or (x + advance / 2, y)
    rot = Transform().translate(ox, oy).rotate(rotate * 3.141592653589793 / 180).translate(-ox, -oy)
    glyphs = tt.getGlyphSet()
    svg, bounds, pen_x = SVGPathPen(glyphs), BoundsPen(glyphs), x
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        name_ = tt.getGlyphName(info.codepoint)
        t = rot.transform(Transform(k, 0, 0, -k, pen_x + pos.x_offset * k, y - pos.y_offset * k))
        glyphs[name_].draw(TransformPen(svg, t))
        glyphs[name_].draw(TransformPen(bounds, t))
        pen_x += pos.x_advance * k + tracking
    return svg.getCommands(), bounds.bounds, advance


def union(*bs):
    bs = [b for b in bs if b]
    return (min(b[0] for b in bs), min(b[1] for b in bs), max(b[2] for b in bs), max(b[3] for b in bs))


def shift(d, dx, dy):
    """Move a path made of absolute commands (what SVGPathPen writes) by dx, dy."""
    out, num, nums = [], "", []

    def flush():
        nonlocal num
        if num:
            nums.append(float(num))
            num = ""
    cmd = None
    parts = []
    for ch in d + " ":
        if ch.isalpha():
            flush()
            if cmd:
                parts.append((cmd, nums))
            cmd, nums = ch, []
        elif ch in " ,":
            flush()
        elif ch == "-" and num and num[-1] not in "eE":
            flush()
            num = ch
        else:
            num += ch
    flush()
    if cmd:
        parts.append((cmd, nums))
    for c, ns in parts:
        if c in "HV":
            ns = [n + (dx if c == "H" else dy) for n in ns]
        elif c != "Z":
            ns = [n + (dx if i % 2 == 0 else dy) for i, n in enumerate(ns)]
        out.append(c + " ".join(f"{n:.2f}".rstrip("0").rstrip(".") for n in ns))
    return "".join(out)


def lockup(layers, pad):
    """layers: list of (role, d, bounds). Returns viewBox-normalised layers and size."""
    b = union(*[l[2] for l in layers])
    x0, y0 = b[0] - pad, b[1] - pad
    w, h = b[2] - b[0] + 2 * pad, b[3] - b[1] + 2 * pad
    return {"w": round(w, 1), "h": round(h, 1), "layers": [{"role": r, "d": shift(d, -x0, -y0)} for r, d, _ in layers]}


# The swash under "Local": a brush stroke, thick in the middle and tapering at both ends.
def swash(x0, x1, y0, y1, belly=8):
    w = x1 - x0
    d = (f"M{x0:.1f} {y0:.1f}C{x0 + .29 * w:.1f} {y0 + 10 + belly:.1f} {x0 + .72 * w:.1f} {y0 + 8 + belly:.1f} {x1:.1f} {y1:.1f}"
         f"C{x0 + .72 * w:.1f} {y0 + 6:.1f} {x0 + .29 * w:.1f} {y0 + 10:.1f} {x0:.1f} {y0:.1f}Z")
    return d, (x0, min(y0, y1), x1, y0 + 10 + belly)


def stacked():
    """Primary logo: tilted script over a slab line, as painted on a service truck door."""
    sh, sb, _ = text(SCRIPT, "Local", 112, 215, 123, "middle", rotate=-6, origin=(215, 105))
    lo, lb, _ = text(SCRIPT, "Local", 112, 210, 118, "middle", rotate=-6, origin=(210, 100))
    sw, swb = swash(78, 358, 136, 114)
    w1, b1, a1 = text(SLAB, "WATER ", 42, 0, 190, tracking=1)
    am, b2, a2 = text(SLAB, "&", 42, 0, 190)
    w3, b3, a3 = text(SLAB, " MOLD", 42, 0, 190, tracking=1)
    left = 210 - (a1 + a2 + a3 + 2) / 2
    w1, b1, _ = text(SLAB, "WATER ", 42, left, 190, tracking=1)
    am, b2, _ = text(SLAB, "&", 42, left + a1 + 1, 190)
    w3, b3, _ = text(SLAB, " MOLD", 42, left + a1 + a2 + 2, 190, tracking=1)
    return [("shade", sh, sb), ("red", lo, lb), ("red", sw, swb), ("ink", w1, b1), ("red", am, b2), ("ink", w3, b3)]


def horizontal():
    """Header logo: the same script and slab side by side, so the slab stays readable at 40px tall."""
    sh, sb, adv = text(SCRIPT, "Local", 100, 4, 104, rotate=-6, origin=(0, 80))
    lo, lb, _ = text(SCRIPT, "Local", 100, 0, 100, rotate=-6, origin=(0, 80))
    right = max(lb[2], sb[2]) + 10
    w, wb, _ = text(SLAB, "WATER ", 44, right, 96, tracking=0.6)
    am, ab, aw = text(SLAB, "&", 44, wb[2] + 11, 96)
    m, mb, _ = text(SLAB, " MOLD", 44, ab[2] + 1, 96, tracking=0.6)
    sw, swb = swash(lb[0] + 4, right + 40, 113, 102, belly=11)
    return [("shade", sh, sb), ("red", lo, lb), ("red", sw, swb), ("ink", w, wb), ("red", am, ab), ("ink", m, mb)]


def mark(size=512):
    """App icon and favicon: a cream script L with a navy shade on truck red. Sized for a 16px tab."""
    s = size / 512
    sh, sb, _ = text(SCRIPT, "L", 400 * s, 270 * s, 404 * s, "middle", rotate=-6, origin=(256 * s, 256 * s))
    lo, lb, _ = text(SCRIPT, "L", 400 * s, 252 * s, 386 * s, "middle", rotate=-6, origin=(238 * s, 238 * s))
    # Centre the letter and its shade together.
    b = union(sb, lb)
    dx, dy = size / 2 - (b[0] + b[2]) / 2, size / 2 - (b[1] + b[3]) / 2
    return [("shade", shift(sh, dx, dy)), ("cream", shift(lo, dx, dy))]


FILL = {"shade": INK, "ink": INK, "red": RED, "cream": CREAM}


def svg_lockup(lk, colors=None):
    colors = {**FILL, **(colors or {})}
    paths = "".join(f'<path fill="{colors[l["role"]]}" d="{l["d"]}"/>' for l in lk["layers"])
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {lk["w"]} {lk["h"]}" '
            f'role="img" aria-label="Local Water &amp; Mold">{paths}</svg>')


def svg_mark(layers, size=512, rounded=False):
    r = f' rx="{size * 0.2:.0f}"' if rounded else ""
    # A same-colour stroke fattens the hairlines of the script so the L survives at 16px.
    paths = "".join(f'<path fill="{FILL[role]}" stroke="{FILL[role]}" stroke-width="{size * 0.03:.0f}" '
                    f'stroke-linejoin="round" d="{d}"/>' for role, d in layers)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}">'
            f'<rect width="{size}" height="{size}"{r} fill="{RED}"/>{paths}</svg>')


def png(svg, width, height=None):
    data = resvg_py.svg_to_bytes(svg_string=svg, width=width, height=height, skip_system_fonts=True)
    return Image.open(io.BytesIO(bytes(data))).convert("RGBA")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    st = lockup(stacked(), 6)
    hz = lockup(horizontal(), 4)
    mk = mark()
    (DATA / "brand.json").write_text(json.dumps({"stacked": st, "horizontal": hz}, indent=1) + "\n", encoding="utf-8")

    (PUBLIC / "logo.svg").write_text(svg_lockup(st) + "\n", encoding="utf-8")
    # Google shows the Organization logo on white, and wants it square-friendly and at least 112px.
    logo = Image.new("RGBA", (600, 600), WHITE)
    art = png(svg_lockup(st), 520)
    logo.alpha_composite(art, ((600 - art.width) // 2, (600 - art.height) // 2))
    logo.convert("RGB").save(PUBLIC / "logo.png", optimize=True)

    (PUBLIC / "favicon.svg").write_text(svg_mark(mk, rounded=True) + "\n", encoding="utf-8")
    square = svg_mark(mk)
    big = png(square, 512)
    big.convert("RGB").save(PUBLIC / "icon-512.png", optimize=True)
    png(square, 192).convert("RGB").save(PUBLIC / "icon-192.png", optimize=True)
    png(square, 180).convert("RGB").save(PUBLIC / "apple-touch-icon.png", optimize=True)
    # Google Search asks for a favicon that is a multiple of 48px square.
    png(square, 96).convert("RGB").save(PUBLIC / "favicon-96x96.png", optimize=True)
    big.save(PUBLIC / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])

    # Lockups for the share images: navy-ink on paper, and cream-ink for dark backgrounds.
    png(svg_lockup(hz), 900).save(OUT / "horizontal.png")
    png(svg_lockup(hz, {"ink": CREAM, "shade": "#0b131c"}), 900).save(OUT / "horizontal-dark.png")
    png(svg_lockup(st), 900).save(OUT / "stacked.png")

    # Contact sheet to eyeball every size at once.
    sheet = Image.new("RGBA", (1100, 640), "#fbf8f3")
    sheet.alpha_composite(png(svg_lockup(st), 420), (30, 30))
    sheet.alpha_composite(png(svg_lockup(hz), 480), (520, 40))
    sheet.alpha_composite(png(svg_lockup(hz), height=40, width=None), (520, 200))
    dark = Image.new("RGBA", (520, 80), "#0e151c")
    dark.alpha_composite(png(svg_lockup(hz, {"ink": CREAM, "shade": "#000000", "red": "#e5574a"}), height=40, width=None), (14, 20))
    sheet.alpha_composite(dark, (520, 260))
    x = 30
    for s in (180, 96, 48, 32, 16):
        sheet.alpha_composite(png(svg_mark(mk, rounded=True), s), (x, 420))
        x += s + 24
    sheet.save(OUT / "sheet.png")
    print("brand files written; horizontal", hz["w"], "x", hz["h"], "stacked", st["w"], "x", st["h"])


if __name__ == "__main__":
    main()
