# python -I scripts/pcpb/build_catalogue.py
# Builds lib/pcpbData.generated.json from the PCPB register snapshot and the
# label rates read from the PCPB-approved label PDFs.
#
#   register_crops_2026-08-24.json  official register (pcpb.go.ke/crops/), fetched 26 Oct 2026
#   label_rates.json                rates quoted from label PDFs (never typed from memory)
#
# Rules enforced here (Tassel handoff, section 1):
#   - only products in the register;
#   - actives withdrawn or restricted by PCPB in June 2025 are dropped;
#   - products the register marks "not for open field" / greenhouse-only are dropped;
#   - a product shows a rate only when label_rates.json quotes it.
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REGISTER = ROOT / 'scripts/pcpb/register_crops_2026-08-24.json'
LABELS = ROOT / 'scripts/pcpb/label_rates.json'
OUT = ROOT / 'lib/pcpbData.generated.json'

# June 2025 PCPB review: withdrawn, or restricted to non-open-field / non-food use.
RESTRICTED_ACTIVES = ['chlorothalonil', 'chlorpyrifos', 'dimethoate', 'imidacloprid', 'abamectin', 'iprodione', 'carbofuran']
NOT_OPEN_FIELD = re.compile(r'not\s+for\s+(use\s+)?(in|on)?\s*open\s+field|greenhouses?\s+only|only\s+in\s+greenhouses?', re.I)

CROPS = {
    'maize': r'maize|\bcorn\b',
    'tomato': r'tomato',
    'potato': r'potato',
    'beans': r'\bbeans?\b',
    'wheat': r'wheat',
    'cabbage': r'cabbage|brassica',
    'kale': r'\bkale|sukuma|collard|brassica',
    'onion': r'onion',
    'capsicum': r'capsicum|sweet pepper|chill?ies|chilli',
    'cassava': r'cassava',
    'banana': r'banana',
    'avocado': r'avocado',
    'coffee': r'coffee',
    'tea': r'\btea\b',
    'sorghum': r'sorghum',
    'millet': r'millet',
    'rice': r'\brice\b',
    'sugarcane': r'sugar ?cane',
    'mango': r'mango',
    'citrus': r'citrus|orange|lemon',
    'cashew': r'cashew',
    'cotton': r'cotton',
    'cucumber': r'cucumber|cucurbit',
    'pumpkin': r'pumpkin|squash|cucurbit',
    'eggplant': r'egg ?plant|brinjal',
}

# Problem families, matched inside the same clause as the crop.
PROBLEMS = {
    'late_blight': r'late\s*blight|phytophthora',
    'early_blight': r'early\s*blight|alternaria',
    'rust': r'\brusts?\b',
    'leaf_spot': r'leaf\s*spot|leafspot|cercospora|septoria|ascochyta|anthracnose|leaf\s*blight|blotch',
    'powdery_mildew': r'powdery\s*mildew',
    'downy_mildew': r'downy\s*mildew',
    'cbd': r'coffee\s*berry\s*disease|\bcbd\b',
    'bacterial': r'bacterial',
    'blast': r'\bblast\b',
    'faw': r'fall\s*army\s*worms?|frugiperda',
    'stalk_borer': r'stalk\s*borers?|stem\s*borers?',
    'tuta': r'tuta',
    'caterpillar': r'caterpillars?|bollworms?|helicoverpa|diamond\s*ba?c?k\s*moth|diamond\s*black\s*moth|\bdbm\b|spodoptera|loopers?|cutworms?|army\s*worms?',
    'aphids': r'aphids?',
    'whiteflies': r'white\s*fl(y|ies)',
    'thrips': r'thrips',
    'mites': r'mites?\b',
    'bean_fly': r'bean\s*fl(y|ies)',
    'weevils': r'weevils?',
    'leafminer': r'leaf\s*miners?',
    'broadleaf_weeds': r'broad[\s-]*lea(f|ved)',
    'grass_weeds': r'grass(es)?\b|grass\s*weeds',
}


def kind_of(uses: str) -> str:
    u = uses.lower()
    if 'herbicide' in u:
        return 'herbicide'
    if 'fungicide' in u or 'bactericide' in u:
        return 'fungicide'
    if re.search(r'insecticide|miticide|acaricide', u):
        return 'insecticide'
    return 'other'


def clean(s: str) -> str:
    return re.sub(r'\s+', ' ', s or '').strip()


def snippet(pattern: str, text: str, n: int = 90) -> str | None:
    m = re.search(pattern, text, re.I)
    if not m:
        return None
    return clean(text[m.start(): m.start() + n])


def drive_id(url: str) -> str | None:
    m = re.search(r'/d/([^/?]+)', url or '') or re.search(r'[?&]id=([^&]+)', url or '')
    return m.group(1) if m else None


FORMULATION = r'(SC|EC|WP|WG|WDG|SL|SE|ZC|CS|OD|SP|EW|AS|ME|FS|GR|DC|SG|WSP|CB|DP|UL|EO|SG|SPG|FC|MZ)'


