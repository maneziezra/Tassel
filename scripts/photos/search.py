import io, json, re, sys, time, urllib.parse, urllib.request
from pathlib import Path
from PIL import Image, ImageDraw

UA = "TasselStoryPhotos/1.0 (KSEF 2027 student project; github.com/maneziezra/Tassel) Python-urllib"
API = "https://commons.wikimedia.org/w/api.php"
OK = re.compile(r"^(cc0|public domain|pd\b|pdm|cc[- ]by(-sa)? ?[1-4]\.\d|cc[- ]by(-sa)?$)", re.I)
BAD = re.compile(r"\bnc\b|\bnd\b|non-?commercial|no-?deriv", re.I)
out, queries = Path(sys.argv[1]), sys.argv[2:]
strip = lambda h: re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", h or "")).strip()


def get(params):
    url = API + "?" + urllib.parse.urlencode({**params, "format": "json", "formatversion": "2"})
    for i in range(5):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=30) as r:
                return json.load(r)
        except Exception:  # noqa: BLE001
            time.sleep(5 * (i + 1))
    return {}


items, seen = [], set()
LIMIT = 40 if queries and queries[0] == "--many" else 20
queries = [q for q in queries if q != "--many"]
for q, off in [(q, o) for q in queries for o in ((0, 50) if LIMIT == 40 else (0,))]:
    data = get(dict(action="query", generator="search", gsrsearch=f"filetype:bitmap {q}", gsrnamespace=6, gsrlimit=50 if LIMIT == 40 else 25,
                    gsroffset=off, prop="imageinfo", iiprop="url|size|extmetadata|mime", iiurlwidth=250))
    for p in data.get("query", {}).get("pages", []):
        ii = (p.get("imageinfo") or [{}])[0]
        md = ii.get("extmetadata", {})
        lic = strip(md.get("LicenseShortName", {}).get("value", ""))
        if p["title"] in seen or ii.get("mime") != "image/jpeg" or ii.get("width", 0) < 900:
            continue
        if not OK.search(lic) or BAD.search(lic + " " + strip(md.get("UsageTerms", {}).get("value", ""))):
            continue
        desc = strip(md.get("ImageDescription", {}).get("value", ""))
        if re.search(r"\bmap\b|catalogue|patent|illustration|diagram", p["title"] + desc, re.I):
            continue
        seen.add(p["title"])
        items.append(dict(title=p["title"], thumb=ii.get("thumburl"), licence=lic, w=ii.get("width"), h=ii.get("height"),
                          artist=strip(md.get("Artist", {}).get("value", ""))[:50], desc=desc[:200], q=q))
    time.sleep(2)
items = items[:LIMIT]
sheet = Image.new("RGB", (5 * 270, (LIMIT // 5) * 230), "white")
d = ImageDraw.Draw(sheet)
for j, it in enumerate(items):
    try:
        req = urllib.request.Request(it["thumb"], headers={"User-Agent": UA})
        im = Image.open(io.BytesIO(urllib.request.urlopen(req, timeout=60).read())).convert("RGB")
        im.thumbnail((262, 196))
        x, y = (j % 5) * 270 + 4, (j // 5) * 230 + 4
        sheet.paste(im, (x, y))
        d.rectangle([x, y, x + 30, y + 22], fill="black")
        d.text((x + 6, y + 5), str(j), fill="yellow")
        d.text((x, y + 199), it["title"][5:48], fill="black")
        d.text((x, y + 212), it["licence"], fill="gray")
    except Exception as e:  # noqa: BLE001
        it["err"] = str(e)
    time.sleep(0.5)
sheet.save(out.with_suffix(".jpg"), quality=80)
out.with_suffix(".json").write_text(json.dumps(items, indent=1), encoding="utf-8")
print("DONE", len(items))
