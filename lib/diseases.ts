// CropGuard AI — treatment knowledge base for the 38 classes the scanner can detect.
//
// v2.0 methodology (replaces the v1.0 free-text advice + keyword "3-pillar" parser):
// - Every class has explicit cultural, biological and chemical options written
//   for that disease. Nothing is guessed from keywords.
// - Chemical options name the ACTIVE INGREDIENT only, never a dose. The farmer
//   is told to use a PCPB-registered product for the crop and follow its label.
// - Active ingredients withdrawn or restricted by Kenya's Pest Control Products
//   Board in its June 2025 review are NOT recommended for open-field use:
//   chlorothalonil (withdrawn), chlorpyrifos and dimethoate (termiticide only),
//   imidacloprid and abamectin (not for open fields), iprodione (not on edible
//   crops). Mancozeb was "under review" at that date, so it carries a warning.
// - Specific variety names and yield-loss percentages that could not be
//   verified were removed.

import { CHEMICAL_RULES_SW, CROP_SW, PEST_HINTS_SW, SW_DISEASES } from './diseases.sw';
import { getLang, tr, type Lang } from './i18n';

export type Kind = 'Fungal' | 'Oomycete' | 'Bacterial' | 'Viral' | 'Pest' | 'Healthy';
export type Urgency = 'low' | 'medium' | 'high' | 'critical';

export type Chemical = { active: string; note?: string };

export type DiseaseInfo = {
  label: string;
  crop: string;
  disease: string;
  kind: Kind;
  pathogen: string | null;
  symptoms: string;
  spread: string | null;
  urgency: Urgency;
  kenya: string | null;
  cultural: string[];
  biological: string[];
  chemical: Chemical[];
  notifiable?: boolean;
};

export const MANCOZEB_NOTE = 'Mancozeb was under PCPB review in 2025 — confirm the product is still registered.';
export const CHEMICAL_RULES =
  'Use only products registered by the Pest Control Products Board (PCPB) for this crop. Follow the label rate, wear gloves, mask and boots, never mix products unless the label allows it, and respect the pre-harvest interval.';

const COPPER: Chemical = { active: 'Copper (copper hydroxide or copper oxychloride)' };
const MANCOZEB: Chemical = { active: 'Mancozeb', note: MANCOZEB_NOTE };

function healthy(label: string, crop: string, tips: string[]): DiseaseInfo {
  return {
    label,
    crop,
    disease: 'Healthy',
    kind: 'Healthy',
    pathogen: null,
    symptoms: 'No disease symptoms were detected on this leaf.',
    spread: null,
    urgency: 'low',
    kenya: null,
    cultural: tips,
    biological: [],
    chemical: [],
  };
}

