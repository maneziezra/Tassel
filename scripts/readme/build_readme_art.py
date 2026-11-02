"""Builds the animated SVGs used by README.md into .github/assets/.

Run from the repo root:
    python -I scripts/readme/build_readme_art.py

Needs fontTools (pip install fonttools). Fonts come from node_modules
(@expo-google-fonts), subset to Latin and embedded as data URIs, because an
SVG shown as an <img> on GitHub cannot load web fonts.

Brand rules (docs/brand/brand.md): official mark only, brand colours, Archivo
Narrow for headings, Atkinson Hyperlegible for reading, no emoji, examples
labelled "Example", numbers only from the code.
"""
import base64, io, json, math, os, random, sys

from fontTools.subset import Options, Subsetter
from fontTools.ttLib import TTFont

ROOT = os.getcwd()
OUT = os.path.join(ROOT, ".github", "assets")
FONTS = os.path.join(ROOT, "node_modules", "@expo-google-fonts")

# Brand / social palette (brand.md §6)
GROUND, CREAM, GOLD, BODY, QUIET = "#101D16", "#F4F1E6", "#E2B33C", "#BAC7BE", "#8E9C93"
FIELD = "#1E3A2A"
# App palette (lib/theme.ts)
PAPER, SUNKEN, FOREST, FOREST_DK, INK, CLAY = "#F4F2EC", "#EFECE4", "#2E6A4F", "#1F4D39", "#1E2E26", "#A8472A"
LEAF, LEAF_DK = "#6E9B5A", "#557F45"

CHARS = "".join(chr(c) for c in range(32, 127)) + "·—–’“”×%"


def font_face(name, path):
    f = TTFont(path)
    opts = Options()
    opts.flavor = "woff"
    opts.layout_features = ["kern", "liga", "tnum"]
    s = Subsetter(opts)
    s.populate(text=CHARS)
    s.subset(f)
    f.flavor = "woff"
    buf = io.BytesIO()
    f.save(buf)
    b64 = base64.b64encode(buf.getvalue()).decode()
    return f"@font-face{{font-family:'{name}';src:url(data:font/woff;base64,{b64}) format('woff');}}"


def text_width(path, text, size):
    f = TTFont(path)
    cmap, hmtx, upm = f.getBestCmap(), f["hmtx"], f["head"].unitsPerEm
    return sum(hmtx[cmap[ord(ch)]][0] for ch in text) * size / upm


AH_PATH = os.path.join(FONTS, "atkinson-hyperlegible", "400Regular", "AtkinsonHyperlegible_400Regular.ttf")

FONT_CSS = "".join([
    font_face("AN", os.path.join(FONTS, "archivo-narrow", "700Bold", "ArchivoNarrow_700Bold.ttf")),
    font_face("AH", os.path.join(FONTS, "atkinson-hyperlegible", "400Regular", "AtkinsonHyperlegible_400Regular.ttf")),
    font_face("AHB", os.path.join(FONTS, "atkinson-hyperlegible", "700Bold", "AtkinsonHyperlegible_700Bold.ttf")),
])

REDUCE = "@media (prefers-reduced-motion: reduce){*{animation:none!important}}"

# The official mark, paths copied from docs/brand/tassel_mark_on_green.svg (never redrawn).
MARK_TASSEL = ("M100 30V180M100 72C84 60 62 60 46 74C38 82 36 92 38 102M100 72C116 60 138 60 154 74"
               "C162 82 164 92 162 102M100 72C93 62 88 54 86 44M100 72C107 62 112 54 114 44")
MARK_ORBIT = "M20 118C44 74 146 40 178 54"


def svg(w, h, title, css, body):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" '
            f'role="img" aria-label="{title}"><title>{title}</title>'
            f"<style>{FONT_CSS}{css}{REDUCE}</style>{body}</svg>")


def write(name, data):
    p = os.path.join(OUT, name)
    with open(p, "w", encoding="utf-8") as fh:
        fh.write(data)
    print(f"{name}: {len(data) // 1024} KB")


