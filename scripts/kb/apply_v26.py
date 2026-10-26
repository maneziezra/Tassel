"""Tassel v2.6.0: wire the v5 knowledge base, new crops, icons, library and methodology into the app.
Run from the app root:  python3 scripts/kb/apply_v26.py
Every replacement asserts it matched exactly once, so a second run fails loudly instead of doubling edits."""
import json, re, sys
from pathlib import Path

ROOT = Path.cwd()
HERE = Path(__file__).parent
sys.path.insert(0, str(HERE))
from new_icons import ICONS, MATCH  # noqa: E402

CHANGED = []


def rep(rel, old, new, count=1):
    p = ROOT / rel
    s = p.read_text(encoding='utf-8')
    n = s.count(old)
    if n != count:
        sys.exit(f'{rel}: expected {count} match(es), found {n} for:\n{old[:200]}')
    s = s.replace(old, new)
    p.write_text(s, encoding='utf-8')
    CHANGED.append(rel)


def sub(rel, pattern, new, count=1, flags=re.S):
    p = ROOT / rel
    s = p.read_text(encoding='utf-8')
    s2, n = re.subn(pattern, new, s, flags=flags)
    if n != count:
        sys.exit(f'{rel}: expected {count} regex match(es), found {n} for {pattern[:120]}')
    p.write_text(s2, encoding='utf-8')
    CHANGED.append(rel)


# ───────────── lib/diseases.ts ─────────────
D = 'lib/diseases.ts'
rep(D, '// Tassel — treatment knowledge base for the 38 classes the scanner can detect.\n',
    '// Tassel — treatment knowledge base for every class the scanner can detect.\n'
    '// The 38 PlantVillage classes are written out below; the 116 classes added with\n'
    '// model v5 (Kenyan staples, cash crops, cereals and vegetables) are generated\n'
    '// into diseases.v5.ts by scripts/kb/gen.py.\n')
rep(D, "export type Kind = 'Fungal' | 'Oomycete' | 'Bacterial' | 'Viral' | 'Pest' | 'Healthy';",
    "export type Kind = 'Fungal' | 'Oomycete' | 'Bacterial' | 'Viral' | 'Pest' | 'Algal' | 'Healthy';")
rep(D, "import { getLang, tr, type Lang } from './i18n';",
    "import { V5_LIST } from './diseases.v5';\nimport { getLang, tr, type Lang } from './i18n';")
rep(D, "  healthy('Tomato___healthy', 'Tomato', ['Stake and prune for airflow.', 'Water at the base in the morning; mulch to stop soil splash.']),\n];",
    "  healthy('Tomato___healthy', 'Tomato', ['Stake and prune for airflow.', 'Water at the base in the morning; mulch to stop soil splash.']),\n\n"
    "  // ───────────── Added with model v5 (generated, see diseases.v5.ts) ─────────────\n  ...V5_LIST,\n];")
rep(D, "// counts stay right when the model changes (v5: 154 classes, 34 crops). Not every class\n// has a guide in LIST yet: the result screen then shows the name without treatment steps.",
    "// counts stay right when the model changes (v5: 154 classes, 34 crops). Every class has\n// a guide (LIST + V5_LIST); scripts/kb/gen.py fails if one is missing.")
rep(D, "for any of the 38 classes from its knowledge-base", "for any class from its knowledge-base")
rep(D, "/** What the farmer should check for when the scan is uncertain. The model was\n * never trained on insect damage, so instead of inventing a pest diagnosis\n * (v1.0 did this) the app points the farmer to the signs to look for. */",
    "/** What the farmer should check for when the scan is uncertain. Model v5 knows\n * 14 pests but not most insects, so instead of inventing a pest diagnosis\n * (v1.0 did this) the app points the farmer to the signs to look for. */")
rep(D, "    Potato: 'Potato: look for aphids on shoot tips and leaf miner tunnels.',\n  };\n  return ['Maize', 'Tomato', 'Potato']",
    "    Potato: 'Potato: look for aphids on shoot tips and leaf miner tunnels.',\n"
    "    Beans: 'Beans: wilting seedlings with a swollen, cracked stem base point to bean fly; also check shoot tips for aphids.',\n"
    "    Cabbage: 'Cabbage and kale: small holes and see-through \"windows\" in the leaves point to diamondback moth caterpillars.',\n"
    "  };\n  return ['Maize', 'Tomato', 'Potato', 'Beans', 'Cabbage']")