const LIST: DiseaseInfo[] = [
  // ───────────── Apple ─────────────
  {
    label: 'Apple___Apple_scab',
    crop: 'Apple',
    disease: 'Apple scab',
    kind: 'Fungal',
    pathogen: 'Venturia inaequalis',
    symptoms: 'Olive-green to brown velvety spots on leaves and fruit; leaves may yellow and drop early.',
    spread: 'Spores from fallen infected leaves, splashed by rain in cool wet weather.',
    urgency: 'medium',
    kenya: 'Apples are grown on a small scale in Kenyan highlands where cool, wet weather favours scab.',
    cultural: [
      'Rake up and destroy fallen leaves to remove the source of spores.',
      'Prune to open the canopy so leaves dry quickly.',
      'Plant scab-tolerant varieties when replacing trees.',
    ],
    biological: ['Bacillus subtilis-based biofungicides can reduce infection when applied before rain.'],
    chemical: [{ active: 'Captan' }, { active: 'Difenoconazole' }, MANCOZEB],
  },
  {
    label: 'Apple___Black_rot',
    crop: 'Apple',
    disease: 'Black rot',
    kind: 'Fungal',
    pathogen: 'Botryosphaeria obtusa',
    symptoms: 'Brown leaf spots with purple edges ("frog-eye"), black rotting fruit and sunken cankers on branches.',
    spread: 'Spores from cankers and mummified fruit, spread by rain in warm humid weather.',
    urgency: 'high',
    kenya: null,
    cultural: [
      'Cut out cankers and dead wood 15 cm below the visible damage and burn them.',
      'Remove mummified fruit from the tree and the ground.',
      'Disinfect pruning tools between trees.',
    ],
    biological: [],
    chemical: [COPPER, { active: 'Captan' }],
  },
  {
    label: 'Apple___Cedar_apple_rust',
    crop: 'Apple',
    disease: 'Cedar apple rust',
    kind: 'Fungal',
    pathogen: 'Gymnosporangium juniperi-virginianae',
    symptoms: 'Bright orange-yellow spots on the upper leaf surface with small tube-like growths underneath.',
    spread: 'Needs juniper (cedar) trees nearby to complete its life cycle; spores blow to apple in spring.',
    urgency: 'medium',
    kenya: 'Low risk in Kenya because it needs particular juniper hosts nearby.',
    cultural: ['Remove nearby juniper/cedar hosts where practical.', 'Choose rust-resistant apple varieties.'],
    biological: [],
    chemical: [{ active: 'Myclobutanil' }, MANCOZEB],
  },
  healthy('Apple___healthy', 'Apple', ['Keep pruning for airflow and remove fallen leaves.', 'Feed with balanced fertiliser based on a soil test.']),

  // ───────────── Blueberry ─────────────
  healthy('Blueberry___healthy', 'Blueberry', ['Blueberries need acidic soil (pH about 4.5–5.5); test soil before planting.', 'Mulch to keep roots cool and moist.']),

  // ───────────── Cherry ─────────────
  {
    label: 'Cherry_(including_sour)___Powdery_mildew',
    crop: 'Cherry',
    disease: 'Powdery mildew',
    kind: 'Fungal',
    pathogen: 'Podosphaera clandestina',
    symptoms: 'White powdery patches on young leaves; leaves curl and become distorted.',
    spread: 'Airborne spores; favoured by warm days, cool nights and shade. Does not need rain.',
    urgency: 'medium',
    kenya: null,
    cultural: ['Prune for sunlight and airflow.', 'Avoid excess nitrogen that produces soft new growth.'],
    biological: ['Potassium bicarbonate sprays.', 'Bacillus subtilis-based biofungicides.'],
    chemical: [{ active: 'Sulphur', note: 'Do not spray sulphur in very hot weather (above about 30 °C).' }, { active: 'Myclobutanil' }],
  },
  healthy('Cherry_(including_sour)___healthy', 'Cherry', ['Keep monitoring new shoots weekly.', 'Prune after harvest to keep the canopy open.']),

  // ───────────── Maize ─────────────
  {
    label: 'Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot',
    crop: 'Maize',
    disease: 'Grey leaf spot',
    kind: 'Fungal',
    pathogen: 'Cercospora zeae-maydis',
    symptoms: 'Long, narrow, rectangular grey-tan lesions running between the leaf veins, starting on lower leaves.',
    spread: 'Survives on maize residue left on the surface; spreads in warm, humid weather with long leaf wetness.',
    urgency: 'high',
    kenya: 'An important maize disease in Kenya, especially in humid western and Rift Valley areas.',
    cultural: [
      'Rotate maize with beans, soybean or another non-cereal for at least one season.',
      'Bury or remove maize residue after harvest.',
      'Ask your agro-dealer for hybrids rated tolerant to grey leaf spot (check the seed packet).',
    ],
    biological: [],
    chemical: [
      { active: 'Azoxystrobin + propiconazole (or another strobilurin + triazole mix)', note: 'Most useful around tasselling if lesions are climbing the plant.' },
    ],
  },
  {
    label: 'Corn_(maize)___Common_rust_',
    crop: 'Maize',
    disease: 'Common rust',
    kind: 'Fungal',
    pathogen: 'Puccinia sorghi',
    symptoms: 'Small oval brick-red to brown powdery pustules on both sides of the leaf.',
    spread: 'Wind-blown spores; favoured by cool, humid weather.',
    urgency: 'medium',
    kenya: 'Common in highland maize zones in cool, wet seasons.',
    cultural: ['Plant rust-tolerant hybrids.', 'Plant early in the season so the crop matures before cool wet spells.', 'Scout weekly from knee height.'],
    biological: [],
    chemical: [{ active: 'Propiconazole' }, { active: 'Azoxystrobin + propiconazole' }, MANCOZEB],
  },
  {
    label: 'Corn_(maize)___Northern_Leaf_Blight',
    crop: 'Maize',
    disease: 'Northern leaf blight',
    kind: 'Fungal',
    pathogen: 'Exserohilum turcicum (Setosphaeria turcica)',
    symptoms: 'Long cigar-shaped grey-green to tan lesions, 3–15 cm long, starting on lower leaves.',
    spread: 'Spores from infected residue, spread by wind and rain in moderate temperatures with heavy dew.',
    urgency: 'high',
    kenya: 'Common in Kenyan highland maize; worst in cool, humid seasons.',
    cultural: ['Rotate away from maize for a season.', 'Bury or remove crop residue after harvest.', 'Use certified seed of tolerant hybrids.'],
    biological: [],
    chemical: [{ active: 'Azoxystrobin + propiconazole' }, { active: 'Propiconazole' }, MANCOZEB],
  },
  healthy('Corn_(maize)___healthy', 'Maize', [
    'Top-dress with nitrogen (e.g. CAN) at about knee height, at the rate your soil test or extension officer recommends.',
    'Scout weekly for fall armyworm in the whorl — this scanner does not detect insects.',
  ]),

  // ───────────── Grape ─────────────
  {
    label: 'Grape___Black_rot',
    crop: 'Grape',
    disease: 'Black rot',
    kind: 'Fungal',
    pathogen: 'Guignardia bidwellii',
    symptoms: 'Tan leaf spots with dark borders; berries shrivel into hard black "mummies".',
    spread: 'Spores from mummies and canes, spread by rain in warm wet weather.',
    urgency: 'high',
    kenya: null,
    cultural: ['Remove all mummified berries and infected canes.', 'Train and prune vines so the canopy dries fast.'],
    biological: [],
    chemical: [MANCOZEB, { active: 'Myclobutanil' }, { active: 'Captan' }],
  },
  {
    label: 'Grape___Esca_(Black_Measles)',
    crop: 'Grape',
    disease: 'Esca (black measles)',
    kind: 'Fungal',
    pathogen: 'Wood-rotting fungal complex (Phaeomoniella chlamydospora and others)',
    symptoms: '"Tiger-stripe" yellow and brown patches between leaf veins; dark spots on berries; internal wood decay.',
    spread: 'Fungi enter through pruning wounds.',
    urgency: 'high',
    kenya: null,
    cultural: ['Prune in dry weather and burn infected wood.', 'Seal large pruning wounds.', 'Remove badly affected vines.'],
    biological: ['Trichoderma-based wound protectants can reduce new infections of pruning wounds.'],
    chemical: [{ active: 'No curative spray exists', note: 'Management is by removing infected wood and protecting wounds.' }],
  },
  {
    label: 'Grape___Leaf_blight_(Isariopsis_Leaf_Spot)',
    crop: 'Grape',
    disease: 'Leaf blight (Isariopsis leaf spot)',
    kind: 'Fungal',
    pathogen: 'Pseudocercospora vitis (Isariopsis clavispora)',
    symptoms: 'Irregular dark red-brown spots with yellow halos on older leaves; leaves may drop.',
    spread: 'Rain-splashed spores in warm humid weather.',
    urgency: 'medium',
    kenya: null,
    cultural: ['Remove and destroy infected leaves.', 'Avoid wetting leaves when irrigating.'],
    biological: [],
    chemical: [COPPER, MANCOZEB],
  },
  healthy('Grape___healthy', 'Grape', ['Keep vines trellised and pruned for airflow.', 'Inspect leaves weekly in wet weather.']),

  // ───────────── Orange ─────────────
  {
    label: 'Orange___Haunglongbing_(Citrus_greening)',
    crop: 'Orange',
    disease: 'Citrus greening (HLB)',
    kind: 'Bacterial',
    pathogen: 'Candidatus Liberibacter spp., spread by citrus psyllid insects',
    symptoms: 'Blotchy, uneven yellowing of leaves (not symmetrical across the midrib); small, lopsided, bitter fruit.',
    spread: 'Carried by psyllid insects and by infected budwood or seedlings.',
    urgency: 'critical',
    kenya: 'Citrus greening has been reported in Kenya. Report suspected trees to your county agricultural officer or KEPHIS.',
    cultural: [
      'There is no cure. Remove and destroy infected trees to protect the rest of the orchard.',
      'Buy seedlings only from certified, disease-free nurseries.',
      'Inspect new flush for psyllids every week.',
    ],
    biological: [],
    chemical: [{ active: 'Psyllid control with a PCPB-registered insecticide', note: 'Imidacloprid is restricted to non-open-field use since 2025 — ask your extension officer.' }],
    notifiable: true,
  },

  // ───────────── Peach ─────────────
  {
    label: 'Peach___Bacterial_spot',
    crop: 'Peach',
    disease: 'Bacterial spot',
    kind: 'Bacterial',
    pathogen: 'Xanthomonas arboricola pv. pruni',
    symptoms: 'Small water-soaked spots that turn brown-purple and fall out, leaving "shot holes"; sunken spots on fruit.',
    spread: 'Rain splash and wind-driven rain; enters through natural openings and wounds.',
    urgency: 'medium',
    kenya: null,
    cultural: ['Avoid overhead irrigation.', 'Prune infected twigs in dry weather.', 'Choose tolerant varieties when planting.'],
    biological: [],
    chemical: [{ ...COPPER, note: 'Copper protects new growth; it does not cure existing spots.' }],
  },
  healthy('Peach___healthy', 'Peach', ['Thin fruit for better size.', 'Prune to an open centre for light and airflow.']),

  // ───────────── Pepper ─────────────
  {
    label: 'Pepper,_bell___Bacterial_spot',
    crop: 'Pepper (capsicum)',
    disease: 'Bacterial spot',
    kind: 'Bacterial',
    pathogen: 'Xanthomonas euvesicatoria (and related Xanthomonas species)',
    symptoms: 'Small water-soaked leaf spots that turn brown with yellow edges; raised scabby spots on fruit; leaf drop.',
    spread: 'Infected seed, rain splash, and handling wet plants.',
    urgency: 'medium',
    kenya: 'Common in capsicum during rainy seasons.',
    cultural: [
      'Use certified, clean seed and healthy seedlings.',
      'Do not work in the crop when leaves are wet.',
      'Remove badly infected plants; rotate away from pepper and tomato for 2 seasons.',
    ],
    biological: [],
    chemical: [{ ...COPPER, note: 'Spray protectively in wet weather; copper does not cure infected leaves.' }],
  },
  healthy('Pepper,_bell___healthy', 'Pepper (capsicum)', ['Water at the base, not over the leaves.', 'Stake plants to keep fruit off the soil.']),

  // ───────────── Potato ─────────────
  {
    label: 'Potato___Early_blight',
    crop: 'Potato',
    disease: 'Early blight',
    kind: 'Fungal',
    pathogen: 'Alternaria solani',
    symptoms: 'Dark brown spots with rings like a target, often with a yellow halo, starting on older lower leaves.',
    spread: 'Spores from infected debris and soil, spread by wind and rain; worse on stressed plants.',
    urgency: 'medium',
    kenya: 'Common in Kenyan potato areas such as Nyandarua, Meru and Bomet.',
    cultural: ['Remove infected lower leaves.', 'Keep plants well fed and watered — stress makes it worse.', 'Rotate with non-solanaceous crops (not tomato, pepper or eggplant).'],
    biological: ['Bacillus subtilis-based biofungicides as a protectant.'],
    chemical: [MANCOZEB, { active: 'Azoxystrobin' }, { active: 'Difenoconazole' }],
  },
  {
    label: 'Potato___Late_blight',
    crop: 'Potato',
    disease: 'Late blight',
    kind: 'Oomycete',
    pathogen: 'Phytophthora infestans (a water mould, not a true fungus)',
    symptoms: 'Large dark water-soaked patches on leaves, white mould on the underside in humid weather, brown rot in tubers.',
    spread: 'Spores spread by wind and rain; extremely fast in cool (10–25 °C), wet, humid weather.',
    urgency: 'critical',
    kenya: 'The most destructive potato disease in Kenya\'s highlands. A whole field can be lost in about a week of wet weather.',
    cultural: [
      'Remove and bury (do not compost) infected plants immediately.',
      'Hill up soil around stems to protect tubers.',
      'Use certified seed potatoes and plant tolerant varieties.',
      'Cut and remove foliage 2 weeks before harvest if blight is present.',
    ],
    biological: [],
    chemical: [
      { active: 'Metalaxyl-M + mancozeb', note: 'Systemic + protectant. ' + MANCOZEB_NOTE },
      { active: 'Cymoxanil + mancozeb' },
      { active: 'Dimethomorph or propamocarb-based products' },
      { active: 'Rotate product groups', note: 'Phytophthora becomes resistant to metalaxyl if it is used alone repeatedly.' },
    ],
  },
  healthy('Potato___healthy', 'Potato', [
    'Start preventive blight protection when cool, wet weather begins — check the Home screen blight risk.',
    'Hill up soil around stems as plants grow.',
  ]),

  // ───────────── Others ─────────────
  healthy('Raspberry___healthy', 'Raspberry', ['Prune out old canes after fruiting.', 'Keep rows narrow for airflow.']),
  healthy('Soybean___healthy', 'Soybean', ['Inoculate seed with a soybean Rhizobium inoculant before planting.', 'Weed early — soybean competes poorly in the first 6 weeks.']),
  {
    label: 'Squash___Powdery_mildew',
    crop: 'Squash',
    disease: 'Powdery mildew',
    kind: 'Fungal',
    pathogen: 'Podosphaera xanthii',
    symptoms: 'White powdery patches on upper leaf surfaces; leaves yellow and die early.',
    spread: 'Airborne spores; common in dry weather with humid nights.',
    urgency: 'medium',
    kenya: null,
    cultural: ['Remove heavily infected leaves.', 'Space plants for airflow.'],
    biological: ['Potassium bicarbonate sprays.', 'Bacillus subtilis-based biofungicides.'],
    chemical: [{ active: 'Sulphur', note: 'Some squash varieties are sulphur-sensitive; test on a few plants first and avoid hot weather.' }],
  },
  {
    label: 'Strawberry___Leaf_scorch',
    crop: 'Strawberry',
    disease: 'Leaf scorch',
    kind: 'Fungal',
    pathogen: 'Diplocarpon earlianum',
    symptoms: 'Many small dark purple spots that merge until the leaf looks scorched.',
    spread: 'Rain splash from infected leaves.',
    urgency: 'medium',
    kenya: null,
    cultural: ['Remove and destroy infected leaves.', 'Use drip irrigation rather than overhead.', 'Renew beds every 2–3 years.'],
    biological: [],
    chemical: [{ active: 'Captan' }, COPPER],
  },
  healthy('Strawberry___healthy', 'Strawberry', ['Remove runners if you want bigger berries.', 'Mulch with straw to keep fruit clean.']),

  // ───────────── Tomato ─────────────
  {
    label: 'Tomato___Bacterial_spot',
    crop: 'Tomato',
    disease: 'Bacterial spot',
    kind: 'Bacterial',
    pathogen: 'Xanthomonas spp. (X. vesicatoria and related species)',
    symptoms: 'Tiny dark water-soaked spots on leaves and fruit, sometimes with yellow halos; scabby fruit spots.',
    spread: 'Infected seed, rain splash and handling wet plants.',
    urgency: 'medium',
    kenya: 'Common on open-field tomatoes in the rainy season.',
    cultural: ['Use clean certified seed.', 'Remove infected leaves; avoid working in wet plants.', 'Use drip irrigation and mulch.'],
    biological: [],
    chemical: [{ ...COPPER, note: 'Protective only — start early in wet weather.' }],
  },
  {
    label: 'Tomato___Early_blight',
    crop: 'Tomato',
    disease: 'Early blight',
    kind: 'Fungal',
    pathogen: 'Alternaria solani',
    symptoms: 'Dark target-like ring spots with yellow halos on older leaves; dark sunken spots on stems (collar rot).',
    spread: 'Spores from debris and soil splash; worse on stressed plants in warm humid weather.',
    urgency: 'medium',
    kenya: 'One of the most common tomato diseases in Kenya.',
    cultural: [
      'Remove lower infected leaves and burn or bury them.',
      'Mulch to stop soil splashing onto leaves.',
      'Stake and prune for airflow; rotate away from tomato, potato and pepper.',
    ],
    biological: ['Bacillus subtilis-based biofungicides.'],
    chemical: [
      MANCOZEB,
      { active: 'Azoxystrobin' },
      { active: 'Difenoconazole' },
      { active: 'Chlorothalonil is no longer an option', note: 'Withdrawn from the Kenyan market by PCPB in 2025.' },
    ],
  },
  {
    label: 'Tomato___Late_blight',
    crop: 'Tomato',
    disease: 'Late blight',
    kind: 'Oomycete',
    pathogen: 'Phytophthora infestans (a water mould, not a true fungus)',
    symptoms: 'Large brown-black water-soaked blotches, white mould under leaves in humid weather, firm brown fruit rot.',
    spread: 'Wind and rain carry spores; spreads explosively in cool, wet, humid weather.',
    urgency: 'critical',
    kenya: 'Severe on open-field tomatoes in Kenya\'s cool, wet seasons; often comes from nearby potato fields.',
    cultural: [
      'Remove and destroy infected plants immediately — do not compost.',
      'Do not plant tomatoes next to potatoes.',
      'Stake, prune and space plants so leaves dry quickly.',
    ],
    biological: [],
    chemical: [
      { active: 'Metalaxyl-M + mancozeb', note: MANCOZEB_NOTE },
      { active: 'Cymoxanil + mancozeb' },
      { active: 'Dimethomorph or propamocarb-based products' },
      { active: 'Rotate product groups', note: 'Avoid using metalaxyl products back-to-back.' },
    ],
  },
  {
    label: 'Tomato___Leaf_Mold',
    crop: 'Tomato',
    disease: 'Leaf mould',
    kind: 'Fungal',
    pathogen: 'Passalora fulva (Fulvia fulva)',
    symptoms: 'Pale yellow patches on the upper leaf with olive-brown velvety mould underneath.',
    spread: 'Airborne spores; thrives above about 85% humidity, common in greenhouses.',
    urgency: 'medium',
    kenya: 'Mostly a greenhouse and tunnel problem.',
    cultural: ['Open vents and doors to lower humidity.', 'Prune lower leaves and space plants.', 'Water in the morning at the base.'],
    biological: [],
    chemical: [COPPER, { active: 'Difenoconazole' }],
  },
  {
    label: 'Tomato___Septoria_leaf_spot',
    crop: 'Tomato',
    disease: 'Septoria leaf spot',
    kind: 'Fungal',
    pathogen: 'Septoria lycopersici',
    symptoms: 'Many small round spots with dark edges and pale centres containing tiny black dots, starting low on the plant.',
    spread: 'Rain splash from debris and infected leaves.',
    urgency: 'medium',
    kenya: 'Common during the long rains.',
    cultural: ['Remove infected lower leaves.', 'Mulch and avoid overhead watering.', 'Rotate for 2 seasons away from tomato.'],
    biological: [],
    chemical: [MANCOZEB, COPPER, { active: 'Azoxystrobin' }],
  },
  {
    label: 'Tomato___Spider_mites Two-spotted_spider_mite',
    crop: 'Tomato',
    disease: 'Spider mites',
    kind: 'Pest',
    pathogen: 'Tetranychus urticae (two-spotted spider mite)',
    symptoms: 'Fine yellow speckling, bronzed leaves and fine webbing on the underside.',
    spread: 'Mites walk and blow between plants; populations explode in hot dry weather.',
    urgency: 'high',
    kenya: 'Common in hot, dry lowland areas and greenhouses.',
    cultural: ['Spray the underside of leaves with water to knock mites off.', 'Remove heavily infested leaves.', 'Avoid broad-spectrum insecticides that kill natural enemies.'],
    biological: ['Predatory mites (Phytoseiulus persimilis) are sold in Kenya for biological control.', 'Neem-based or insecticidal soap sprays on leaf undersides.'],
    chemical: [
      { active: 'Spiromesifen or another PCPB-registered miticide' },
      { active: 'Abamectin is restricted', note: 'Not for open-field use since the 2025 PCPB review.' },
    ],
  },
  {
    label: 'Tomato___Target_Spot',
    crop: 'Tomato',
    disease: 'Target spot',
    kind: 'Fungal',
    pathogen: 'Corynespora cassiicola',
    symptoms: 'Round brown spots with faint rings and yellow halos on leaves, stems and fruit.',
    spread: 'Spores from debris; favoured by warm humid weather.',
    urgency: 'medium',
    kenya: 'Easily confused with early blight — the treatment is similar.',
    cultural: ['Remove infected leaves.', 'Improve spacing and pruning for airflow.', 'Clear crop debris after harvest.'],
    biological: [],
    chemical: [{ active: 'Azoxystrobin' }, { active: 'Difenoconazole' }, MANCOZEB],
  },
  {
    label: 'Tomato___Tomato_Yellow_Leaf_Curl_Virus',
    crop: 'Tomato',
    disease: 'Yellow leaf curl virus (TYLCV)',
    kind: 'Viral',
    pathogen: 'Tomato yellow leaf curl virus, carried by the whitefly Bemisia tabaci',
    symptoms: 'Leaves curl upward and turn yellow at the edges; plants are stunted and set little fruit.',
    spread: 'Only by whiteflies (and infected seedlings). Not spread by touch.',
    urgency: 'high',
    kenya: 'Present in Kenya; managing whiteflies is the main prevention.',
    cultural: [
      'There is no cure. Uproot and destroy infected plants (bag them first so whiteflies don\'t escape).',
      'Raise seedlings under insect-proof net.',
      'Use yellow sticky traps; remove weeds that host whiteflies.',
      'Ask your agro-dealer for TYLCV-tolerant varieties.',
    ],
    biological: ['Neem-based sprays reduce whitefly numbers.'],
    chemical: [
      { active: 'Whitefly control with a PCPB-registered product (e.g. spiromesifen)', note: 'Sprays control the insect, not the virus.' },
      { active: 'Imidacloprid', note: 'Restricted to greenhouse (non-open-field) use since 2025.' },
    ],
  },
  {
    label: 'Tomato___Tomato_mosaic_virus',
    crop: 'Tomato',
    disease: 'Mosaic virus (ToMV)',
    kind: 'Viral',
    pathogen: 'Tomato mosaic virus',
    symptoms: 'Light and dark green mosaic pattern; leaves wrinkled or fern-like; uneven fruit ripening.',
    spread: 'By hands, tools and clothing, and on seed. Very stable — survives on surfaces and in debris.',
    urgency: 'high',
    kenya: null,
    cultural: [
      'There is no cure. Remove infected plants carefully and destroy them.',
      'Wash hands with soap and dip tools in 10% household bleach between plants.',
      'Do not smoke or handle tobacco near tomatoes.',
      'Use certified seed and resistant varieties.',
    ],
    biological: [],
    chemical: [{ active: 'No spray controls this virus', note: 'Hygiene is the only control.' }],
  },
  healthy('Tomato___healthy', 'Tomato', ['Stake and prune for airflow.', 'Water at the base in the morning; mulch to stop soil splash.']),
];