def mark(x, y, scale, ground, animate=True):
    """Official mark on a dark ground. animate: tassel line draws, satellite rides the orbit."""
    draw = ' pathLength="1" class="draw"' if animate else ""
    dot = (f'<circle r="8" fill="{GOLD}"><animateMotion dur="5s" repeatCount="indefinite" '
           f'keyPoints="0;1;1" keyTimes="0;.7;1" calcMode="linear" path="{MARK_ORBIT}"/></circle>'
           if animate else f'<circle cx="178" cy="54" r="8" fill="{GOLD}"/>')
    return (f'<g transform="translate({x} {y}) scale({scale})" fill="none" stroke-width="7" '
            f'stroke-linecap="round" stroke-linejoin="round">'
            f'<circle cx="138" cy="60" r="26" fill="{GOLD}" opacity=".55" stroke="none" class="sun"/>'
            f'<path d="{MARK_ORBIT}" stroke="{CREAM}" stroke-width="5" opacity=".75"{draw}/>'
            f'<path d="{MARK_TASSEL}" stroke="{ground}" stroke-width="16"/>'
            f'<path d="{MARK_TASSEL}" stroke="{CREAM}"{draw}/>{dot}</g>')


def inside(pt, poly):
    x, y = pt
    c = False
    for i in range(len(poly)):
        x1, y1 = poly[i]
        x2, y2 = poly[(i + 1) % len(poly)]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            c = not c
    return c


# ── 1. Hero ────────────────────────────────────────────────────────────────
def hero():
    W, H = 1280, 640
    poly = [(736, 112), (1180, 92), (1210, 494), (712, 522)]
    xs = [p[0] for p in poly]
    x0, x1 = min(xs), max(xs)
    cell, gap = 28, 3
    greens = ["#1F4D39", "#2E6A4F", "#3B7752", "#4C8450", "#6E9B5A", "#86AD6C"]
    rnd = random.Random(7)
    rects, cyc, sweep = [], 10, 2.6
    stress = (1090, 420)
    for gy in range(80, 540, cell):
        for gx in range(700, 1230, cell):
            cx, cy = gx + cell / 2, gy + cell / 2
            if not any(inside(c, poly) for c in ((gx, gy), (gx + cell, gy), (gx, gy + cell), (gx + cell, gy + cell))):
                continue
            v = 0.55 + 0.22 * math.sin(gx / 80) + 0.18 * math.cos(gy / 60 + gx / 150) + rnd.uniform(-.12, .12)
            col = greens[max(0, min(5, int(v * 6)))]
            cls = "c"
            d = math.dist((cx, cy), stress)
            if d < 34:
                col, cls = CLAY, "c s"
            elif d < 64:
                col = "#C9A24A"
            delay = (cx - x0) / (x1 - x0) * sweep
            rects.append(f'<rect class="{cls}" x="{gx + gap / 2}" y="{gy + gap / 2}" width="{cell - gap}" '
                         f'height="{cell - gap}" fill="{col}" style="animation-delay:{delay:.2f}s"/>')
    boundary = "M" + " L".join(f"{x} {y}" for x, y in poly) + " Z"
    css = f"""
.c{{transform-box:fill-box;transform-origin:center;animation:cell {cyc}s infinite both}}
.s{{animation:cell {cyc}s infinite both,pulse 1.6s ease-in-out infinite}}
@keyframes cell{{0%{{opacity:0;transform:scale(.4)}}5%{{opacity:1;transform:scale(1)}}84%{{opacity:1}}92%,100%{{opacity:0}}}}
@keyframes pulse{{50%{{fill:#D9734F}}}}
.sweep{{animation:sweep {cyc}s infinite linear}}
@keyframes sweep{{0%{{transform:translateX(0);opacity:1}}{sweep / cyc * 100:.0f}%{{transform:translateX({x1 - x0 + 20}px);opacity:1}}{sweep / cyc * 100 + 3:.0f}%,100%{{transform:translateX({x1 - x0 + 20}px);opacity:0}}}}
.edge{{stroke-dasharray:1;animation:edge {cyc}s infinite ease-out}}
@keyframes edge{{0%{{stroke-dashoffset:1}}22%,88%{{stroke-dashoffset:0;opacity:1}}94%,100%{{stroke-dashoffset:0;opacity:0}}}}
.draw{{stroke-dasharray:1;animation:draw 2.2s .2s ease-out both}}
@keyframes draw{{from{{stroke-dashoffset:1}}to{{stroke-dashoffset:0}}}}
.sun{{transform-box:fill-box;transform-origin:center;animation:sun 2.4s ease-out both}}
@keyframes sun{{from{{opacity:0;transform:scale(.5)}}}}
.up{{animation:up .9s cubic-bezier(.2,.7,.2,1) both}}
@keyframes up{{from{{opacity:0;transform:translateY(24px)}}}}
.an{{font-family:AN}} .ah{{font-family:AH}}
"""
    body = f"""
<rect width="{W}" height="{H}" fill="{GROUND}"/>
{mark(64, 64, 0.62, GROUND)}
<text class="an up" x="72" y="340" font-size="168" fill="{CREAM}" letter-spacing="-4" style="animation-delay:.3s">Tassel</text>
<text class="an up" x="78" y="404" font-size="40" fill="{GOLD}" style="animation-delay:.45s">Kagua kwanza. Check first.</text>
<g class="ah up" font-size="23" fill="{BODY}" style="animation-delay:.6s">
<text x="78" y="462">Crop health for Kenyan farms. See your own field</text>
<text x="78" y="494">from space, and scan a sick leaf without data.</text></g>
<text class="ah up" x="78" y="572" font-size="18" fill="{QUIET}" style="animation-delay:.75s">Android  ·  English and Kiswahili  ·  v2.7.0</text>
<clipPath id="fld"><path d="{boundary}"/></clipPath>
<g clip-path="url(#fld)">{''.join(rects)}</g>
<path d="{boundary}" fill="none" stroke="{GOLD}" stroke-width="3.5" stroke-linejoin="round" pathLength="1" class="edge"/>
<g class="sweep"><rect x="{x0 - 46}" y="72" width="40" height="470" fill="{GOLD}" opacity=".10"/>
<rect x="{x0 - 8}" y="72" width="3" height="470" fill="{GOLD}"/></g>
<text class="ah" x="712" y="574" font-size="16" fill="{QUIET}">Example field. Each square is 10 m of ground, as Sentinel-2 sees it.</text>
"""
    write("hero.svg", svg(W, H, "Tassel. Kagua kwanza, check first. Crop health for Kenyan farms.", css, body))


