// Tassel — PCPB product catalogue logic (pure: no React Native imports, so it
// can be tested with `node --experimental-strip-types`).
//
// Data: lib/pcpbData.generated.json, built by scripts/pcpb/build_catalogue.py from
//   - the official PCPB register of crop products (pcpb.go.ke/crops/, table of 24 Aug 2026), and
//   - label rates quoted from the PCPB-approved label PDFs (scripts/pcpb/label_rates.json).
//
// Rules (Tassel handoff, section 1):
//   - only products on the register; June 2025 withdrawn/restricted actives and
//     "not for open field" products are removed by the build script;
//   - a dose is shown only when it is quoted from the label; otherwise "See the label";
//   - the tank maths below only scales the label rate to the farmer's tank and field.

export type Kind = 'herbicide' | 'fungicide' | 'insecticide' | 'other';

export type ProblemKey =
  | 'late_blight' | 'early_blight' | 'rust' | 'leaf_spot' | 'powdery_mildew' | 'downy_mildew' | 'cbd'
  | 'bacterial' | 'blast' | 'faw' | 'stalk_borer' | 'tuta' | 'caterpillar' | 'aphids' | 'whiteflies'
  | 'thrips' | 'mites' | 'bean_fly' | 'weevils' | 'leafminer' | 'broadleaf_weeds' | 'grass_weeds';

export type DoseUnit = 'mL' | 'g' | 'L' | 'kg';
export type Dose = { min: number; max: number; unit: DoseUnit };

export type PpeKey = 'gloves' | 'overalls' | 'gumboots' | 'boots' | 'faceShield' | 'faceMask' | 'goggles' | 'respirator' | 'hat';

export type LabelUse = {
  crop: string;
  labelCrop: string;
  problem: ProblemKey;
  labelProblem: string;
  perTank20?: Dose;
  perHa?: Dose;
  waterPerHa?: number;
  interval?: string;
  maxSprays?: number;
  phiDays?: number;
  quote: string;
};

export type LabelInfo = { reiHours?: number; ppe: PpeKey[]; warning?: string; uses: LabelUse[] };

/** One register entry. Short keys keep the bundled JSON small. */
export type PcpbProduct = {
  n: string; // register name
  d: string; // display name
  r: string; // registration number
  a: string; // active ingredient(s)
  k: Kind;
  c: string[]; // app crops named in the registered uses
  p: string[]; // "crop:problem" pairs found in the same clause of the registered uses
  u: string; // registered uses, verbatim
  l: string | null; // Google Drive id of the PCPB label PDF, or its full URL
  phi?: string; // PHI text from the register, verbatim
  rei?: string;
  who?: string;
  lab?: LabelInfo; // rates read from the label
  unv?: boolean; // label read but rate not readable → "See the label"
};

export type Catalogue = {
  source: string;
  table: string;
  fetched: string;
  labelsCheckedOn: string;
  restrictedActives: string[];
  products: PcpbProduct[];
};

export const PROBLEMS: Record<ProblemKey, { en: string; kind: Kind }> = {
  late_blight: { en: 'Late blight', kind: 'fungicide' },
  early_blight: { en: 'Early blight', kind: 'fungicide' },
  rust: { en: 'Rust', kind: 'fungicide' },
  leaf_spot: { en: 'Leaf spot', kind: 'fungicide' },
  powdery_mildew: { en: 'Powdery mildew', kind: 'fungicide' },
  downy_mildew: { en: 'Downy mildew', kind: 'fungicide' },
  cbd: { en: 'Coffee berry disease', kind: 'fungicide' },
  bacterial: { en: 'Bacterial disease', kind: 'fungicide' },
  blast: { en: 'Blast', kind: 'fungicide' },
  faw: { en: 'Fall armyworm', kind: 'insecticide' },
  stalk_borer: { en: 'Stalk borer', kind: 'insecticide' },
  tuta: { en: 'Tuta absoluta', kind: 'insecticide' },
  caterpillar: { en: 'Caterpillars', kind: 'insecticide' },
  aphids: { en: 'Aphids', kind: 'insecticide' },
  whiteflies: { en: 'Whiteflies', kind: 'insecticide' },
  thrips: { en: 'Thrips', kind: 'insecticide' },
  mites: { en: 'Mites', kind: 'insecticide' },
  bean_fly: { en: 'Bean fly', kind: 'insecticide' },
  weevils: { en: 'Weevils', kind: 'insecticide' },
  leafminer: { en: 'Leaf miner', kind: 'insecticide' },
  broadleaf_weeds: { en: 'Broadleaf weeds', kind: 'herbicide' },
  grass_weeds: { en: 'Grass weeds', kind: 'herbicide' },
};