export const DISEASES: Record<string, DiseaseInfo> = Object.fromEntries(LIST.map((d) => [d.label, d]));
export const ALL_DISEASES = LIST;
export const DETECTABLE_CROPS = Array.from(new Set(LIST.map((d) => d.crop)));

export function getDisease(label: string): DiseaseInfo | undefined {
  return DISEASES[label];
}

/** Crop name in the app language ("Maize" → "Mahindi"). */
export function cropName(crop: string, lang: Lang = getLang()): string {
  return lang === 'sw' ? CROP_SW[crop] ?? crop : crop;
}

/** The knowledge-base entry in the app language (English is the fallback). */
export function localizeDisease(info: DiseaseInfo, lang: Lang = getLang()): DiseaseInfo {
  if (lang !== 'sw') return info;
  const sw = SW_DISEASES[info.label];
  if (!sw) return { ...info, crop: cropName(info.crop, lang) };
  return {
    ...info,
    crop: cropName(info.crop, lang),
    disease: sw.disease,
    pathogen: sw.pathogen ?? info.pathogen,
    symptoms: sw.symptoms,
    spread: sw.spread,
    kenya: sw.kenya,
    cultural: sw.cultural,
    biological: sw.biological,
    chemical: sw.chemical,
  };
}

export function getDiseaseL(label: string, lang: Lang = getLang()): DiseaseInfo | undefined {
  const info = DISEASES[label];
  return info ? localizeDisease(info, lang) : undefined;
}

