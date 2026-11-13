"""Browse Wikimedia Commons categories for openly licensed photos (13 Nov 2026).

  python scripts/photos/browse_categories.py <out folder> "Category:Agriculture in Kenya" [...]

Same licence rule as find_candidates.py (CC0, public domain, CC BY, CC BY-SA; never NC/ND).
Writes numbered contact sheets (20 per sheet) and browse.json with every file's metadata.
"""
import io, json, re, sys, time, urllib.parse, urllib.request
from pathlib import Path

from PIL import Image, ImageDraw

OUT = Path(sys.argv[1])
OUT.mkdir(parents=True, exist_ok=True)
CATS = sys.argv[2:]
UA = "TasselStoryPhotos/1.0 (KSEF 2027 student project; github.com/maneziezra/Tassel) Python-urllib"
API = "https://commons.wikimedia.org/w/api.php"
OK_LICENCE = re.compile(r"^(cc0|public domain|pd\b|pdm|cc[- ]by(-sa)? ?[1-4]\.\d|cc[- ]by(-sa)?$)", re.I)
BAD = re.compile(r"\bnc\b|\bnd\b|non-?commercial|no-?deriv", re.I)


def get(params):
    url = API + "?" + urllib.parse.urlencode({**params, "format": "json", "formatversion": "2"})
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    for i in range(5):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.load(r)
        except Exception as e:  # noqa: BLE001
            print("  retry", e, flush=True)
            time.sleep(4 * (i + 1))
    return {}


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    for i in range(4):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.read()
        except Exception as e:  # noqa: BLE001
            time.sleep(4 * (i + 1))
            err = e
    raise err


def strip(html):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", html or "")).strip()


items, seen = [], set()
for cat in CATS:
    cont = {}
    while True:
        data = get(dict(action="query", generator="categorymembers", gcmtitle=cat, gcmtype="file", gcmlimit=50,
                        prop="imageinfo", iiprop="url|size|extmetadata|mime", iiurlwidth=250, **cont))
        for p in data.get("query", {}).get("pages", []):
            ii = (p.get("imageinfo") or [{}])[0]
            md = ii.get("extmetadata", {})
            lic = strip(md.get("LicenseShortName", {}).get("value", ""))
            terms = strip(md.get("UsageTerms", {}).get("value", ""))
            if p["title"] in seen or ii.get("mime") != "image/jpeg":
                continue
            if not OK_LICENCE.search(lic) or BAD.search(lic + " " + terms) or ii.get("width", 0) < 900:
                continue
            seen.add(p["title"])
            items.append(dict(title=p["title"], page=ii.get("descriptionurl"), thumb=ii.get("thumburl"), url=ii.get("url"),
                              width=ii.get("width"), height=ii.get("height"), licence=lic,
                              licence_url=strip(md.get("LicenseUrl", {}).get("value", "")),
                              artist=strip(md.get("Artist", {}).get("value", "")),
                              restrictions=strip(md.get("Restrictions", {}).get("value", "")),
                              description=strip(md.get("ImageDescription", {}).get("value", ""))[:300], category=cat))
        if "continue" not in data or len(items) > 400:
            break
        cont = {k: v for k, v in data["continue"].items()}
        time.sleep(1)
    print(cat, len(items), flush=True)

(OUT / "browse.json").write_text(json.dumps(items, indent=1), encoding="utf-8")
for s in range(0, len(items), 20):
    sheet = Image.new("RGB", (5 * 270, 4 * 230), "white")
    d = ImageDraw.Draw(sheet)
    for j, it in enumerate(items[s:s + 20]):
        try:
            im = Image.open(io.BytesIO(fetch(it["thumb"]))).convert("RGB")
            im.thumbnail((262, 196))
            x, y = (j % 5) * 270 + 4, (j // 5) * 230 + 4
            sheet.paste(im, (x, y))
            d.rectangle([x, y, x + 40, y + 22], fill="black")
            d.text((x + 6, y + 5), str(s + j), fill="yellow")
            d.text((x, y + 199), it["title"][5:48], fill="black")
            d.text((x, y + 212), it["licence"][:30], fill="gray")
        except Exception as e:  # noqa: BLE001
            it["preview_error"] = str(e)
        time.sleep(0.3)
    sheet.save(OUT / f"browse_{s // 20:02d}.jpg", quality=80)
    print("sheet", s // 20, flush=True)
print("DONE", len(items))
