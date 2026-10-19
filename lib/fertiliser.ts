// Tassel — fertiliser planner.
//
// Common guide rates for Kenyan smallholders (kg per acre), the same ones the
// season guides use. A soil test from a county soil lab or KALRO always beats
// these, so every rate is editable. When a farmer swaps one fertiliser for
// another in the same role, the amount is recalculated so the crop gets the
// same main nutrient (phosphorus at planting, nitrogen at top-dress):
//   kg_new = kg_reference × (% nutrient in reference) ÷ (% nutrient in new)
// e.g. 50 kg CAN (26% N) ≈ 28 kg urea (46% N).

export type FertId = 'DAP' | 'NPK' | 'TSP' | 'CAN' | 'Urea' | 'MOP';
export type Nutrient = 'N' | 'P' | 'K';

export type Fertiliser = {
  id: FertId;
  name: string;
  grade: string;
  nutrient: Nutrient; // the nutrient this product is bought for
  pct: number; // % of that nutrient (N, P₂O₅ or K₂O)
  looks: string; // how to recognise it in the shop
  image: number;
};

export const FERTS: Record<FertId, Fertiliser> = {
  DAP: { id: 'DAP', name: 'DAP', grade: '18-46-0', nutrient: 'P', pct: 46, looks: 'Dark grey to black granules', image: require('../assets/art/fert-dap.png') },
  NPK: { id: 'NPK', name: 'NPK', grade: '23-23-0', nutrient: 'P', pct: 23, looks: 'Mixed grey, white and pink granules', image: require('../assets/art/fert-npk.png') },
  TSP: { id: 'TSP', name: 'TSP', grade: '0-46-0', nutrient: 'P', pct: 46, looks: 'Grey granules', image: require('../assets/art/fert-tsp.png') },
  CAN: { id: 'CAN', name: 'CAN', grade: '26% N', nutrient: 'N', pct: 26, looks: 'Beige to light grey granules', image: require('../assets/art/fert-can.png') },
  Urea: { id: 'Urea', name: 'Urea', grade: '46% N', nutrient: 'N', pct: 46, looks: 'Small white beads', image: require('../assets/art/fert-urea.png') },
  MOP: { id: 'MOP', name: 'MOP', grade: '0-0-60', nutrient: 'K', pct: 60, looks: 'Pink to red crystals', image: require('../assets/art/fert-mop.png') },
};

export type Application = {
  key: 'plant' | 'top';
  title: string; // "At planting"
  when: string; // short timing
  how: string; // short placement
  ref: FertId; // the product the guide rate is written for
  refKgPerAcre: number;
  options: FertId[];
};

export type CropPlan = { crop: string; apps: Application[] };

const PLANT_OPTIONS: FertId[] = ['DAP', 'NPK', 'TSP'];
const TOP_OPTIONS: FertId[] = ['CAN', 'Urea'];

export const PLANS: CropPlan[] = [
  {
    crop: 'Maize',
    apps: [
      { key: 'plant', title: 'At planting', when: 'Day 0', how: 'In the furrow, covered with a little soil before the seed', ref: 'DAP', refKgPerAcre: 50, options: PLANT_OPTIONS },
      { key: 'top', title: 'Top-dress', when: 'Knee height, weeks 4–6', how: '5–10 cm from the stem, on moist soil', ref: 'CAN', refKgPerAcre: 50, options: TOP_OPTIONS },
    ],
  },
  {
    crop: 'Beans',
    apps: [{ key: 'plant', title: 'At planting', when: 'Day 0', how: 'In the furrow; beans make most of their own nitrogen', ref: 'DAP', refKgPerAcre: 50, options: PLANT_OPTIONS }],
  },
  {
    crop: 'Potato',
    apps: [
      { key: 'plant', title: 'At planting', when: 'Day 0', how: 'In the furrow, mixed with soil, then the seed tubers', ref: 'DAP', refKgPerAcre: 200, options: ['DAP', 'NPK'] },
      { key: 'top', title: 'Top-dress', when: 'First hilling, weeks 4–5', how: 'Around the plants, then hill the soil over it', ref: 'CAN', refKgPerAcre: 50, options: TOP_OPTIONS },
    ],
  },
  {
    crop: 'Tomato',
    apps: [
      { key: 'plant', title: 'At transplanting', when: 'Day 0', how: 'Mixed into each planting hole', ref: 'DAP', refKgPerAcre: 80, options: PLANT_OPTIONS },
      { key: 'top', title: 'Top-dress', when: 'Weeks 3–4, in small split doses', how: 'Around each plant, then water', ref: 'CAN', refKgPerAcre: 50, options: TOP_OPTIONS },
    ],
  },
  {
    crop: 'Wheat',
    apps: [
      { key: 'plant', title: 'At planting', when: 'Day 0', how: 'Drilled with the seed', ref: 'DAP', refKgPerAcre: 50, options: PLANT_OPTIONS },
      { key: 'top', title: 'Top-dress', when: 'Tillering, weeks 4–6', how: 'Broadcast evenly before rain', ref: 'CAN', refKgPerAcre: 40, options: TOP_OPTIONS },
    ],
  },
];

export function planFor(crop: string | null | undefined): CropPlan {
  const c = (crop ?? '').toLowerCase();
  return (
    PLANS.find((p) => c.includes(p.crop.toLowerCase())) ??
    (/mahindi|corn/.test(c) ? PLANS[0] : /maharag/.test(c) ? PLANS[1] : /viazi/.test(c) ? PLANS[2] : /nyanya/.test(c) ? PLANS[3] : /ngano/.test(c) ? PLANS[4] : PLANS[0])
  );
}

/** Rate (kg per acre) of `product` that gives the same main nutrient as the guide's reference product. */
export function equivalentRate(app: Application, product: FertId, refRate = app.refKgPerAcre): number {
  const ref = FERTS[app.ref];
  const p = FERTS[product];
  if (ref.nutrient !== p.nutrient) return refRate;
  return Math.round((refRate * ref.pct) / p.pct);
}

export const BAG_KG = 50;

/** 145 kg → { bags: 2, extraKg: 45, exactBags: 2.9 }. Under one bag, extraKg is the whole amount. */
export function toBags(kg: number): { bags: number; extraKg: number; exactBags: number } {
  const whole = Math.round(kg);
  const bags = Math.floor(whole / BAG_KG);
  return { bags, extraKg: whole - bags * BAG_KG, exactBags: kg / BAG_KG };
}
