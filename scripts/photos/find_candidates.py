"""Find openly licensed photos for the story scenes (13 Nov 2026).

Searches Wikimedia Commons for each scene kind, keeps only licences an app can use without
asking (CC0, public domain, CC BY, CC BY-SA; never NC or ND), downloads small previews and
draws one numbered contact sheet per kind so a person can pick. Writes candidates.json with
author, licence and source page for every candidate.

  python scripts/photos/find_candidates.py <out folder> [kind ...]
"""
import io, json, re, sys, time, urllib.parse, urllib.request
from pathlib import Path

from PIL import Image, ImageDraw

OUT = Path(sys.argv[1])
OUT.mkdir(parents=True, exist_ok=True)
ONLY = set(sys.argv[2:])
UA = "TasselStoryPhotos/1.0 (KSEF 2027 student project; github.com/maneziezra/Tassel) Python-urllib"
API = "https://commons.wikimedia.org/w/api.php"

QUERIES = {
    "weed": ["weeding maize Kenya", "farmer weeding hoe Africa", "weeding field Tanzania"],
    "topdress": ["applying fertilizer maize Africa", "fertilizer application farmer Kenya", "top dressing maize"],
    "spray": ["knapsack sprayer farmer", "farmer spraying crop Kenya", "spraying pesticide farmer Africa"],
    "water": ["watering vegetables Kenya", "drip irrigation farm Kenya", "watering can garden Africa"],
    "harvest": ["maize harvest Kenya", "harvesting maize farmer Africa", "harvesting beans Africa"],
    "dry": ["drying maize Kenya", "drying grain tarpaulin", "sun drying beans Africa"],
    "store": ["hermetic bag grain storage", "maize storage bags Kenya", "grain store Africa sacks"],
    "scout": ["farmer inspecting maize leaves", "fall armyworm maize scouting", "farmer examining crop leaves"],
    "remove": ["uprooting diseased plants", "cassava roguing", "removing infected plants farm"],
    "stake": ["staking tomato plants", "tomato trellis farm", "pruning tomato plants"],
    "prepare": ["ploughing oxen Kenya", "land preparation hoe Africa", "tilling field farmer Kenya"],
    "earthup": ["earthing up potatoes", "hilling potatoes", "potato ridges field"],
    "transplant": ["transplanting seedlings Africa", "vegetable nursery seedlings Kenya", "seedling trays nursery"],
    "net": ["insect net vegetables", "shade net nursery Kenya", "net house vegetables Africa"],
    "seedtreat": ["seed treatment maize", "certified seed maize Kenya", "treated seed beans"],
    "sort": ["sorting beans Africa", "sorting grain women Africa", "sorting coffee beans Kenya"],
    "mix": ["mixing pesticide sprayer", "measuring pesticide farmer", "knapsack sprayer filling water"],
    "grow": ["maize field Kenya", "smallholder farm Kenya", "healthy maize crop Africa"],
}
if len(sys.argv) > 2 and sys.argv[2].endswith(".json"):   # a second round of search words: <out> <queries.json>
    QUERIES = json.loads(Path(sys.argv[2]).read_text(encoding="utf-8"))
    ONLY = set()
OK_LICENCE = re.compile(r"^(cc0|public domain|pd\b|pdm|cc[- ]by(-sa)? ?[1-4]\.\d|cc[- ]by(-sa)?$)", re.I)
BAD = re.compile(r"\bnc\b|\bnd\b|non-?commercial|no-?deriv", re.I)


def get(params):
    url = API + "?" + urllib.parse.urlencode({**params, "format": "json", "formatversion": "2"})
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    for i in range(4):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.load(r)
        except Exception as e:  # noqa: BLE001
            print("  retry", e, flush=True)
            time.sleep(3 * (i + 1))
    return {}


def strip(html):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", html or "")).strip()


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


path = OUT / "candidates.json"
cands = json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}
for kind, queries in QUERIES.items():
    if ONLY and kind not in ONLY:
        continue
    seen, items = set(), []
    for q in queries:
        data = get(dict(action="query", generator="search", gsrsearch=f"filetype:bitmap {q}", gsrnamespace=6, gsrlimit=15,
                        prop="imageinfo", iiprop="url|size|extmetadata|mime", iiurlwidth=330))
        for p in sorted(data.get("query", {}).get("pages", []), key=lambda p: p.get("index", 99)):
            ii = (p.get("imageinfo") or [{}])[0]
            md = ii.get("extmetadata", {})
            lic = strip(md.get("LicenseShortName", {}).get("value", ""))
            terms = strip(md.get("UsageTerms", {}).get("value", ""))
            if p["title"] in seen or ii.get("mime") not in ("image/jpeg", "image/png"):
                continue
            if not OK_LICENCE.search(lic) or BAD.search(lic + " " + terms):
                continue
            if ii.get("width", 0) < 900 or ii.get("height", 0) < 500:
                continue
            seen.add(p["title"])
            items.append(dict(title=p["title"], page=ii.get("descriptionurl"), thumb=ii.get("thumburl"), url=ii.get("url"),
                              width=ii.get("width"), height=ii.get("height"), licence=lic,
                              licence_url=strip(md.get("LicenseUrl", {}).get("value", "")),
                              artist=strip(md.get("Artist", {}).get("value", "")),
                              credit=strip(md.get("Credit", {}).get("value", ""))[:200],
                              description=strip(md.get("ImageDescription", {}).get("value", ""))[:300], query=q))
        time.sleep(1)
    items = items[:12]
    sheet = Image.new("RGB", (4 * 340, 3 * 300), "white")
    d = ImageDraw.Draw(sheet)
    for i, it in enumerate(items):
        try:
            im = Image.open(io.BytesIO(fetch(it["thumb"]))).convert("RGB")
            im.thumbnail((330, 250))
            x, y = (i % 4) * 340 + 5, (i // 4) * 300 + 5
            sheet.paste(im, (x, y))
            d.rectangle([x, y, x + 34, y + 26], fill="black")
            d.text((x + 8, y + 6), str(i), fill="yellow")
            d.text((x, y + 256), f"{it['licence'][:22]} | {it['title'][5:40]}", fill="black")
        except Exception as e:  # noqa: BLE001
            it["preview_error"] = str(e)
        time.sleep(0.5)
    sheet.save(OUT / f"sheet_{kind}.jpg", quality=80)
    cands[kind] = items
    print(kind, len(items), flush=True)
    path.write_text(json.dumps(cands, indent=1), encoding="utf-8")
print("DONE")