# ───────────── lib/diseases.sw.ts ─────────────
S = 'lib/diseases.sw.ts'
rep(S, "import type { Chemical } from './diseases';", "import type { Chemical } from './diseases';\nimport { SW_DISEASES_V5 } from './diseases.v5.sw';")
rep(S, "  Tomato___healthy: healthy(['Weka vigingi na pogoa ili hewa ipite.', 'Mwagilia kwenye shina asubuhi; weka matandazo kuzuia udongo kurushwa.']),\n};",
    "  Tomato___healthy: healthy(['Weka vigingi na pogoa ili hewa ipite.', 'Mwagilia kwenye shina asubuhi; weka matandazo kuzuia udongo kurushwa.']),\n\n"
    "  // Added with model v5 (generated, see diseases.v5.sw.ts)\n  ...SW_DISEASES_V5,\n};")
rep(S, "  Mango: 'Embe',\n};",
    "  Mango: 'Embe',\n  Cashew: 'Korosho',\n  Citrus: 'Machungwa',\n  Rice: 'Mpunga',\n  Millet: 'Mawele',\n  Sugarcane: 'Miwa',\n"
    "  Cotton: 'Pamba',\n  Cucumber: 'Tango',\n  Pumpkin: 'Malenge',\n  Eggplant: 'Biringanya',\n  Olive: 'Mzeituni',\n  'Black gram': 'Dengu nyeusi',\n  Capsicum: 'Pilipili hoho',\n};")
sub(S, r"(  Potato: 'Viazi: tafuta vidukari[^\n]*\n)};",
    r"\1  Beans: 'Maharagwe: miche inayonyauka yenye kitako cha shina kilichovimba na kupasuka huashiria inzi wa maharagwe; pia kagua vidukari kwenye ncha za machipukizi.',\n"
    r"  Cabbage: 'Kabichi na sukuma wiki: matundu madogo na \"madirisha\" angavu kwenye majani huashiria viwavi wa nondo mgongo-almasi.',\n};")

# ───────────── lib/classifier.ts ─────────────
rep('lib/classifier.ts', "    .replace(/_/g, ' ')\n    .trim();\n  const healthy",
    "    .replace(/_/g, ' ')\n    .trim()\n    .replace(/^Bean$/, 'Beans');\n  const healthy")

# ───────────── lib/theme.ts ─────────────
rep('lib/theme.ts', "  Pest: { ...NEUTRAL, icon: 'bug-outline' },\n",
    "  Pest: { ...NEUTRAL, icon: 'bug-outline' },\n  Algal: { ...NEUTRAL, icon: 'leaf-circle-outline' },\n")

# ───────────── lib/sw.ts ─────────────
W = 'lib/sw.ts'
rep(W, "  Disorder: 'Tatizo la lishe',\n", "  Disorder: 'Tatizo la lishe',\n  Algal: 'Mwani',\n")
rep(W, "  Strawberry: 'Stroberi',\n",
    "  Strawberry: 'Stroberi',\n  Coffee: 'Kahawa',\n  Tea: 'Chai',\n  Rice: 'Mpunga',\n  Millet: 'Mawele',\n  Sugarcane: 'Miwa',\n  Mango: 'Embe',\n"
    "  Cashew: 'Korosho',\n  Citrus: 'Machungwa',\n  Cotton: 'Pamba',\n  Cucumber: 'Tango',\n  Pumpkin: 'Malenge',\n  Eggplant: 'Biringanya',\n  Olive: 'Mzeituni',\n  'Black gram': 'Dengu nyeusi',\n")
rep(W, "  'The scanner cannot detect insects — check for:': 'Skana haiwezi kutambua wadudu — angalia:',",
    "  'Also check for pests the scanner can miss:': 'Pia kagua wadudu ambao skana inaweza kukosa:',")
rep(W, "  '38 conditions': 'hali 38',\n", "")