export function chemicalRules(lang: Lang = getLang()): string {
  return lang === 'sw' ? CHEMICAL_RULES_SW : CHEMICAL_RULES;
}

/** What the farmer should check for when the scan is uncertain. The model was
 * never trained on insect damage, so instead of inventing a pest diagnosis
 * (v1.0 did this) the app points the farmer to the signs to look for. */
export function pestHints(crops: string[], lang: Lang = getLang()): string[] {
  const en: Record<string, string> = {
    Maize: 'Maize: ragged holes in young leaves and sawdust-like droppings in the whorl point to fall armyworm. Check at dawn or dusk.',
    Tomato: 'Tomato: check leaf undersides for aphids and whiteflies, and look for winding silvery mines (Tuta absoluta).',
    Potato: 'Potato: look for aphids on shoot tips and leaf miner tunnels.',
  };
  return ['Maize', 'Tomato', 'Potato'].filter((c) => crops.includes(c)).map((c) => (lang === 'sw' ? PEST_HINTS_SW[c] : en[c]));
}

// ───────────────────────── Treatment plan ─────────────────────────

export type PlanTask = { id: string; text: string };
export type PlanStep = { id: string; when: string; title: string; urgency: Urgency; tasks: PlanTask[] };

/** Builds a day-by-day plan for any of the 38 classes from its knowledge-base
 * entry. v1.0 only had 3 hand-written plans and showed the fall armyworm plan
 * for every other disease. */