# ── 2. Two pillars ─────────────────────────────────────────────────────────
def pillar_scan():
    W, H = 620, 460
    css = """
.an{font-family:AN}.ah{font-family:AH}.ahb{font-family:AHB}
.frame{transform-box:fill-box;transform-origin:center;animation:breathe 2.4s ease-in-out infinite}
@keyframes breathe{50%{transform:scale(1.04)}}
.line{animation:scan 6s infinite ease-in-out}
@keyframes scan{0%{transform:translateY(0);opacity:0}6%{opacity:1}40%{transform:translateY(176px);opacity:1}46%,100%{transform:translateY(176px);opacity:0}}
.chip{animation:chip 6s infinite cubic-bezier(.2,.7,.2,1)}
@keyframes chip{0%,44%{opacity:0;transform:translateY(14px)}52%,92%{opacity:1;transform:translateY(0)}100%{opacity:0}}
.spot{transform-box:fill-box;transform-origin:center;animation:spot 6s infinite}
@keyframes spot{0%,40%{opacity:.85}46%{opacity:1;transform:scale(1.25)}54%,100%{opacity:.85;transform:scale(1)}}
"""
    leaf = ("M310 190 C370 205 420 250 430 300 C400 340 340 356 300 350 C250 342 205 300 196 250 "
            "C232 214 266 192 310 190 Z")
    veins = ("M206 252 C280 268 360 290 428 300 M260 214 C282 238 300 262 318 282 M330 196 C340 228 352 258 362 288 "
             "M236 302 C270 296 300 290 330 288 M300 348 C320 330 340 312 360 296")
    corners = "M178 186v-22h22M440 164h22v22M462 352v22h-22M200 374h-22v-22"
    body = f"""
<rect width="{W}" height="{H}" fill="{PAPER}"/>
<text class="an" x="40" y="74" font-size="50" fill="{INK}" letter-spacing="-1">Scan a leaf.</text>
<text class="ah" x="40" y="112" font-size="20" fill="{INK}">Works without data. The model runs on the phone.</text>
<path d="{leaf}" fill="{LEAF}" stroke="{LEAF_DK}" stroke-width="4"/>
<path d="{veins}" fill="none" stroke="{LEAF_DK}" stroke-width="3" stroke-linecap="round"/>
<g fill="{CLAY}"><circle class="spot" cx="356" cy="246" r="11"/><circle class="spot" cx="384" cy="282" r="7"/><circle class="spot" cx="262" cy="292" r="8"/></g>
<path class="frame" d="{corners}" fill="none" stroke="{FOREST_DK}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
<rect class="line" x="186" y="180" width="268" height="4" rx="2" fill="{GOLD}"/>
<g class="chip"><rect x="40" y="394" width="300" height="44" rx="22" fill="#F6E3DC"/>
<text class="ahb" x="62" y="423" font-size="19" fill="{CLAY}">Late blight  ·  Sure  ·  Example</text></g>
<text class="ah" x="580" y="423" font-size="16" fill="#5E6B64" text-anchor="end">Under 75% it says “Not sure”.</text>
"""
    write("pillar-scan.svg", svg(W, H, "Scan a leaf. Works without data. Under 75 percent confidence it says Not sure.", css, body))