export const PPE_EN: Record<PpeKey, string> = {
  gloves: 'Gloves',
  overalls: 'Overalls',
  gumboots: 'Gumboots',
  boots: 'Boots',
  faceShield: 'Face shield',
  faceMask: 'Face mask',
  goggles: 'Goggles',
  respirator: 'Respirator',
  hat: 'Hat',
};

const CROP_ALIASES: Array<[RegExp, string]> = [
  [/maize|corn|mahindi/i, 'maize'],
  [/tomato|nyanya/i, 'tomato'],
  [/potato|viazi|kiazi/i, 'potato'],
  [/bean|maharag|black.?gram|soybean/i, 'beans'],
  [/wheat|ngano/i, 'wheat'],
  [/cabbage|kabichi/i, 'cabbage'],
  [/kale|sukuma/i, 'kale'],
  [/onion|kitunguu/i, 'onion'],
  [/capsicum|pepper|pilipili|chill?i/i, 'capsicum'],
  [/cassava|muhogo/i, 'cassava'],
  [/banana|ndizi/i, 'banana'],
  [/avocado|parachichi/i, 'avocado'],
  [/coffee|kahawa/i, 'coffee'],
  [/\btea\b|chai/i, 'tea'],
  [/sorghum|mtama/i, 'sorghum'],
  [/millet|wimbi/i, 'millet'],
  [/rice|mpunga|mchele/i, 'rice'],
  [/sugar.?cane|miwa/i, 'sugarcane'],
  [/mango|embe/i, 'mango'],
  [/citrus|orange|lemon|chungwa/i, 'citrus'],
  [/cashew|korosho/i, 'cashew'],
  [/cotton|pamba/i, 'cotton'],
  [/cucumber|tango/i, 'cucumber'],
  [/pumpkin|squash|malenge/i, 'pumpkin'],
  [/eggplant|brinjal|biringanya/i, 'eggplant'],
];

/** "Corn___Common_rust", "Maize", "Mahindi" → "maize". */
export function cropKey(text: string | null | undefined): string | null {
  if (!text) return null;
  const head = text.split('___')[0];
  for (const [re, key] of CROP_ALIASES) if (re.test(head)) return key;
  return null;
}

// Order matters: the specific names come before the general families.
const PROBLEM_PATTERNS: Array<[RegExp, ProblemKey]> = [
  [/late.?blight|phytophthora/i, 'late_blight'],
  [/early.?blight|alternaria/i, 'early_blight'],
  [/coffee.?berry|\bcbd\b/i, 'cbd'],
  [/powdery/i, 'powdery_mildew'],
  [/downy/i, 'downy_mildew'],
  [/fall.?army.?worm|frugiperda|\bfaw\b/i, 'faw'],
  [/stalk.?borer|stem.?borer/i, 'stalk_borer'],
  [/tuta/i, 'tuta'],
  [/bean.?fl(y|ies)/i, 'bean_fly'],
  [/white.?fl(y|ies)/i, 'whiteflies'],
  [/aphid/i, 'aphids'],
  [/thrips/i, 'thrips'],
  [/mite/i, 'mites'],
  [/weevil/i, 'weevils'],
  [/leaf.?miner/i, 'leafminer'],
  [/caterpillar|bollworm|diamond.?back|looper|cutworm|army.?worm|spodoptera|helicoverpa/i, 'caterpillar'],
  [/\brust\b|_rust|rust_/i, 'rust'],
  [/blast/i, 'blast'],
  [/bacteri/i, 'bacterial'],
  [/leaf.?spot|cercospora|septoria|anthracnose|leaf.?blight|blotch|target.?spot|scab/i, 'leaf_spot'],
  [/broad.?lea(f|ved)/i, 'broadleaf_weeds'],
  [/grass/i, 'grass_weeds'],
];

/** "Tomato___Late_blight", "Baka chelewa (late blight)" → "late_blight". Viruses and healthy leaves → null. */
export function problemKey(text: string | null | undefined): ProblemKey | null {
  if (!text) return null;
  const t = text.replace(/_/g, ' ');
  if (/healthy|virus|mosaic|viral/i.test(t)) return null;
  for (const [re, key] of PROBLEM_PATTERNS) if (re.test(t)) return key;
  return null;
}

/** The label use for this crop (and problem, when given). Never borrows another crop's rate. */
export function labelUse(p: PcpbProduct, crop: string | null, problem?: ProblemKey | null): LabelUse | null {
  if (!p.lab || !crop) return null;
  const forCrop = p.lab.uses.filter((u) => u.crop === crop);
  if (problem) return forCrop.find((u) => u.problem === problem) ?? null;
  return forCrop[0] ?? null;
}

export type ProductQuery = { crop: string | null; problem?: ProblemKey | null; kind?: Kind | null; limit?: number };

/**
 * Registered products for a crop and problem. A product matches only when the
 * register names the crop and the problem in the same clause of its uses.
 * Products with a label rate for this exact use come first.
 */