# ───────────── lib/counties.ts ─────────────
rep('lib/counties.ts', "export const CROP_CHOICES = ['Maize', 'Tomato', 'Potato', 'Beans', 'Wheat', 'Cabbage', 'Kale', 'Onion', 'Capsicum', 'Cassava', 'Banana', 'Avocado'];",
    "export const CROP_CHOICES = [\n  'Maize', 'Tomato', 'Potato', 'Beans', 'Wheat', 'Cabbage', 'Kale', 'Onion', 'Capsicum', 'Cassava', 'Banana', 'Avocado',\n"
    "  // Added with model v5\n  'Coffee', 'Tea', 'Sorghum', 'Millet', 'Rice', 'Sugarcane', 'Mango', 'Citrus', 'Cashew', 'Cotton', 'Cucumber', 'Pumpkin', 'Eggplant', 'Black gram',\n];")

# ───────────── components/ui.tsx (crop → artwork) ─────────────
U = 'components/ui.tsx'
new_rules = ''.join(f"  [/{rx}/, '{key}'],\n" for rx, key in MATCH)
rep(U, "const CROP_MATCH: [RegExp, string][] = [\n", "const CROP_MATCH: [RegExp, string][] = [\n  // Added with model v5 (checked first so e.g. 'malenge' is a pumpkin, not a squash)\n" + new_rules)
rep(U, "  [/squash|boga|malenge/, 'Squash'],", "  [/squash|boga/, 'Squash'],")

# ───────────── lib/cropArt.ts ─────────────
art = ''.join(f'  {json.dumps(k)}: {json.dumps(" ".join(v.split()))},\n' for k, v in ICONS.items())
sub('lib/cropArt.ts', r'\n};\s*$', '\n  // Added with model v5\n' + art.replace('\\', '\\\\') + '};\n')

# ───────────── lib/encyclopedia.ts ─────────────
E = 'lib/encyclopedia.ts'
rep(E, '//  - SCANNABLE: the 26 disease classes the on-device model was trained on\n//    (built from lib/diseases.ts), and',
    '//  - SCANNABLE: every disease and pest class the on-device model knows\n//    (123 in model v5, built from lib/diseases.ts), and')
COVERED = ['r-faw', 'r-msv', 'r-mln', 'r-beanrust', 'r-als', 'r-cmd', 'r-cbsd', 'r-stemrust', 'r-yrust', 'r-septoria', 'r-blackrot', 'r-downy', 'r-purple']
p = ROOT / E
s = p.read_text(encoding='utf-8')
for rid in COVERED:
    # the English entry: from "  { id: 'r-x'" up to the next entry, section comment or end of list
    s, n = re.subn(r"  \{ id: '" + re.escape(rid) + r"'.*?(?=\n  \{ id: 'r-|\n  // |\n\];)\n?", '', s, count=1, flags=re.S)
    assert n == 1, rid
    s, n = re.subn(r"  '" + re.escape(rid) + r"': \{[^\n]*\n", '', s, count=1)
    assert n == 1, rid + ' sw'
# section comments left with no entries under them (only inside the REFERENCE list)
a = s.index('const REFERENCE: LibraryEntry[] = [')
b = s.index('\n];', a)
s = s[:a] + re.sub(r"  // [^\n]+\n(?=  // |$)", '', s[a:b + 1]) + s[b + 1:]
s = s.replace("{ id: 'r-smut', name: 'Head smut', sci: 'Sporisorium reilianum', kind: 'Fungal', crops: ['Maize', 'Sorghum']",
              "{ id: 'r-smut', name: 'Head smut', sci: 'Sporisorium reilianum', kind: 'Fungal', crops: ['Maize']")
old_f = "export const LIBRARY_FILTERS = ['All', 'Scanner can detect', 'Maize', 'Tomato', 'Potato', 'Beans', 'Wheat', 'Fungal', 'Oomycete', 'Bacterial', 'Viral', 'Pest'];"
assert s.count(old_f) == 1
s = s.replace(old_f,
              "/** Crops with their own filter pill (most-grown in Kenya first). */\n"
              "export const LIBRARY_CROPS = ['Maize', 'Beans', 'Potato', 'Tomato', 'Coffee', 'Tea', 'Wheat', 'Cassava', 'Banana', 'Sorghum', 'Rice', 'Mango', 'Cabbage', 'Onion', 'Sugarcane', 'Cotton'];\n"
              "export const LIBRARY_FILTERS = ['All', 'Scanner can detect', ...LIBRARY_CROPS, 'Fungal', 'Oomycete', 'Bacterial', 'Viral', 'Pest'];")