def pillar_rules():
    W, H = 620, 460
    data = json.load(open(os.path.join(ROOT, "lib", "pcpbData.generated.json"), encoding="utf-8"))
    n = len(data["products"])
    actives = data["restrictedActives"]
    rows = []
    for i, a in enumerate(actives):
        y = 196 + i * 33
        d = 0.5 + i * 0.22
        rows.append(f'<g><text class="ah" x="40" y="{y}" font-size="21" fill="{CREAM}">{a.capitalize()}</text>'
                    f'<rect class="strike" x="38" y="{y - 7}" width="{text_width(AH_PATH, a.capitalize(), 21) + 6:.0f}" height="2.5" fill="{GOLD}" style="animation-delay:{d:.2f}s"/>'
                    f'<text class="ah out" x="580" y="{y}" font-size="17" fill="{BODY}" text-anchor="end" style="animation-delay:{d + .25:.2f}s">Kept out</text></g>')
    css = """
.an{font-family:AN}.ah{font-family:AH}
.strike{transform-box:fill-box;transform-origin:left;animation:strike 7s infinite cubic-bezier(.6,0,.2,1)}
@keyframes strike{0%{transform:scaleX(0)}8%,88%{transform:scaleX(1)}96%,100%{transform:scaleX(0)}}
.out{animation:out 7s infinite}
@keyframes out{0%{opacity:0}6%,88%{opacity:1}96%,100%{opacity:0}}
"""
    body = f"""
<rect width="{W}" height="{H}" fill="{FIELD}"/>
<text class="an" x="40" y="74" font-size="50" fill="{CREAM}" letter-spacing="-1">Follows Kenyan rules.</text>
<text class="ah" x="40" y="112" font-size="19" fill="{CREAM}">{n:,} registered products for its crops. Doses only from the label.</text>
<text class="ah" x="40" y="150" font-size="16" fill="{BODY}">Restricted by PCPB in 2025:</text>
{''.join(rows)}
<text class="ah" x="40" y="436" font-size="15" fill="{BODY}">Source: PCPB register, read {data['fetched']}.</text>
"""
    write("pillar-rules.svg", svg(W, H, f"Follows Kenyan rules. {n} PCPB registered products. Seven actives restricted in 2025 are kept out.", css, body))


# ── 3. Screens strip (real screenshots from the phone, 29 Oct build) ───────
def screens():
    shots = [
        ("after-home-today.jpg", "Today, at a glance"),
        ("after-field-health.jpg", "Your field from space"),
        ("after-result-dev-sick.jpg", "A scan result"),
        ("after-advisory-spacing.jpg", "Planting, shown"),
        ("after-p2-pesticide-calc.jpg", "Spray calculator"),
    ]
    W, H = 1280, 640
    pw, gapx, pad = 196, 38, 7
    sh = int(pw * (800 - 34) / 360)          # status bar cropped off
    x = (W - (5 * (pw + 2 * pad) + 4 * gapx)) / 2
    items = []
    for i, (f, cap) in enumerate(shots):
        p = os.path.join(ROOT, "docs", "redesign", "shots", f)
        b64 = base64.b64encode(open(p, "rb").read()).decode()
        top = 70 + (0 if i % 2 == 0 else 30)
        full_h = int(pw * 800 / 360)
        crop = int(pw * 34 / 360)
        items.append(f"""
<g class="ph" style="animation-delay:{i * .12:.2f}s,{i * .6:.1f}s">
<rect x="{x:.0f}" y="{top}" width="{pw + 2 * pad}" height="{sh + 2 * pad}" rx="30" fill="{GROUND}"/>
<clipPath id="k{i}"><rect x="{x + pad:.0f}" y="{top + pad}" width="{pw}" height="{sh}" rx="23"/></clipPath>
<image clip-path="url(#k{i})" x="{x + pad:.0f}" y="{top + pad - crop}" width="{pw}" height="{full_h}" href="data:image/jpeg;base64,{b64}"/>
<text class="an" x="{x + pad + pw / 2:.0f}" y="{top + sh + 2 * pad + 40}" font-size="24" fill="{INK}" text-anchor="middle">{cap}</text>
</g>""")
        x += pw + 2 * pad + gapx
    css = """
.an{font-family:AN}
.ph{animation:rise 1s cubic-bezier(.2,.7,.2,1) both,float 6s ease-in-out infinite}
@keyframes rise{from{opacity:0;transform:translateY(40px)}}
@keyframes float{50%{transform:translateY(-8px)}}
"""
    body = f'<rect width="{W}" height="{H}" fill="{SUNKEN}"/>' + "".join(items)
    write("screens.svg", svg(W, H, "Five screens from Tassel 2.7: Today, your field from space, a scan result, planting shown as a picture, and the spray calculator.", css, body))