export function productsFor(cat: Catalogue, q: ProductQuery): PcpbProduct[] {
  const { crop, problem, kind } = q;
  if (!crop) return [];
  const list = cat.products.filter((p) => {
    if (kind && p.k !== kind) return false;
    if (problem) return p.p.includes(`${crop}:${problem}`);
    return p.c.includes(crop);
  });
  const rank = (p: PcpbProduct) => (labelUse(p, crop, problem) ? 0 : p.unv ? 2 : 1);
  list.sort((a, b) => rank(a) - rank(b) || a.d.localeCompare(b.d));
  return q.limit ? list.slice(0, q.limit) : list;
}

export function labelUrl(p: PcpbProduct): string | null {
  if (!p.l) return null;
  return /^https?:\/\//.test(p.l) ? p.l : `https://drive.google.com/file/d/${p.l}/view`;
}

// ── Tank maths (label rate × tank size × field size) ──────────────────

const BASE: Record<DoseUnit, { base: 'mL' | 'g'; f: number }> = {
  mL: { base: 'mL', f: 1 },
  L: { base: 'mL', f: 1000 },
  g: { base: 'g', f: 1 },
  kg: { base: 'g', f: 1000 },
};

function toBase(d: Dose): Dose {
  const b = BASE[d.unit];
  return { min: d.min * b.f, max: d.max * b.f, unit: b.base };
}

function scale(d: Dose, k: number): Dose {
  return { min: d.min * k, max: d.max * k, unit: d.unit };
}

export type MixPlan = {
  use: LabelUse | null;
  /** Product per tank, scaled from the label to the farmer's tank. */
  perTank: Dose | null;
  /** Tanks to cover the field, from the label's water volume. Null when the label gives none. */
  tanks: number | null;
  /** Product for the whole field. */
  total: Dose | null;
  /** Water volume per hectare used for the tank count (label, or implied by the label's two rates). */
  waterPerHa: number | null;
};

/**
 * Scales a label rate to a knapsack and a field. Returns nulls (→ "See the label")
 * when the label does not give a rate for this crop and problem.
 * `tanksOverride` lets the farmer say how many tanks cover the field when the label gives no water volume.
 */
export function planMix(
  p: PcpbProduct,
  crop: string | null,
  problem: ProblemKey | null,
  tankLitres: number,
  hectares: number,
  tanksOverride?: number | null
): MixPlan {
  const use = labelUse(p, crop, problem) ?? (problem ? null : labelUse(p, crop));
  if (!use) return { use: null, perTank: null, tanks: null, total: null, waterPerHa: null };

  const perHa = use.perHa ? toBase(use.perHa) : null;
  const perTank20 = use.perTank20 ? toBase(use.perTank20) : null;

  // Water per hectare: stated on the label, or implied by its per-ha and per-tank rates.
  const water = use.waterPerHa ?? (perHa && perTank20 && perTank20.max > 0 ? (perHa.max / perTank20.max) * 20 : null);

  let perTank: Dose | null = null;
  if (perTank20) perTank = scale(perTank20, tankLitres / 20);
  else if (perHa && water) perTank = scale(perHa, tankLitres / water);

  const tanks = tanksOverride && tanksOverride > 0 ? tanksOverride : water ? Math.max(1, Math.ceil((water * hectares) / tankLitres)) : null;

  // Total: per-ha rate × area; else per-20 L rate × the label's water volume (exact, not rounded-up tanks).
  let total: Dose | null = null;
  if (perHa) total = scale(perHa, hectares);
  else if (perTank20 && water && !(tanksOverride && tanksOverride > 0)) total = scale(perTank20, (water * hectares) / 20);
  else if (perTank && tanks) total = scale(perTank, tanks);

  return { use, perTank, tanks, total, waterPerHa: water ? Math.round(water) : null };
}

function round(v: number): number {
  if (v >= 100) return Math.round(v);
  if (v >= 10) return Math.round(v * 2) / 2;
  return Math.round(v * 10) / 10;
}

/** 40 mL, 7.5–10 mL, 1.25 L, 3.8 kg. Ranges stay ranges — never averaged. */
export function fmtDose(d: Dose | null): string | null {
  if (!d) return null;
  let { min, max, unit } = d;
  if (unit === 'mL' && max >= 1000) { min /= 1000; max /= 1000; unit = 'L'; }
  else if (unit === 'g' && max >= 1000) { min /= 1000; max /= 1000; unit = 'kg'; }
  const big = unit === 'L' || unit === 'kg';
  const f = (v: number) => (big ? String(Math.round(v * 100) / 100) : String(round(v)));
  const a = f(min);
  const b = f(max);
  return a === b ? `${a} ${unit}` : `${a}–${b} ${unit}`;
}
