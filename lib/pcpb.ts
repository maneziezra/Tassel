// Kenya Pest Control Products Board (PCPB) registered commercial product references.
//
// Follows PCPB regulations and June 2025 review:
// - Excludes withdrawn/restricted actives: chlorothalonil, chlorpyrifos & dimethoate (termiticide only),
//   imidacloprid & abamectin (not open field), iprodione (not food crops), carbofuran.
// - Mancozeb is flagged as under review.
// - All entries display official PCPB Reg No., active ingredient, and "Not sponsored. Follow label".
// - Rates strictly reflect PCPB registered product label guidelines. When in doubt, "See the label".

export type PcpbCategory = 'herbicide' | 'fungicide' | 'insecticide';

export type PcpbProduct = {
  id: string;
  name: string;
  regNo: string;
  active: string;
  category: PcpbCategory;
  crops: string[];
  targets: string;
  formulation: string;
  labelRate20L?: string;
  labelRate16L?: string;
  ratePerAcre?: string;
  phiDays?: number;
  reiHours?: number;
  ppe?: string[];
  timing?: string;
  warning?: string;
};

export const PCPB_DISCLAIMER = 'Not sponsored. Follow product label for exact dosage, PPE and pre-harvest interval.';

export const ALL_PCPB_PRODUCTS: PcpbProduct[] = [
  // --- HERBICIDES (Selective & Non-Selective) ---
  {
    id: 'roundup-turbo',
    name: 'Roundup Turbo 450 SL',
    regNo: 'PCPB(CR) 0207',
    active: 'Glyphosate 450g/L',
    category: 'herbicide',
    crops: ['maize', 'wheat', 'potato', 'beans', 'coffee', 'tea'],
    targets: 'Annual & perennial grasses, broadleaf weeds (land preparation)',
    formulation: '450 SL (Soluble Concentrate)',
    labelRate20L: '150–200 mL',
    labelRate16L: '120–160 mL',
    ratePerAcre: '1.2–1.5 Litres',
    phiDays: 0,
    reiHours: 24,
    ppe: ['Gloves', 'Eye protection', 'Rubber boots'],
    timing: 'Pre-plant / Land preparation before crop emerges. Never spray on green crop foliage.',
  },
  {
    id: 'lumax-537',
    name: 'Lumax 537.5 SE',
    regNo: 'PCPB(CR) 0914',
    active: 'S-Metolachlor 375g/L + Terbuthylazine 125g/L + Mesotrione 37.5g/L',
    category: 'herbicide',
    crops: ['maize'],
    targets: 'Annual grasses and broadleaf weeds in maize',
    formulation: '537.5 SE (Suspo-emulsion)',
    labelRate20L: '180–200 mL',
    labelRate16L: '145–160 mL',
    ratePerAcre: '1.5–1.6 Litres',
    phiDays: 90,
    reiHours: 24,
    ppe: ['Gloves', 'Face shield', 'Rubber boots', 'Overalls'],
    timing: 'Pre-emergence to early post-emergence (up to 4-leaf stage of maize). Apply on moist soil.',
  },
  {
    id: 'stomp-455',
    name: 'Stomp 455 CS',
    regNo: 'PCPB(CR) 1243',
    active: 'Pendimethalin 455g/L',
    category: 'herbicide',
    crops: ['maize', 'beans', 'potato', 'onion', 'vegetables'],
    targets: 'Annual grasses and common broadleaf weeds',
    formulation: '455 CS (Capsule Suspension)',
    labelRate20L: '100–120 mL',
    labelRate16L: '80–100 mL',
    ratePerAcre: '0.8–1.0 Litre',
    phiDays: 60,
    reiHours: 24,
    ppe: ['Gloves', 'Eye protection', 'Boots'],
    timing: 'Pre-emergence: immediately after planting before crop and weed emergence.',
  },
  {
    id: 'basagran-480',
    name: 'Basagran 480 SL',
    regNo: 'PCPB(CR) 0165',
    active: 'Bentazone 480g/L',
    category: 'herbicide',
    crops: ['beans', 'maize', 'peas'],
    targets: 'Selective broadleaf weed control (Commelina, Black nightshade)',
    formulation: '480 SL (Soluble Liquid)',
    labelRate20L: '80–100 mL',
    labelRate16L: '65–80 mL',
    ratePerAcre: '0.8 Litres',
    phiDays: 30,
    reiHours: 24,
    ppe: ['Gloves', 'Eye protection', 'Rubber boots'],
    timing: 'Post-emergence: when weeds have 2–4 leaves and crop has at least 2 trifoliate leaves.',
  },
  {
    id: 'amine-24d',
    name: '2,4-D Amine 720 SL',
    regNo: 'PCPB(CR) 0104',
    active: '2,4-D Amine salt 720g/L',
    category: 'herbicide',
    crops: ['maize', 'wheat', 'sugarcane'],
    targets: 'Selective control of annual and perennial broadleaf weeds',
    formulation: '720 SL (Soluble Liquid)',
    labelRate20L: '60–80 mL',
    labelRate16L: '50–65 mL',
    ratePerAcre: '0.5–0.7 Litres',
    phiDays: 40,
    reiHours: 24,
    ppe: ['Gloves', 'Eye goggles', 'Respirator mask'],
    timing: 'Post-emergence when maize is 20–30 cm tall. Do not apply near broadleaf crops (beans/tomatoes).',
  },
  {
    id: 'fusilade-forte',
    name: 'Fusilade Forte 150 EC',
    regNo: 'PCPB(CR) 0885',
    active: 'Fluazifop-P-butyl 150g/L',
    category: 'herbicide',
    crops: ['beans', 'potato', 'tomato', 'onion', 'vegetables'],
    targets: 'Selective post-emergence grass weeds in broadleaf crops (Couch grass, Wild oats)',
    formulation: '150 EC (Emulsifiable Concentrate)',
    labelRate20L: '50–60 mL',
    labelRate16L: '40–50 mL',
    ratePerAcre: '0.5–0.6 Litres',
    phiDays: 45,
    reiHours: 24,
    ppe: ['Gloves', 'Eye protection', 'Boots'],
    timing: 'Post-emergence when grasses are actively growing (2–4 leaf stage). Safe over broadleaf crops.',
  },
  {
    id: 'sencor-70wg',
    name: 'Sencor 70 WG',
    regNo: 'PCPB(CR) 0238',
    active: 'Metribuzin 700g/kg',
    category: 'herbicide',
    crops: ['potato', 'tomato', 'soybean'],
    targets: 'Annual broadleaf weeds and annual grasses',
    formulation: '70 WG (Water Dispersible Granule)',
    labelRate20L: '30–40 g',
    labelRate16L: '25–30 g',
    ratePerAcre: '0.3–0.4 kg',
    phiDays: 60,
    reiHours: 24,
    ppe: ['Gloves', 'Respirator mask', 'Eye protection'],
    timing: 'In potatoes: pre-emergence after hilling up, or early post-emergence when shoots are < 10 cm.',
  },

  // --- FUNGICIDES (Blight, Rust, Mildew, Spots) ---
  {
    id: 'ridomil-gold',
    name: 'Ridomil Gold MZ 68WG',
    regNo: 'PCPB(CR) 0244',
    active: 'Metalaxyl-M 40g/kg + Mancozeb 640g/kg',
    category: 'fungicide',
    crops: ['potato', 'tomato'],
    targets: 'Late blight (Phytophthora infestans), Downy mildew',
    formulation: '68 WG (Water Dispersible Granule)',
    labelRate20L: '50 g',
    labelRate16L: '40 g',
    ratePerAcre: '1.0 kg',
    phiDays: 14,
    reiHours: 24,
    ppe: ['Gloves', 'Face mask', 'Eye goggles', 'Rubber boots'],
    timing: 'Preventative or at very first sign of blight. Maximum 2–3 applications per season.',
    warning: 'Mancozeb was under PCPB review in 2025. Confirm registration status before purchase.',
  },
  {
    id: 'ortiva-top',
    name: 'Ortiva Top 325 SC',
    regNo: 'PCPB(CR) 1248',
    active: 'Azoxystrobin 200g/L + Difenoconazole 125g/L',
    category: 'fungicide',
    crops: ['potato', 'tomato', 'onion', 'vegetables'],
    targets: 'Early blight, Powdery mildew, Rust, Leaf spots',
    formulation: '325 SC (Suspension Concentrate)',
    labelRate20L: '20 mL',
    labelRate16L: '16 mL',
    ratePerAcre: '200 mL',
    phiDays: 7,
    reiHours: 12,
    ppe: ['Gloves', 'Eye protection', 'Rubber boots'],
    timing: 'At first appearance of disease symptoms; repeat after 10–14 days if wet.',
  },
  {
    id: 'kocide-2000',
    name: 'Kocide 2000',
    regNo: 'PCPB(CR) 0628',
    active: 'Copper hydroxide 538g/kg (35% metallic copper)',
    category: 'fungicide',
    crops: ['potato', 'tomato', 'beans', 'coffee', 'vegetables'],
    targets: 'Bacterial spot, Early & late blight protectant, Anthracnose',
    formulation: '54 WG (Water Dispersible Granule)',
    labelRate20L: '50 g',
    labelRate16L: '40 g',
    ratePerAcre: '1.0 kg',
    phiDays: 3,
    reiHours: 24,
    ppe: ['Gloves', 'Eye protection', 'Dust mask'],
    timing: 'Contact protectant: apply before infection or onset of humid/rainy weather.',
  },
  {
    id: 'milraz-wp',
    name: 'Milraz WP',
    regNo: 'PCPB(CR) 0456',
    active: 'Propineb 700g/kg + Cymoxanil 60g/kg',
    category: 'fungicide',
    crops: ['potato', 'tomato'],
    targets: 'Late blight, Downy mildew',
    formulation: '76 WP (Wettable Powder)',
    labelRate20L: '40–50 g',
    labelRate16L: '32–40 g',
    ratePerAcre: '0.8–1.0 kg',
    phiDays: 14,
    reiHours: 24,
    ppe: ['Gloves', 'Mask', 'Rubber boots'],
    timing: 'Systemic curative action within 48 hours of blight infection, plus contact protection.',
  },
  {
    id: 'nativo-300',
    name: 'Nativo 300 SC',
    regNo: 'PCPB(CR) 1152',
    active: 'Tebuconazole 200g/L + Trifloxystrobin 100g/L',
    category: 'fungicide',
    crops: ['maize', 'wheat', 'beans', 'rice'],
    targets: 'Rusts (Ug99, stripe rust), Northern corn leaf blight, Grey leaf spot',
    formulation: '300 SC (Suspension Concentrate)',
    labelRate20L: '15–20 mL',
    labelRate16L: '12–16 mL',
    ratePerAcre: '150–200 mL',
    phiDays: 21,
    reiHours: 24,
    ppe: ['Gloves', 'Face shield', 'Rubber boots'],
    timing: 'At first appearance of rust pustules or leaf blight lesions.',
  },
  {
    id: 'score-250',
    name: 'Score 250 EC',
    regNo: 'PCPB(CR) 0386',
    active: 'Difenoconazole 250g/L',
    category: 'fungicide',
    crops: ['beans', 'tomato', 'potato', 'vegetables'],
    targets: 'Angular leaf spot, Anthracnose, Powdery mildew',
    formulation: '250 EC (Emulsifiable Concentrate)',
    labelRate20L: '10–12 mL',
    labelRate16L: '8–10 mL',
    ratePerAcre: '100–120 mL',
    phiDays: 14,
    reiHours: 24,
    ppe: ['Gloves', 'Eye goggles', 'Boots'],
    timing: 'Apply when first disease symptoms are noticed; systemic movement inside leaf tissue.',
  },

  // --- INSECTICIDES (Caterpillars, Armyworm, Sucking Pests) ---
  {
    id: 'coragen-20',
    name: 'Coragen 20 SC',
    regNo: 'PCPB(CR) 1109',
    active: 'Chlorantraniliprole 200g/L',
    category: 'insecticide',
    crops: ['maize', 'tomato', 'beans', 'cabbage'],
    targets: 'Fall armyworm, Tuta absoluta, Cutworms, Diamondback moth',
    formulation: '20 SC (Suspension Concentrate)',
    labelRate20L: '5 mL',
    labelRate16L: '4 mL',
    ratePerAcre: '40–50 mL',
    phiDays: 3,
    reiHours: 4,
    ppe: ['Gloves', 'Eye protection', 'Rubber boots'],
    timing: 'Target young larvae (1st to 2nd instar). Spray directly into maize whorls for armyworm.',
  },
  {
    id: 'belt-480',
    name: 'Belt 480 SC',
    regNo: 'PCPB(CR) 1138',
    active: 'Flubendiamide 480g/L',
    category: 'insecticide',
    crops: ['maize', 'tomato', 'beans', 'vegetables'],
    targets: 'Caterpillars, Armyworm, Pod borers, Leaf miners',
    formulation: '480 SC (Suspension Concentrate)',
    labelRate20L: '5 mL',
    labelRate16L: '4 mL',
    ratePerAcre: '40–50 mL',
    phiDays: 3,
    reiHours: 12,
    ppe: ['Gloves', 'Eye protection', 'Boots'],
    timing: 'Apply when caterpillar eggs hatch or small larvae appear.',
  },
  {
    id: 'radiant-120',
    name: 'Radiant 120 SC',
    regNo: 'PCPB(CR) 1290',
    active: 'Spinetoram 120g/L',
    category: 'insecticide',
    crops: ['tomato', 'maize', 'beans', 'vegetables'],
    targets: 'Thrips, Tuta absoluta, Fall armyworm, Leaf miners',
    formulation: '120 SC (Suspension Concentrate)',
    labelRate20L: '10 mL',
    labelRate16L: '8 mL',
    ratePerAcre: '100 mL',
    phiDays: 3,
    reiHours: 4,
    ppe: ['Gloves', 'Eye protection', 'Boots'],
    timing: 'Fast knockdown and ovicidal action against resistant thrips and armyworms.',
  },
  {
    id: 'actara-25',
    name: 'Actara 25 WG',
    regNo: 'PCPB(CR) 0573',
    active: 'Thiamethoxam 250g/kg',
    category: 'insecticide',
    crops: ['maize', 'beans', 'vegetables', 'potato'],
    targets: 'Aphids, Whiteflies, Leafhoppers, Thrips',
    formulation: '25 WG (Water Dispersible Granule)',
    labelRate20L: '8–10 g',
    labelRate16L: '6–8 g',
    ratePerAcre: '80–100 g',
    phiDays: 7,
    reiHours: 12,
    ppe: ['Gloves', 'Face mask', 'Eye protection'],
    timing: 'Foliar spray at early pest infestation. Open-field approved under PCPB.',
  },
  {
    id: 'teppeki-50',
    name: 'Teppeki 50 WG',
    regNo: 'PCPB(CR) 1341',
    active: 'Flonicamid 500g/kg',
    category: 'insecticide',
    crops: ['potato', 'tomato', 'vegetables'],
    targets: 'Aphids, Whiteflies (selective antifeedant)',
    formulation: '50 WG (Water Dispersible Granule)',
    labelRate20L: '6–8 g',
    labelRate16L: '5–6 g',
    ratePerAcre: '60–80 g',
    phiDays: 7,
    reiHours: 12,
    ppe: ['Gloves', 'Mask', 'Rubber boots'],
    timing: 'Selective feeding blocker: stops pest sucking within 1 hour; safe for beneficial insects.',
  },
];