p.write_text(s, encoding='utf-8')
CHANGED.append(E)

# ───────────── app/encyclopedia.tsx ─────────────
A = 'app/encyclopedia.tsx'
rep(A, "import { getLibrary, LIBRARY_FILTERS } from '../lib/encyclopedia';", "import { getLibrary, LIBRARY_CROPS, LIBRARY_FILTERS } from '../lib/encyclopedia';")
rep(A, "    else if (['Maize', 'Tomato', 'Potato', 'Beans', 'Wheat'].includes(filter)) l = l.filter((d) => d.crops.includes(filter));",
    "    else if (LIBRARY_CROPS.includes(filter)) l = l.filter((d) => d.crops.includes(filter));")
rep(A, "<Chip key={f} label={f} active={filter === f} onPress={() => setFilter(f)} />",
    "<Chip key={f} label={f} crop={LIBRARY_CROPS.includes(f) ? f : undefined} active={filter === f} onPress={() => setFilter(f)} />")

# ───────────── app/result.tsx ─────────────
rep('app/result.tsx', 'The scanner cannot detect insects — check for:', 'Also check for pests the scanner can miss:')

# ───────────── app/photo-check.tsx ─────────────
P = 'app/photo-check.tsx'
rep(P, 'crops outside its 38 classes', 'crops outside its 154 classes')
rep(P, "en: 'The offline scanner knows 38 leaf conditions.", "en: 'The offline scanner knows 154 leaf conditions on 34 crops.")
rep(P, "sw: 'Skana ya bila intaneti inajua hali 38 za majani.", "sw: 'Skana ya bila intaneti inajua hali 154 za majani kwenye mazao 34.")

