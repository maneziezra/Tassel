// CropGuard AI — crop calendar advisory (Maize, Tomato, Beans, Wheat, Potato).
//
// Revised from v1.0:
// - Pesticide doses removed ("follow the label"); restricted products replaced.
// - Wrong agronomy fixed: CAN is a top-dress, not a basal fertiliser; maize at
//   75×30 cm is ~17,800 plants/acre (v1.0 said 53,000); wheat seed rate is about
//   50 kg/acre (v1.0 said 100); potato seed is about 16–20 bags of 50 kg per acre
//   (v1.0 said 1,500 kg); "F1" removed from wheat (wheat varieties are not hybrids).
// - Unsupported claims (foliar feeds "boost grain set", brand-specific seeds) removed.

export type Product = { name: string; type: string; usage: string; icon: string };
export type Stage = { id: number; name: string; days: string; icon: string; activities: string[]; products: Product[] };
export type CropGuide = { id: string; name: string; icon: string; color: string; bg: string; season: string; duration: string; stages: Stage[] };

const LABEL = 'Follow the product label';

export const CROPS: CropGuide[] = [
  {
    id: 'maize', name: 'Maize', icon: 'corn', color: '#F9A825', bg: '#FFF8E1', season: 'Long & short rains', duration: '100–150 days (variety and altitude)',
    stages: [
      {
        id: 1, name: 'Land preparation', days: 'Before planting', icon: 'shovel',
        activities: [
          'Clear weeds and previous crop residue (bury residue to reduce leaf-spot diseases).',
          'Plough and harrow to a fine tilth before the rains.',
          'Take a soil sample to your county soil lab or a KALRO centre if you can — it tells you the right fertiliser.',
        ],
        products: [{ name: 'Pre-emergence herbicide registered for maize', type: 'Herbicide', usage: `Optional. ${LABEL}.`, icon: 'spray-bottle' }],
      },
      {
        id: 2, name: 'Planting', days: 'Onset of rains', icon: 'sprout',
        activities: [
          'Plant certified seed of a variety suited to your altitude, 5 cm deep.',
          'Spacing 75 × 30 cm, one seed per hole ≈ 17,800 plants per acre (about 44,000 per hectare).',
          'Place planting fertiliser in the furrow and cover it with a little soil before the seed.',
          'Certified seed is usually already treated — do not re-dress it.',
        ],
        products: [
          { name: 'Certified hybrid or OPV seed', type: 'Seed', usage: 'About 10 kg per acre', icon: 'sprout' },
          { name: 'DAP (18-46-0) or NPK', type: 'Fertilizer', usage: 'Common guide 50 kg/acre — a soil test gives your exact rate', icon: 'flask-outline' },
        ],
      },
      {
        id: 3, name: 'Vegetative', days: 'Weeks 2–7', icon: 'leaf',
        activities: [
          'First weeding 2–3 weeks after emergence; second weeding before top-dressing.',
          'Top-dress with nitrogen (CAN or urea) at knee height, placed 5–10 cm from the stem.',
          'Scout twice a week for fall armyworm: ragged leaves and droppings in the whorl.',
        ],
        products: [
          { name: 'CAN (26% N)', type: 'Fertilizer', usage: 'Common guide 50 kg/acre top-dress', icon: 'flask-outline' },
          { name: 'Fall armyworm control (emamectin benzoate, spinetoram or Bt)', type: 'Insecticide', usage: `Only if you find larvae. ${LABEL}.`, icon: 'spray-bottle' },
        ],
      },
      {
        id: 4, name: 'Tasselling & silking', days: 'Weeks 8–11', icon: 'flower',
        activities: [
          'The most water-sensitive stage — avoid drought stress if you can irrigate.',
          'Scout for grey leaf spot and northern leaf blight; scan suspicious leaves.',
          'Watch for maize lethal necrosis (leaves drying from the edges) and report it to your extension officer.',
        ],
        products: [{ name: 'Strobilurin + triazole fungicide', type: 'Fungicide', usage: `Only if lesions reach the ear leaf. ${LABEL}.`, icon: 'spray-bottle' }],
      },
      {
        id: 5, name: 'Grain filling', days: 'Weeks 12–16', icon: 'grain',
        activities: [
          'Keep the field weed-free.',
          'Prepare clean storage and hermetic bags before harvest.',
          'Check cobs for ear rots — rotten cobs can contain aflatoxin; keep them out of food and feed.',
        ],
        products: [{ name: 'Hermetic storage bags', type: 'Storage', usage: 'Chemical-free protection against weevils', icon: 'archive' }],
      },
      {
        id: 6, name: 'Harvest & storage', days: 'When husks are dry', icon: 'hand-back-right',
        activities: [
          'Harvest when husks are dry and grain is hard.',
          'Dry grain on tarpaulins (never on bare soil) to below 13.5% moisture before storage.',
          'Sort out mouldy, broken and insect-damaged grain to reduce aflatoxin risk.',
        ],
        products: [],
      },
    ],
  },
  {
    id: 'tomato', name: 'Tomato', icon: 'fruit-cherries', color: '#C62828', bg: '#FFEBEE', season: 'Year-round (irrigated)', duration: '90–150 days',
    stages: [
      {
        id: 1, name: 'Nursery', days: 'Weeks 0–4', icon: 'sprout',
        activities: [
          'Use a raised bed or trays with clean, well-drained media (sterilise soil by solarisation if reused).',
          'Sow 1 cm deep in rows; water gently, morning only — wet nurseries cause damping-off.',
          'Cover with insect-proof net to keep whiteflies off (they carry leaf curl virus).',
        ],
        products: [
          { name: 'Certified hybrid seed', type: 'Seed', usage: 'Choose varieties tolerant to local diseases (check the packet)', icon: 'sprout' },
          { name: 'Trichoderma-based biofungicide', type: 'Bio-input', usage: `Against damping-off. ${LABEL}.`, icon: 'leaf' },
        ],
      },
      {
        id: 2, name: 'Transplanting', days: 'Weeks 4–6', icon: 'hand-back-right',
        activities: [
          'Transplant at 4–6 true leaves, in the evening or on a cloudy day.',
          'Spacing about 60 × 45 cm (bush types) or 90 × 60 cm (staked types).',
          'Mix planting fertiliser well with soil in the hole and water immediately.',
          'Do not plant next to potatoes — late blight moves between them.',
        ],
        products: [{ name: 'DAP or NPK', type: 'Fertilizer', usage: 'About one teaspoon (5 g) per hole, mixed into the soil', icon: 'flask-outline' }],
      },
      {
        id: 3, name: 'Vegetative', days: 'Weeks 6–9', icon: 'leaf',
        activities: [
          'Stake or trellis before plants reach 30 cm.',
          'Remove side shoots (suckers) below the first flower cluster.',
          'Top-dress in small split doses as advised by your extension officer.',
          'Scout weekly for early blight, whiteflies and Tuta absoluta mines.',
        ],
        products: [
          { name: 'Yellow sticky traps', type: 'Monitoring', usage: 'For whiteflies and leaf miners', icon: 'sticker-outline' },
          { name: 'Neem-based insecticide', type: 'Bio-input', usage: LABEL, icon: 'leaf' },
        ],
      },
      {
        id: 4, name: 'Flowering', days: 'Weeks 9–12', icon: 'flower',
        activities: [
          'Water regularly — uneven watering causes blossom-end rot.',
          'Protect against blight in wet weather (check the Home screen blight risk).',
          'Use pheromone traps to monitor Tuta absoluta.',
        ],
        products: [
          { name: 'Protectant fungicide (copper or mancozeb)', type: 'Fungicide', usage: `${LABEL}. Mancozeb was under PCPB review in 2025.`, icon: 'spray-bottle' },
          { name: 'Tuta absoluta pheromone trap', type: 'Monitoring', usage: 'One or more per greenhouse / quarter acre', icon: 'sticker-outline' },
        ],
      },
      {
        id: 5, name: 'Fruiting & harvest', days: 'Weeks 12+', icon: 'basket',
        activities: [
          'Harvest at the colour stage your market wants; pick every 2–3 days.',
          'Handle gently and pack in clean crates.',
          'Check the pre-harvest interval on any product sprayed recently.',
        ],
        products: [{ name: 'Bacillus thuringiensis (Bt)', type: 'Bio-input', usage: `For fruitworm caterpillars. ${LABEL}.`, icon: 'leaf' }],
      },
    ],
  },
  {
    id: 'beans', name: 'Beans', icon: 'seed', color: '#558B2F', bg: '#F1F8E9', season: 'Long & short rains', duration: '60–90 days',
    stages: [
      {
        id: 1, name: 'Planting', days: 'Onset of rains', icon: 'sprout',
        activities: [
          'Use clean certified seed — many bean viruses are carried in seed.',
          'Treat seed with a Rhizobium inoculant just before planting, in the shade.',
          'Plant 3–5 cm deep at about 45–50 × 10–15 cm.',
          'Use a phosphorus fertiliser; beans need little nitrogen once nodules form.',
        ],
        products: [
          { name: 'Rhizobium inoculant for beans (e.g. BIOFIX)', type: 'Bio-input', usage: 'Follow the packet instructions', icon: 'leaf' },
          { name: 'DAP or TSP', type: 'Fertilizer', usage: 'A soil test gives your exact rate', icon: 'flask-outline' },
        ],
      },
      {
        id: 2, name: 'Vegetative', days: 'Weeks 2–5', icon: 'leaf',
        activities: [
          'Weed 2 and 4 weeks after emergence (shallow, to protect roots).',
          'Bean fly: early planting, mulching and earthing up soil around the stem help seedlings survive.',
          'Scout for aphids and rust pustules.',
        ],
        products: [{ name: 'Registered seed treatment or insecticide for bean fly', type: 'Insecticide', usage: `Dimethoate is now termiticide-only (PCPB 2025). ${LABEL}.`, icon: 'spray-bottle' }],
      },
      {
        id: 3, name: 'Flowering', days: 'Weeks 5–8', icon: 'flower',
        activities: ['Critical water period.', 'Do not weed during flowering — it knocks off flowers.', 'Scout for thrips and spider mites in dry weather.'],
        products: [{ name: 'Neem or insecticidal soap', type: 'Bio-input', usage: `For thrips and mites. ${LABEL}.`, icon: 'leaf' }],
      },
      {
        id: 4, name: 'Pod fill & harvest', days: 'Weeks 8–12', icon: 'hand-back-right',
        activities: ['Harvest when most pods are dry and yellow-brown.', 'Dry threshed beans to below 13% moisture.', 'Store in hermetic bags.'],
        products: [{ name: 'Hermetic storage bags', type: 'Storage', usage: 'Chemical-free protection against bruchids', icon: 'archive' }],
      },
    ],
  },
  {
    id: 'wheat', name: 'Wheat', icon: 'barley', color: '#795548', bg: '#EFEBE9', season: 'Highland, cool season', duration: '110–150 days',
    stages: [
      {
        id: 1, name: 'Land prep & planting', days: 'Weeks 0–2', icon: 'shovel',
        activities: [
          'Plough and harrow to a fine, firm seedbed.',
          'Drill certified seed 2–5 cm deep at about 50 kg per acre (125 kg/ha).',
          'Choose a KALRO variety rated tolerant to stem rust (Ug99) and yellow rust.',
        ],
        products: [
          { name: 'Certified rust-tolerant wheat seed', type: 'Seed', usage: 'About 50 kg per acre', icon: 'sprout' },
          { name: 'DAP', type: 'Fertilizer', usage: 'Common guide 50 kg/acre at planting', icon: 'flask-outline' },
        ],
      },
      {
        id: 2, name: 'Tillering', days: 'Weeks 4–8', icon: 'leaf',
        activities: ['Top-dress with CAN.', 'Control broadleaf and grass weeds early.', 'Scout for rust pustules on leaves and stems.'],
        products: [
          { name: 'CAN (26% N)', type: 'Fertilizer', usage: 'Common guide 50 kg/acre', icon: 'flask-outline' },
          { name: 'Registered wheat herbicide', type: 'Herbicide', usage: LABEL, icon: 'spray-bottle' },
        ],
      },
      {
        id: 3, name: 'Heading & grain fill', days: 'Weeks 9–16', icon: 'barley',
        activities: ['Protect the flag leaf — it feeds the grain.', 'Spray fungicide if rust or septoria reaches upper leaves.', 'Scout for aphids.'],
        products: [{ name: 'Triazole or strobilurin + triazole fungicide', type: 'Fungicide', usage: LABEL, icon: 'spray-bottle' }],
      },
      {
        id: 4, name: 'Harvest', days: 'Weeks 16–20', icon: 'hand-back-right',
        activities: ['Harvest when grain is hard and below about 14% moisture.', 'Dry to 12–13% before storage.', 'Store in clean bags off the floor.'],
        products: [],
      },
    ],
  },
  {
    id: 'potato', name: 'Potato', icon: 'circle-slice-8', color: '#5D4037', bg: '#EFEBE9', season: 'Highland, both rains', duration: '90–120 days',
    stages: [
      {
        id: 1, name: 'Land prep & planting', days: 'Weeks 0–2', icon: 'shovel',
        activities: [
          'Rotate: do not plant after potato, tomato or other solanaceous crops for 3 seasons (bacterial wilt).',
          'Plant whole certified seed tubers 10 cm deep, rows 75 cm apart, 30 cm within the row.',
          'Place planting fertiliser in the furrow and cover lightly before the seed.',
        ],
        products: [
          { name: 'Certified seed potato (e.g. Shangi)', type: 'Seed', usage: 'About 16–20 bags of 50 kg per acre', icon: 'sprout' },
          { name: 'DAP or NPK', type: 'Fertilizer', usage: 'A soil test gives your exact rate', icon: 'flask-outline' },
        ],
      },
      {
        id: 2, name: 'Emergence', days: 'Weeks 2–5', icon: 'sprout',
        activities: ['First weeding.', 'Hill up soil when plants are about 20 cm tall.', 'Start blight protection when cool, wet weather starts.'],
        products: [{ name: 'Protectant fungicide (mancozeb or copper)', type: 'Fungicide', usage: `${LABEL}. Mancozeb was under PCPB review in 2025.`, icon: 'spray-bottle' }],
      },
      {
        id: 3, name: 'Vegetative & bulking', days: 'Weeks 5–11', icon: 'leaf',
        activities: [
          'Second hilling to cover developing tubers.',
          'In wet weather, use a systemic blight product and rotate chemical groups.',
          'Remove wilting plants with their tubers (bacterial wilt) — do not leave them in the field.',
        ],
        products: [{ name: 'Systemic blight fungicide (e.g. metalaxyl-M, dimethomorph or cymoxanil mixes)', type: 'Fungicide', usage: LABEL, icon: 'spray-bottle' }],
      },
      {
        id: 4, name: 'Maturity & harvest', days: 'Weeks 12–16', icon: 'hand-back-right',
        activities: [
          'Stop irrigation about 2 weeks before harvest.',
          'Cut the haulms and leave tubers in the soil about 2 weeks so the skins harden.',
          'Harvest on a dry day, avoid bruising, and store in a dark, cool, airy place.',
        ],
        products: [],
      },
    ],
  },
];