export function buildPlan(base: DiseaseInfo, lang: Lang = getLang()): PlanStep[] {
  // Decide which chemical lines to show from the English entry, then show them in the app language.
  const info = localizeDisease(base, lang);
  const L = (text: string, vars?: Record<string, string | number>) => tr(text, vars, lang);
  const t = (stepId: string, list: string[]) => list.map((text, i) => ({ id: `${stepId}-${i}`, text: L(text) }));
  const chemicalLines = base.chemical
    .map((c, i) => ({ c, local: info.chemical[i] ?? c }))
    .filter(({ c }) => !/^no /i.test(c.active) && !/no longer|restricted|^rotate/i.test(c.active + ' ' + (c.note ?? '')))
    .map(({ local }) => L('Option: {x}', { x: `${local.active}${local.note ? ` — ${local.note}` : ''}` }));

  if (info.kind === 'Healthy') {
    return [
      { id: 'w', when: L('Every week'), title: L('Keep the crop healthy'), urgency: 'low', tasks: t('w', [...info.cultural, 'Scan a few leaves from different parts of the field.']) },
    ];
  }

  if (info.kind === 'Viral') {
    return [
      {
        id: 'd0', when: L('Today'), title: L('Stop the spread'), urgency: info.urgency,
        tasks: t('d0', [info.cultural[0], 'Mark the affected area and count how many plants show symptoms.']),
      },
      {
        id: 'd1', when: L('Days 1–3'), title: L('Control the carrier'), urgency: 'high',
        tasks: t('d1', [...info.cultural.slice(1), ...info.biological, ...chemicalLines]),
      },
      {
        id: 'w1', when: L('Every week for 4 weeks'), title: L('Watch for new cases'), urgency: 'medium',
        tasks: t('w1', ['Inspect plants near the removed ones for new symptoms.', 'Re-scan suspicious leaves and remove new infected plants quickly.']),
      },
      {
        id: 'ns', when: L('Next season'), title: L('Prevent it coming back'), urgency: 'low',
        tasks: t('ns', ['Use certified seed or seedlings from a clean nursery.', 'Ask for tolerant or resistant varieties.']),
      },
    ];
  }

  const isPest = info.kind === 'Pest';
  return [
    {
      id: 'd0', when: L('Today'), title: L(isPest ? 'Confirm and reduce numbers' : 'Remove the source'), urgency: info.urgency,
      tasks: t('d0', [
        isPest ? 'Check the underside of 10 leaves across the field and note how many are infested.' : 'Walk the field and check how many plants are affected.',
        ...info.cultural.slice(0, 2),
      ]),
    },
    {
      id: 'd1', when: L(info.urgency === 'critical' ? 'Today or tomorrow' : 'Days 1–2'), title: L('First treatment'), urgency: info.urgency === 'critical' ? 'critical' : 'high',
      tasks: t('d1', [
        ...(info.biological.length ? info.biological.map((b) => L('Organic option: {x}', { x: b })) : []),
        ...chemicalLines,
        'Read the product label for the rate and the days to wait before harvest. Wear gloves, mask and boots.',
        'Spray in the early morning or late afternoon, covering both sides of the leaves.',
      ]),
    },
    {
      id: 'd7', when: L('Day 7'), title: L('Check if it is working'), urgency: 'medium',
      tasks: t('d7', [
        'Re-scan a few leaves and compare with today.',
        'If it is still spreading, repeat with a product from a different chemical group (see the label interval).',
        'Record what you sprayed, when and how much in your farm notebook.',
      ]),
    },
    {
      id: 'ns', when: L('After harvest / next season'), title: L('Prevent it coming back'), urgency: 'low',
      tasks: t('ns', [...info.cultural.slice(2), 'Remove or bury crop residue after harvest.', 'Rotate to a different crop family next season.']),
    },
  ];
}