# ── 4. Footer: a row of maize in the wind ─────────────────────────────────
def footer():
    W, H = 1280, 300
    rnd = random.Random(3)
    plants = []
    for i in range(13):
        bx = 580 + i * 52 + rnd.uniform(-8, 8)
        base = 262
        h = rnd.uniform(150, 210)
        top = base - h
        lean = rnd.uniform(-10, 10)
        stem = f"M{bx:.0f} {base} C{bx:.0f} {base - h * .4:.0f} {bx + lean:.0f} {top + h * .3:.0f} {bx + lean:.0f} {top:.0f}"
        leaves = []
        for k, t in enumerate((.28, .46, .64)):
            ly = base - h * t
            side = 1 if (k + i) % 2 == 0 else -1
            ln = rnd.uniform(44, 62)
            sx = bx + lean * t
            leaves.append(f"M{sx:.0f} {ly:.0f} C{sx + side * ln * .12:.0f} {ly - ln * .55:.0f} "
                          f"{sx + side * ln * .62:.0f} {ly - ln * .6:.0f} {sx + side * ln:.0f} {ly - ln * .12:.0f}")
        tx, ty = bx + lean, top
        tassel = (f"M{tx:.0f} {ty:.0f} v-22 M{tx:.0f} {ty - 4:.0f} c-6 -8 -14 -10 -20 -6 "
                  f"M{tx:.0f} {ty - 4:.0f} c6 -8 14 -10 20 -6 M{tx:.0f} {ty - 10:.0f} c-3 -8 -8 -12 -12 -14 "
                  f"M{tx:.0f} {ty - 10:.0f} c3 -8 8 -12 12 -14")
        plants.append(f'<g class="p" style="animation-delay:-{rnd.uniform(0, 4):.2f}s;animation-duration:{rnd.uniform(3.6, 5.2):.2f}s">'
                      f'<path d="{stem}" stroke="{CREAM}" stroke-width="4"/><path d="{" ".join(leaves)}" stroke="#C9D8C4" stroke-width="3"/>'
                      f'<path d="{tassel}" stroke="{GOLD}" stroke-width="3.5"/></g>')
    css = """
.an{font-family:AN}.ah{font-family:AH}
.p{transform-box:fill-box;transform-origin:50% 100%;animation:sway 4.4s ease-in-out infinite alternate}
@keyframes sway{from{transform:rotate(-2.4deg)}to{transform:rotate(2.4deg)}}
"""
    body = f"""
<rect width="{W}" height="{H}" fill="{GROUND}"/>
<rect y="262" width="{W}" height="38" fill="#1B2821"/>
<g fill="none" stroke-linecap="round" stroke-linejoin="round">{''.join(plants)}</g>
{mark(72, 46, .42, GROUND, animate=False)}
<text class="an" x="170" y="104" font-size="64" fill="{CREAM}" letter-spacing="-1.5">Tassel</text>
<text class="an" x="74" y="176" font-size="30" fill="{GOLD}">Kagua kwanza. Check first.</text>
<text class="ah" x="74" y="216" font-size="18" fill="{BODY}">Built in Eldoret, Kenya.</text>
"""
    write("footer.svg", svg(W, H, "Tassel. Kagua kwanza, check first. Built in Eldoret, Kenya.", css, body))


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    hero(); pillar_scan(); pillar_rules(); screens(); footer()