def display_name(name: str) -> str:
    """'AMPLIGO 150 ZC Mixed formulation of ...' -> 'Ampligo 150 ZC'."""
    m = re.match(r'^(.*?\b' + FORMULATION + r')\b', name)
    short = m.group(1) if m and len(m.group(1)) >= 4 else name
    short = re.split(r'\s+(Suspension|Emulsifiable|Emulsion|Wettable|Water|Soluble|Capsule|Granules?|Oil|Dispersible|Mixed|Micro)\b', short)[0]
    words = []
    for w in short.split():
        if re.fullmatch(FORMULATION, w) or re.search(r'\d', w) or len(w) <= 2:
            words.append(w.upper() if re.fullmatch(FORMULATION, w) else w)
        else:
            words.append(w.capitalize())
    return ' '.join(words)[:40]


def norm_reg(s: str) -> str:
    return re.sub(r'\s+', '', s).upper()


def check_label(p: dict) -> list[str]:
    """Label figures must agree with each other: perHa ~= perTank20 * (water/20)."""
    errs = []
    for u in p['uses']:
        if u['crop'] not in CROPS:
            errs.append(f"{p['name']}: unknown crop {u['crop']}")
        if u['problem'] not in PROBLEMS:
            errs.append(f"{p['name']}: unknown problem {u['problem']}")
        if not u.get('quote'):
            errs.append(f"{p['name']} {u['crop']}: missing quote")
        if not (u.get('perTank20') or u.get('perHa')):
            errs.append(f"{p['name']} {u['crop']}: no rate")
        pt, ph, w = u.get('perTank20'), u.get('perHa'), u.get('waterPerHa')
        if pt and ph and w:
            to_base = {'mL': 1, 'g': 1, 'L': 1000, 'kg': 1000}
            implied = pt['max'] * to_base[pt['unit']] * w / 20
            stated = ph['max'] * to_base[ph['unit']]
            if abs(implied - stated) / stated > 0.15:
                errs.append(f"{p['name']} {u['crop']}: perTank20 x water/20 = {implied:.0f} but perHa = {stated:.0f}")
    return errs


def main() -> int:
    reg = json.loads(REGISTER.read_text(encoding='utf-8'))
    labels = json.loads(LABELS.read_text(encoding='utf-8'))
    label_by_reg = {norm_reg(p['regNo']): p for p in labels['products']}
    unverified = {norm_reg(p['regNo']) for p in labels['unverified']}

    errors = [e for p in labels['products'] for e in check_label(p)]

    products = []
    dropped = {'restricted': 0, 'not_open_field': 0, 'no_app_crop': 0}
    for r in reg['rows']:
        name, regno, active, uses = clean(r['productname']), clean(r['regno']), clean(r['activeingredient']), clean(r['registereduses'])
        if any(a in active.lower() for a in RESTRICTED_ACTIVES):
            dropped['restricted'] += 1
            continue
        if NOT_OPEN_FIELD.search(uses):
            dropped['not_open_field'] += 1
            continue
        # Pair crops with problems clause by clause ("X in maize; Y in tomatoes").
        pairs = set()
        crops = set()
        for clause in re.split(r';|\.\s', uses):
            cs = [c for c, pat in CROPS.items() if re.search(pat, clause, re.I)]
            ps = [k for k, pat in PROBLEMS.items() if re.search(pat, clause, re.I)]
            crops.update(cs)
            pairs.update(f'{c}:{k}' for c in cs for k in ps)
        if not crops:
            dropped['no_app_crop'] += 1
            continue
        item = {
            'n': name,
            'd': display_name(name),
            'r': regno,
            'a': active,
            'k': kind_of(uses),
            'c': sorted(crops),
            'p': sorted(pairs),
            'u': uses,
            'l': drive_id(r.get('label_href', '')) or (r.get('label_href') or None),
        }
        phi = snippet(r'PHI', uses)
        rei = snippet(r'REI|re-?entry', uses, 40)
        who = re.search(r'WHO\s*Class\s*(Ia|Ib|II|III|U)\b', uses, re.I)
        if phi:
            item['phi'] = phi
        if rei:
            item['rei'] = rei
        if who:
            item['who'] = who.group(1).upper() if who.group(1).upper() != 'U' else 'U'
        lab = label_by_reg.get(norm_reg(regno))
        if lab:
            item['d'] = lab['name']
            item['lab'] = {k: v for k, v in lab.items() if k not in ('regNo', 'name')}
            label_by_reg.pop(norm_reg(regno))
        if norm_reg(regno) in unverified:
            item['unv'] = True
        products.append(item)

    for missing in label_by_reg.values():
        errors.append(f"label_rates.json product not found in the open-field register: {missing['name']} {missing['regNo']}")

    if errors:
        print('ERRORS:\n  ' + '\n  '.join(errors))
        return 1

    products.sort(key=lambda p: p['n'].lower())
    out = {
        'source': reg['source'],
        'table': reg['table'],
        'fetched': reg['fetched'],
        'labelsCheckedOn': labels['checkedOn'],
        'restrictedActives': RESTRICTED_ACTIVES,
        'products': products,
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    with_label = sum(1 for p in products if 'lab' in p)
    print(f'{len(products)} products written ({with_label} with label rates); dropped {dropped}; {OUT.stat().st_size // 1024} KB')
    return 0


if __name__ == '__main__':
    sys.exit(main())