export const PRODUCT_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  // Mche tints. The label always carries the meaning; colour only groups.
  Seed: { bg: '#DCEFE7', text: '#0E5C43' },
  Fertilizer: { bg: '#FCF0CF', text: '#7A5300' },
  Herbicide: { bg: '#E7E3F4', text: '#5B4BA0' },
  Fungicide: { bg: '#F6E1D9', text: '#A33A1F' },
  Insecticide: { bg: '#DCE8F4', text: '#24609B' },
  Storage: { bg: '#EEF3F0', text: '#2C4A41' },
  Monitoring: { bg: '#DCE8F4', text: '#17385A' },
  'Bio-input': { bg: '#DCEFE7', text: '#0E5C43' },
};

/** Fertiliser calculator: guide rates are pre-filled but editable, so a farmer can enter the rate from a soil test. */
export const FERTILIZERS = [
  { name: 'DAP 18-46-0', use: 'Planting', guideKgPerAcre: 50 },
  { name: 'NPK 17-17-17', use: 'Planting', guideKgPerAcre: 50 },
  { name: 'TSP 46% P₂O₅', use: 'Planting', guideKgPerAcre: 50 },
  { name: 'CAN 26% N', use: 'Top-dress', guideKgPerAcre: 50 },
  { name: 'Urea 46% N', use: 'Top-dress', guideKgPerAcre: 30 },
  { name: 'MOP (potash) 60% K₂O', use: 'Only if soil test shows low K', guideKgPerAcre: 25 },
];