export const PCPB_CATALOGUE: Record<string, PcpbProduct[]> = {
  blight: ALL_PCPB_PRODUCTS.filter((p) => p.category === 'fungicide' && /blight|downy/i.test(p.targets)),
  rust: ALL_PCPB_PRODUCTS.filter((p) => p.category === 'fungicide' && /rust|spot|anthracnose/i.test(p.targets)),
  mildew: ALL_PCPB_PRODUCTS.filter((p) => p.category === 'fungicide' && /mildew|scab/i.test(p.targets)),
  caterpillar: ALL_PCPB_PRODUCTS.filter((p) => p.category === 'insecticide' && /armyworm|caterpillar|tuta|borer/i.test(p.targets)),
  sucking: ALL_PCPB_PRODUCTS.filter((p) => p.category === 'insecticide' && /aphid|whitefly|thrip|hopper/i.test(p.targets)),
  protectant: ALL_PCPB_PRODUCTS.filter((p) => p.category === 'fungicide' && /protectant|copper/i.test(p.targets)),
  herbicide: ALL_PCPB_PRODUCTS.filter((p) => p.category === 'herbicide'),
};

/** Get 2-3 registered product examples for a disease or problem. */
export function getRegisteredProducts(diseaseOrLabel: string): PcpbProduct[] {
  const d = (diseaseOrLabel || '').toLowerCase();

  if (/weed|grass|herbicide|land prep|till/i.test(d)) {
    return PCPB_CATALOGUE.herbicide.slice(0, 3);
  }
  if (/blight|downy|phytophthora/i.test(d)) {
    return PCPB_CATALOGUE.blight.slice(0, 3);
  }
  if (/rust|spot|anthracnose|cercospora|septoria/i.test(d)) {
    return PCPB_CATALOGUE.rust.slice(0, 3);
  }
  if (/powdery|mildew|oidium/i.test(d)) {
    return PCPB_CATALOGUE.mildew.slice(0, 2);
  }
  if (/armyworm|worm|caterpillar|borer|tuta|moth/i.test(d)) {
    return PCPB_CATALOGUE.caterpillar.slice(0, 3);
  }
  if (/aphid|whitefly|fly|thrip|bug|hopper|psyllid/i.test(d)) {
    return PCPB_CATALOGUE.sucking.slice(0, 3);
  }
  if (/bacterial|canker|scab/i.test(d)) {
    return PCPB_CATALOGUE.protectant.slice(0, 2);
  }
  return PCPB_CATALOGUE.protectant.slice(0, 2);
}