# ───────────── app/methodology.tsx ─────────────
M = 'app/methodology.tsx'
s = (ROOT / M).read_text(encoding='utf-8')
start = s.index("    title: { en: '1. Leaf scanner (on the phone)'")
end = s.index("  {\n    icon: 'medical-bag',")
SEC12 = """    title: { en: '1. Leaf scanner (on the phone)', sw: '1. Skana ya majani (kwenye simu)' },
    lines: [
      {
        en: 'Model: MobileNetV2 image classifier (model v5) that knows 154 leaf classes on 34 crops: 123 diseases and pests plus 31 healthy classes. It was trained on 162,201 photos from 31 public datasets (listed at the end of this page): 111,460 field photos and 50,741 lab photos from PlantVillage.',
        sw: 'Modeli: kitambuzi cha picha cha MobileNetV2 (modeli v5) kinachojua madaraja 154 ya majani kwenye mazao 34: magonjwa na wadudu 123 pamoja na madaraja 31 ya majani yenye afya. Kilifunzwa kwa picha 162,201 kutoka hifadhidata 31 za umma (zimeorodheshwa mwisho wa ukurasa huu): picha 111,460 za shambani na picha 50,741 za maabara kutoka PlantVillage.',
      },
      {
        en: 'Before training, 64,190 duplicate photos were removed, and copies of the same photo (flipped, rotated or brightened) were kept together on one side of the split, so test photos are never near-copies of training photos.',
        sw: 'Kabla ya mafunzo, picha 64,190 zilizojirudia ziliondolewa, na nakala za picha moja (zilizogeuzwa, kuzungushwa au kuongezwa mwanga) ziliwekwa pamoja upande mmoja, kwa hivyo picha za majaribio si nakala za picha za mafunzo.',
      },
      {
        en: 'Pipeline: centre-crop the photo to a square → resize to 224×224 pixels → scale each colour value to the range −1…1 → run the model with TensorFlow Lite on the phone. No internet needed.',
        sw: 'Hatua: kata katikati ya picha iwe mraba → badilisha ukubwa hadi pikseli 224×224 → weka kila thamani ya rangi kati ya −1…1 → endesha modeli kwa TensorFlow Lite kwenye simu. Hakuna haja ya intaneti.',
      },
      {
        en: 'Accuracy on 16,254 test photos the model never saw: 94.0% overall, 91.5% on field photos and 98.7% on lab photos. The phone version (TensorFlow Lite, 4.9 MB) gave the same answers as the full model in our checks.',
        sw: 'Usahihi kwenye picha 16,254 za majaribio ambazo modeli haikuwahi kuona: 94.0% kwa jumla, 91.5% kwa picha za shambani na 98.7% kwa picha za maabara. Toleo la simu (TensorFlow Lite, MB 4.9) lilitoa majibu sawa na modeli kamili katika ukaguzi wetu.',
      },
      {
        en: 'Confidence: the scores are calibrated so that "80% sure" means right about 8 times in 10 (calibration error fell from 10.7% to 1.0%). Below 75% the app says it is not sure instead of giving a diagnosis. On the test photos it answered 92.7% of the time and was right 97.3% of the time when it answered. The same 75% rule is used by the AI advisor.',
        sw: 'Uhakika: alama zimesawazishwa ili "uhakika 80%" imaanishe kuwa sahihi takriban mara 8 kati ya 10 (kosa la usawazishaji lilishuka kutoka 10.7% hadi 1.0%). Chini ya 75% programu husema haina uhakika badala ya kutoa utambuzi. Kwenye picha za majaribio ilijibu mara 92.7% na ilikuwa sahihi mara 97.3% ilipojibu. Kanuni hiyo hiyo ya 75% inatumiwa na mshauri wa AI.',
      },
    ],
  },
  {
    icon: 'alert-outline',
    title: { en: '2. Limits we are honest about', sw: '2. Mipaka tunayoieleza wazi' },
    lines: [
      {
        en: 'The test photos come from the same 31 datasets as the training photos. On PlantDoc, a small set of real-world photos from the internet, accuracy was only 54%, and cassava field photos scored 80%. Expect lower accuracy on your own farm photos until we test the model on Kenyan fields.',
        sw: 'Picha za majaribio zinatoka katika hifadhidata 31 zile zile za picha za mafunzo. Kwenye PlantDoc, seti ndogo ya picha halisi kutoka mtandaoni, usahihi ulikuwa 54% tu, na picha za shambani za muhogo zilipata 80%. Tarajia usahihi mdogo zaidi kwenye picha za shamba lako hadi tuijaribu modeli kwenye mashamba ya Kenya.',
      },
      {
        en: 'Only one dataset (JMuBEN coffee) was photographed in Kenya; the others come from Uganda, Tanzania, Ethiopia, Ghana, South Asia and elsewhere. Some classes come from other regions: rice tungro (in Kenya, rice yellow mottle virus is more common), Moko disease of banana (in Kenya, banana Xanthomonas wilt looks similar and is more common) and cotton leaf curl (South Asia). Treat these results as a reason to check with an extension officer.',
        sw: 'Hifadhidata moja tu (JMuBEN ya kahawa) ilipigwa picha nchini Kenya; nyingine zinatoka Uganda, Tanzania, Ethiopia, Ghana, Asia Kusini na kwingineko. Baadhi ya madaraja yanatoka maeneo mengine: tungro ya mpunga (nchini Kenya virusi vya madoa ya manjano ya mpunga ni vya kawaida zaidi), ugonjwa wa Moko wa ndizi (nchini Kenya mnyauko bakteria wa ndizi unafanana nao na ni wa kawaida zaidi) na kukunjamana kwa majani ya pamba (Asia Kusini). Chukulia matokeo haya kama sababu ya kumwona afisa wa ugani.',
      },
      {
        en: 'The scanner looks at one leaf. It cannot judge roots, stems, fruit or berries (for example coffee berry disease or bacterial wilt of potato), nutrient deficiencies, or insects other than the 14 pests it was trained on. Sorghum and rice have no healthy class, so a healthy sorghum or rice leaf may get a low-confidence guess. Use the AI photo check or the library\\'s "reference only" entries for these.',
        sw: 'Skana inaangalia jani moja. Haiwezi kuchunguza mizizi, mashina, matunda au buni (kwa mfano ugonjwa wa buni za kahawa au mnyauko bakteria wa viazi), upungufu wa virutubisho, au wadudu wengine zaidi ya 14 iliofunzwa. Mtama na mpunga hazina daraja la majani yenye afya, kwa hivyo jani zima la mtama au mpunga linaweza kupata kisio cha uhakika mdogo. Tumia ukaguzi wa picha wa AI au maingizo ya "marejeleo tu" kwenye maktaba kwa haya.',
      },
      {
        en: 'Tassel supports, but does not replace, an agricultural extension officer.',
        sw: 'Tassel inamsaidia, lakini haichukui nafasi ya, afisa wa ugani wa kilimo.',
      },
    ],
  },
"""
s = s[:start] + SEC12 + s[end:]
old3 = """        en: 'Every detectable disease has written cultural, biological and chemical options and a generated day-by-day plan.',
        sw: 'Kila ugonjwa unaotambulika una chaguo za kilimo bora, kibiolojia na kemikali zilizoandikwa, pamoja na mpango wa siku kwa siku.',
      },"""
new3 = """        en: 'All 154 classes have a written guide in English and Kiswahili: cultural, biological and chemical options and a generated day-by-day plan. Healthy classes get good-practice tips.',
        sw: 'Madaraja yote 154 yana mwongozo ulioandikwa kwa Kiingereza na Kiswahili: chaguo za kilimo bora, kibiolojia na kemikali, pamoja na mpango wa siku kwa siku. Madaraja ya majani yenye afya yanapata vidokezo vya kilimo bora.',
      },
      {
        en: 'Maize lethal necrosis and Moko disease of banana are flagged "Report to authorities" so the farmer contacts the county agriculture office.',
        sw: 'Ugonjwa hatari wa mahindi (MLN) na ugonjwa wa Moko wa ndizi vimewekewa alama "Ripoti kwa mamlaka" ili mkulima awasiliane na ofisi ya kilimo ya kaunti.',
      },"""
assert s.count(old3) == 1
s = s.replace(old3, new3)
for a, b in [("weather damage and crops outside the 38 classes.", "weather damage and problems outside the scanner's 154 classes."),
             ("madhara ya hali ya hewa na mazao nje ya madaraja 38.", "madhara ya hali ya hewa na matatizo nje ya madaraja 154 ya skana."),
             ("all 38 disease guides", "all 154 leaf guides"),
             ("miongozo yote 38 ya magonjwa", "miongozo yote 154 ya majani")]:
    assert s.count(a) == 1, a
    s = s.replace(a, b)
credits = json.loads((HERE / 'credits.json').read_text(encoding='utf-8'))
cred_lines = ''.join("      { en: %s, sw: %s },\n" % (json.dumps(c, ensure_ascii=False), json.dumps(c, ensure_ascii=False)) for c in credits)
SEC11 = """  {
    icon: 'database-outline',
    title: { en: '11. Training data and credits', sw: '11. Data ya mafunzo na shukrani' },
    lines: [
      {
        en: 'The leaf model was trained on these %d public datasets. Their licences ask us to credit them (MangoLeafBD is for non-commercial use only):',
        sw: 'Modeli ya majani ilifunzwa kwa hifadhidata hizi %d za umma. Leseni zao zinatutaka tuzitaje (MangoLeafBD ni kwa matumizi yasiyo ya kibiashara tu):',
      },
%s    ],
  },
];

export default function MethodologyScreen""" % (len(credits), len(credits), cred_lines)
old_end = "];\n\nexport default function MethodologyScreen"
assert s.count(old_end) == 1
s = s.replace(old_end, SEC11)
(ROOT / M).write_text(s, encoding='utf-8')
CHANGED.append(M)

# ───────────── version 2.6.0 ─────────────
rep('app.json', '"version": "2.5.0"', '"version": "2.6.0"')
rep('android/app/build.gradle', 'versionCode 5\n', 'versionCode 6\n')
rep('android/app/build.gradle', 'versionName "2.5.0"', 'versionName "2.6.0"')

print('changed:', ', '.join(sorted(set(CHANGED))))