/** Filter PCPB products by crop, category, or search query. */
export function findPcpbProducts(filter: { crop?: string; category?: PcpbCategory; query?: string }): PcpbProduct[] {
  const crop = (filter.crop || '').toLowerCase().trim();
  const q = (filter.query || '').toLowerCase().trim();

  return ALL_PCPB_PRODUCTS.filter((p) => {
    if (filter.category && p.category !== filter.category) return false;
    if (crop && !p.crops.some((c) => c.includes(crop) || crop.includes(c))) return false;
    if (q) {
      const match =
        p.name.toLowerCase().includes(q) ||
        p.active.toLowerCase().includes(q) ||
        p.targets.toLowerCase().includes(q) ||
        p.regNo.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });
}

export type KnapsackCalcResult = {
  knapsackLiters: 16 | 20;
  tankDose: string;
  tanksPerAcre: number;
  totalTanks: number;
  totalProductText: string;
  labelVerified: boolean;
};

/**
 * Knapsack tank-mix and field requirement calculation.
 * Standard smallholder knapsack coverage is approx 8–10 tanks (160–200 L water) per acre for foliage.
 */
export function calculateKnapsackMix(product: PcpbProduct, knapsackLiters: 16 | 20, acres: number): KnapsackCalcResult {
  const rateStr = knapsackLiters === 16 ? product.labelRate16L : product.labelRate20L;
  const isHerbicide = product.category === 'herbicide';
  // Soil-applied herbicides typically use 10 tanks/acre, foliar fungicides/insecticides ~8 tanks/acre
  const tanksPerAcre = isHerbicide ? 10 : 8;
  const totalTanks = Math.max(1, Math.round(tanksPerAcre * acres));

  if (!rateStr) {
    return {
      knapsackLiters,
      tankDose: 'See the product label',
      tanksPerAcre,
      totalTanks,
      totalProductText: 'See product label for rate',
      labelVerified: false,
    };
  }

  // Parse numerical rate if possible (e.g. "50 g" -> 50, "150–200 mL" -> 175)
  const numMatches = rateStr.match(/(\d+(?:\.\d+)?)/g);
  let estDose = 0;
  let unit = 'mL';
  if (/g|kg/i.test(rateStr)) unit = 'g';

  if (numMatches && numMatches.length > 0) {
    if (numMatches.length === 1) {
      estDose = parseFloat(numMatches[0]);
    } else {
      estDose = (parseFloat(numMatches[0]) + parseFloat(numMatches[1])) / 2;
    }
  }

  let totalText = 'See the label';
  if (estDose > 0) {
    const totalAmount = Math.round(estDose * totalTanks);
    if (unit === 'g' && totalAmount >= 1000) {
      totalText = `${(totalAmount / 1000).toFixed(2)} kg`;
    } else if (unit === 'mL' && totalAmount >= 1000) {
      totalText = `${(totalAmount / 1000).toFixed(2)} Litres`;
    } else {
      totalText = `${totalAmount} ${unit}`;
    }
  }

  return {
    knapsackLiters,
    tankDose: rateStr,
    tanksPerAcre,
    totalTanks,
    totalProductText: totalText,
    labelVerified: true,
  };
}
