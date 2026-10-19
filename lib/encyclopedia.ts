// Tassel — disease & pest encyclopedia.
//
// v1.0 listed "44 diseases" with a "detection %" next to each, but the scanner
// model was never trained on most of them (e.g. fall armyworm, maize lethal
// necrosis). v2.0 splits the library honestly:
//  - SCANNABLE: the 26 disease classes the on-device model was trained on
//    (built from lib/diseases.ts), and
//  - REFERENCE: important Kenyan problems the scanner cannot detect yet.
// No invented accuracy figures; no doses; PCPB-restricted products removed.

import { ALL_DISEASES, localizeDisease, type Kind } from './diseases';
import { getLang, type Lang } from './i18n';

export type Severity = 'Low' | 'Medium' | 'High' | 'Critical';
export type LibraryEntry = {
  id: string;
  name: string;
  sci: string;
  kind: Kind | 'Disorder';
  crops: string[];
  severity: Severity;
  desc: string;
  symptoms: string[];
  management: string;
  scanLabel?: string; // set when the scanner can detect it
  notifiable?: boolean;
};

const URGENCY_TO_SEVERITY: Record<string, Severity> = { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' };

function scannable(lang: Lang): LibraryEntry[] {
  return ALL_DISEASES.filter((d) => d.kind !== 'Healthy').map((base) => {
    const d = localizeDisease(base, lang);
    return {
      id: base.label,
      name: d.disease,
      sci: d.pathogen ?? '',
      kind: base.kind,
      crops: [base.crop], // English key; screens show cropName()
      severity: URGENCY_TO_SEVERITY[base.urgency],
      desc: d.kenya ?? d.spread ?? '',
      symptoms: [d.symptoms],
      management: [...d.cultural.slice(0, 2), ...d.chemical.slice(0, 2).map((c) => c.active)].join(' • '),
      scanLabel: base.label,
      notifiable: base.notifiable,
    };
  });
}

const REFERENCE: LibraryEntry[] = [
  // Maize
  { id: 'r-faw', name: 'Fall armyworm', sci: 'Spodoptera frugiperda', kind: 'Pest', crops: ['Maize', 'Sorghum'], severity: 'High',
    desc: 'The most damaging maize pest in Kenya since 2017. Larvae feed in the whorl and on cobs.',
    symptoms: ['Ragged holes and "windows" in young leaves', 'Sawdust-like droppings in the whorl', 'Holes in cobs'],
    management: 'Scout twice a week; crush egg masses; apply Bt, emamectin benzoate or spinetoram into the whorl only when larvae are found (follow the label). Push-pull (desmodium + brachiaria) reduces attacks. Chlorpyrifos is now termiticide-only.' },
  { id: 'r-msv', name: 'Maize streak virus', sci: 'Maize streak virus (Mastrevirus)', kind: 'Viral', crops: ['Maize'], severity: 'High',
    desc: 'Spread by leafhoppers. No cure once a plant is infected.',
    symptoms: ['Thin yellow streaks along the leaf veins', 'Stunted plants', 'Poor cobs'],
    management: 'Plant MSV-tolerant varieties, plant early and at the same time as neighbours, remove grassy weeds that host leafhoppers, and rogue infected seedlings.' },
  { id: 'r-mln', name: 'Maize lethal necrosis (MLN)', sci: 'MCMV + a potyvirus (e.g. SCMV)', kind: 'Viral', crops: ['Maize'], severity: 'Critical', notifiable: true,
    desc: 'Two viruses together can kill the whole crop. Spread by insects and contaminated seed.',
    symptoms: ['Leaves dry from the edges inward', 'Dead heart', 'Plants die before grain fill'],
    management: 'Use certified MLN-tolerant seed, rotate with non-cereals, rogue infected plants and report outbreaks to your extension officer or KEPHIS.' },
  { id: 'r-smut', name: 'Head smut', sci: 'Sporisorium reilianum', kind: 'Fungal', crops: ['Maize', 'Sorghum'], severity: 'Medium',
    desc: 'Soil-borne fungus that replaces the tassel and cob with black spore masses.',
    symptoms: ['Black powdery masses in place of cobs or tassels', 'Bushy, leafy tassels'],
    management: 'Remove and burn smutted plants before they burst, rotate crops and use treated certified seed.' },
  { id: 'r-stalkborer', name: 'Maize stalk borer', sci: 'Busseola fusca / Chilo partellus', kind: 'Pest', crops: ['Maize', 'Sorghum'], severity: 'High',
    desc: 'Larvae tunnel inside stems.',
    symptoms: ['Dead heart in young plants', 'Shot holes in leaves', 'Tunnels and frass in stems'],
    management: 'Destroy crop residue, use push-pull, and apply a registered whorl treatment when damage is seen (follow the label). Carbofuran and chlorpyrifos are no longer recommended.' },

  // Solanaceae
  { id: 'r-bwilt', name: 'Bacterial wilt', sci: 'Ralstonia solanacearum', kind: 'Bacterial', crops: ['Potato', 'Tomato', 'Pepper'], severity: 'Critical',
    desc: 'Soil- and seed-borne bacteria that block the plant\'s water vessels. No chemical cure.',
    symptoms: ['Sudden wilting while leaves stay green', 'Milky ooze when a cut stem is put in water', 'Brown ring inside tubers'],
    management: 'Use certified seed potato, rotate 3+ seasons away from solanaceous crops, uproot wilted plants with their tubers and burn them, and clean tools.' },
  { id: 'r-tuta', name: 'Tomato leaf miner (Tuta absoluta)', sci: 'Tuta absoluta', kind: 'Pest', crops: ['Tomato'], severity: 'High',
    desc: 'Invasive moth whose larvae mine leaves and bore into fruit.',
    symptoms: ['Silvery blotch mines in leaves', 'Small holes in fruit', 'Damaged growing tips'],
    management: 'Pheromone and water traps, remove mined leaves, insect-proof nets in greenhouses, and rotate registered insecticides with different modes of action (follow the label).' },
  { id: 'r-ber', name: 'Blossom-end rot', sci: 'Calcium supply disorder', kind: 'Disorder', crops: ['Tomato', 'Pepper'], severity: 'Medium',
    desc: 'Not an infection — caused by uneven watering that stops calcium reaching the fruit.',
    symptoms: ['Dark, leathery, sunken patch at the bottom of the fruit'],
    management: 'Water regularly, mulch to keep soil moisture even, and avoid too much nitrogen. Calcium foliar sprays help only a little.' },
  { id: 'r-fusarium', name: 'Fusarium wilt', sci: 'Fusarium oxysporum', kind: 'Fungal', crops: ['Tomato', 'Beans'], severity: 'High',
    desc: 'Soil-borne fungus that blocks water vessels.',
    symptoms: ['Yellowing that starts on one side of the plant', 'Brown streaks inside the stem', 'Wilting in the heat of the day'],
    management: 'Use resistant varieties or grafted seedlings, rotate crops, and improve drainage. Trichoderma soil treatments can help.' },
  { id: 'r-blackleg', name: 'Blackleg & soft rot', sci: 'Pectobacterium / Dickeya spp.', kind: 'Bacterial', crops: ['Potato'], severity: 'High',
    desc: 'Seed-borne bacteria that rot stems and tubers.',
    symptoms: ['Black, slimy stem base', 'Foul-smelling rotting tubers'],
    management: 'Use certified seed, avoid planting in waterlogged soil, and remove affected plants.' },

  // Beans
  { id: 'r-beanrust', name: 'Bean rust', sci: 'Uromyces appendiculatus', kind: 'Fungal', crops: ['Beans'], severity: 'High',
    desc: 'Common foliar disease of beans in humid areas.',
    symptoms: ['Small rusty-brown powdery pustules, often with a yellow halo'],
    management: 'Plant tolerant varieties, remove crop residue, and use a registered fungicide (e.g. a triazole) if it spreads before flowering.' },
  { id: 'r-als', name: 'Angular leaf spot', sci: 'Pseudocercospora griseola', kind: 'Fungal', crops: ['Beans'], severity: 'High',
    desc: 'Common in humid highland bean areas; carried on seed.',
    symptoms: ['Angular brown spots bounded by leaf veins', 'Grey spore tufts underneath'],
    management: 'Use clean seed, rotate crops, and spray copper or a registered fungicide if severe.' },
  { id: 'r-bcmv', name: 'Bean common mosaic virus', sci: 'BCMV (Potyvirus)', kind: 'Viral', crops: ['Beans'], severity: 'Medium',
    desc: 'Carried in seed and spread by aphids.',
    symptoms: ['Light and dark green mosaic', 'Puckered, curled leaves'],
    management: 'Use certified virus-free seed and resistant varieties; rogue infected plants early. Insecticides do not stop aphids passing this virus.' },
  { id: 'r-beanfly', name: 'Bean fly', sci: 'Ophiomyia spp.', kind: 'Pest', crops: ['Beans'], severity: 'High',
    desc: 'Maggots tunnel in the stem base of seedlings.',
    symptoms: ['Wilting seedlings', 'Swollen, cracked stem at soil level'],
    management: 'Plant early, mulch, earth up soil around stems, and use a registered seed treatment. Dimethoate is now termiticide-only.' },

  // Wheat
  { id: 'r-stemrust', name: 'Wheat stem rust (Ug99)', sci: 'Puccinia graminis f. sp. tritici', kind: 'Fungal', crops: ['Wheat'], severity: 'Critical',
    desc: 'The Ug99 race family was first found in East Africa and threatens most older varieties.',
    symptoms: ['Brick-red elongated pustules on stems and leaves', 'Weak stems that lodge'],
    management: 'Grow KALRO varieties rated resistant to Ug99 and spray a registered triazole fungicide at first sign.' },
  { id: 'r-yrust', name: 'Wheat yellow (stripe) rust', sci: 'Puccinia striiformis', kind: 'Fungal', crops: ['Wheat'], severity: 'High',
    desc: 'Cool-weather rust in highland wheat.',
    symptoms: ['Yellow-orange pustules in stripes along leaves'],
    management: 'Resistant varieties and a registered triazole or strobilurin + triazole fungicide when stripes appear.' },
  { id: 'r-septoria', name: 'Septoria tritici blotch', sci: 'Zymoseptoria tritici', kind: 'Fungal', crops: ['Wheat'], severity: 'High',
    desc: 'Leaf blotch common in cool, wet highland wheat.',
    symptoms: ['Tan blotches with tiny black dots (pycnidia)'],
    management: 'Rotate crops, bury residue and protect the flag leaf with a registered fungicide.' },

  // Brassicas, onion, cassava, banana
  { id: 'r-dbm', name: 'Diamondback moth', sci: 'Plutella xylostella', kind: 'Pest', crops: ['Cabbage', 'Kale'], severity: 'High',
    desc: 'Highly resistant to many insecticides.',
    symptoms: ['Small holes and clear "windows" in leaves', 'Small green caterpillars that wriggle when touched'],
    management: 'Use Bt sprays, rotate registered insecticides strictly by mode of action, and use pheromone traps.' },
  { id: 'r-blackrot', name: 'Black rot of brassicas', sci: 'Xanthomonas campestris pv. campestris', kind: 'Bacterial', crops: ['Cabbage', 'Kale'], severity: 'High',
    desc: 'Seed- and debris-borne bacteria.',
    symptoms: ['V-shaped yellow patches from the leaf edge', 'Blackened veins'],
    management: 'Use clean seed, rotate 3 seasons, avoid overhead irrigation, and spray copper protectively.' },
  { id: 'r-downy', name: 'Downy mildew of brassicas', sci: 'Hyaloperonospora parasitica', kind: 'Oomycete', crops: ['Cabbage', 'Kale'], severity: 'Medium',
    desc: 'Favoured by cool, wet weather.',
    symptoms: ['Yellow patches on top of leaves', 'Grey-white mould underneath'],
    management: 'Space plants, water in the morning, and use a registered product for downy mildew.' },
  { id: 'r-purple', name: 'Purple blotch', sci: 'Alternaria porri', kind: 'Fungal', crops: ['Onion'], severity: 'High',
    desc: 'The most common onion leaf disease in humid weather.',
    symptoms: ['Purple lesions with yellow margins', 'Leaf tips die back'],
    management: 'Rotate, space for airflow, and use a registered fungicide such as mancozeb or a triazole. Iprodione may no longer be used on edible crops.' },
  { id: 'r-thrips', name: 'Onion thrips', sci: 'Thrips tabaci', kind: 'Pest', crops: ['Onion'], severity: 'High',
    desc: 'Tiny insects that rasp the leaves.',
    symptoms: ['Silvery streaks on leaves', 'Twisted, papery leaf tips'],
    management: 'Overhead watering suppresses thrips; use blue sticky traps and rotate registered insecticides (follow the label).' },
  { id: 'r-cmd', name: 'Cassava mosaic disease', sci: 'Cassava mosaic begomoviruses', kind: 'Viral', crops: ['Cassava'], severity: 'High',
    desc: 'Spread by whiteflies and infected cuttings.',
    symptoms: ['Yellow-green mosaic', 'Twisted, small leaves', 'Stunting'],
    management: 'Plant clean cuttings of tolerant varieties and uproot infected plants early.' },
  { id: 'r-cbsd', name: 'Cassava brown streak disease', sci: 'Cassava brown streak ipomoviruses', kind: 'Viral', crops: ['Cassava'], severity: 'Critical',
    desc: 'Rots the roots, making them inedible.',
    symptoms: ['Yellow blotches on older leaves', 'Brown streaks on stems', 'Brown, hard patches in roots'],
    management: 'Use clean planting material of tolerant varieties and do not move cuttings from affected areas.' },
  { id: 'r-bxw', name: 'Banana Xanthomonas wilt', sci: 'Xanthomonas vasicola pv. musacearum', kind: 'Bacterial', crops: ['Banana'], severity: 'Critical', notifiable: true,
    desc: 'Spread by tools, insects visiting the male flower, and planting material.',
    symptoms: ['Yellowing and wilting leaves', 'Yellow ooze from cut stems', 'Fruit ripening early and rotting inside'],
    management: 'Remove the male bud with a forked stick, disinfect tools with fire or bleach, uproot infected mats, and report to your extension officer.' },

  // General
  { id: 'r-aphids', name: 'Aphids', sci: 'Aphididae', kind: 'Pest', crops: ['Many crops'], severity: 'Medium',
    desc: 'Sap-sucking insects that also spread viruses.',
    symptoms: ['Clusters on shoot tips and leaf undersides', 'Curled leaves', 'Sticky honeydew and sooty mould'],
    management: 'Encourage ladybirds, spray soap or neem solutions, and use registered products only when numbers are high. Imidacloprid and dimethoate are now restricted.' },
  { id: 'r-whitefly', name: 'Whitefly', sci: 'Bemisia tabaci', kind: 'Pest', crops: ['Tomato', 'Beans', 'Cassava'], severity: 'High',
    desc: 'Carries tomato leaf curl and cassava viruses.',
    symptoms: ['Tiny white insects that fly up when disturbed', 'Yellowing leaves', 'Sooty mould'],
    management: 'Yellow sticky traps, insect-proof nets, weed control and rotation of registered products.' },
  { id: 'r-cutworm', name: 'Cutworms', sci: 'Agrotis spp.', kind: 'Pest', crops: ['Many crops'], severity: 'High',
    desc: 'Soil caterpillars that cut seedlings at night.',
    symptoms: ['Seedlings cut off at soil level', 'Grey caterpillars curled in the soil nearby'],
    management: 'Plough early to expose larvae, hand-pick at night, and use collars around transplants. Chlorpyrifos is now termiticide-only.' },
  { id: 'r-rkn', name: 'Root-knot nematodes', sci: 'Meloidogyne spp.', kind: 'Pest', crops: ['Tomato', 'Beans', 'Carrot'], severity: 'High',
    desc: 'Microscopic worms that form galls on roots.',
    symptoms: ['Knots/galls on roots', 'Wilting in the heat despite watering', 'Stunting'],
    management: 'Rotate with cereals, solarise nursery soil, add compost, and use resistant rootstocks. Carbofuran is no longer recommended.' },
  { id: 'r-damping', name: 'Damping-off', sci: 'Pythium, Rhizoctonia spp.', kind: 'Fungal', crops: ['Nurseries'], severity: 'High',
    desc: 'Kills seedlings in wet, crowded nurseries.',
    symptoms: ['Seedlings collapse at soil level', 'Seeds rot before emerging'],
    management: 'Use clean, well-drained media, sow thinly, water in the morning only, and use Trichoderma products.' },
  { id: 'r-botrytis', name: 'Grey mould', sci: 'Botrytis cinerea', kind: 'Fungal', crops: ['Tomato', 'Beans', 'Strawberry'], severity: 'High',
    desc: 'Grows on damaged tissue in cool, humid conditions, including after harvest.',
    symptoms: ['Fuzzy grey mould on flowers, fruit and stems'],
    management: 'Improve ventilation, remove dead tissue, avoid wounding and use a registered product. Iprodione may no longer be used on edible crops.' },
];

/** Kiswahili text for the reference entries (names, description, symptoms, management). */
const REFERENCE_SW: Record<string, { name: string; desc: string; symptoms: string[]; management: string }> = {
  'r-faw': { name: 'Viwavijeshi vamizi (fall armyworm)', desc: 'Mdudu anayeharibu mahindi zaidi nchini Kenya tangu 2017. Viwavi hula ndani ya kikonyo na kwenye magunzi.', symptoms: ['Matundu yaliyochanika na "madirisha" kwenye majani machanga', 'Kinyesi kama unga wa mbao ndani ya kikonyo', 'Matundu kwenye magunzi'], management: 'Kagua mara mbili kwa wiki; ponda mayai; tumia Bt, emamectin benzoate au spinetoram ndani ya kikonyo tu ukipata viwavi (fuata lebo). Mbinu ya push-pull (desmodium + brachiaria) hupunguza mashambulizi. Chlorpyrifos sasa ni ya kuua mchwa pekee.' },
  'r-msv': { name: 'Virusi vya michirizi ya mahindi (MSV)', desc: 'Husambazwa na panzi wadogo (leafhoppers). Hakuna tiba mmea ukishaambukizwa.', symptoms: ['Michirizi myembamba ya manjano kufuata mishipa ya jani', 'Mimea iliyodumaa', 'Magunzi duni'], management: "Panda aina zinazostahimili MSV, panda mapema na wakati mmoja na majirani, ondoa magugu ya nyasi yanayohifadhi panzi, na ng'oa miche iliyoambukizwa." },
  'r-mln': { name: 'Ugonjwa hatari wa mahindi (MLN)', desc: 'Virusi viwili pamoja vinaweza kuua zao lote. Husambazwa na wadudu na mbegu zilizochafuliwa.', symptoms: ['Majani hukauka kuanzia kingo kuelekea ndani', 'Kiini cha mmea kufa', 'Mimea hufa kabla ya kujaza punje'], management: "Tumia mbegu zilizothibitishwa zinazostahimili MLN, badilisha na mazao yasiyo ya nafaka, ng'oa mimea iliyoambukizwa na ripoti mlipuko kwa afisa wa ugani au KEPHIS." },
  'r-smut': { name: 'Fukwe (head smut)', desc: 'Kuvu wa udongoni anayegeuza ua dume na gunzi kuwa unga mweusi wa vijimbegu.', symptoms: ['Unga mweusi mahali pa magunzi au maua dume', 'Maua dume yenye majani mengi kama kichaka'], management: 'Ondoa na choma mimea yenye fukwe kabla haijapasuka, badilisha mazao na tumia mbegu zilizothibitishwa zilizotibiwa.' },
  'r-stalkborer': { name: 'Funza wa shina la mahindi', desc: 'Viwavi huchimba ndani ya mashina.', symptoms: ['Kiini kufa kwenye mimea michanga', 'Matundu madogo kwenye majani', 'Mashimo na kinyesi ndani ya mashina'], management: 'Haribu mabaki ya zao, tumia push-pull, na tumia dawa iliyosajiliwa ndani ya kikonyo uharibifu ukionekana (fuata lebo). Carbofuran na chlorpyrifos hazipendekezwi tena.' },
  'r-bwilt': { name: 'Mnyauko bakteria', desc: 'Bakteria wa udongoni na mbegu wanaoziba mishipa ya maji ya mmea. Hakuna tiba ya kemikali.', symptoms: ['Mmea kunyauka ghafla majani yakiwa bado kijani', 'Ute mweupe kama maziwa shina lililokatwa likiwekwa kwenye maji', 'Pete ya kahawia ndani ya viazi'], management: "Tumia mbegu za viazi zilizothibitishwa, badilisha mazao kwa misimu 3 au zaidi mbali na jamii ya nyanya, ng'oa mimea iliyonyauka pamoja na viazi vyake na uichome, na safisha vifaa." },
  'r-tuta': { name: 'Mchimbaji wa majani ya nyanya (Tuta absoluta)', desc: 'Nondo vamizi ambaye viwavi wake huchimba majani na kutoboa matunda.', symptoms: ['Mabaka ya fedha yaliyochimbwa kwenye majani', 'Matundu madogo kwenye matunda', 'Ncha za mmea zilizoharibika'], management: 'Mitego ya feromoni na ya maji, ondoa majani yaliyochimbwa, neti zisizopitisha wadudu kwenye greenhouse, na badilisha dawa zilizosajiliwa za njia tofauti za utendaji (fuata lebo).' },
  'r-ber': { name: 'Kuoza kwa kitako cha tunda', desc: 'Si maambukizi — husababishwa na kumwagilia bila usawa kunakozuia kalsiamu kufika kwenye tunda.', symptoms: ['Baka jeusi, gumu kama ngozi, lililozama chini ya tunda'], management: 'Mwagilia mara kwa mara, weka matandazo ili unyevu ubaki sawa, na epuka naitrojeni nyingi. Dawa za kalsiamu za kunyunyizia husaidia kidogo tu.' },
  'r-fusarium': { name: 'Mnyauko fusari', desc: 'Kuvu wa udongoni anayeziba mishipa ya maji.', symptoms: ['Kugeuka manjano kunakoanzia upande mmoja wa mmea', 'Michirizi ya kahawia ndani ya shina', 'Kunyauka wakati wa joto la mchana'], management: 'Tumia aina zinazostahimili au miche iliyopandikizwa, badilisha mazao na boresha mifereji ya maji. Kutibu udongo kwa Trichoderma kunaweza kusaidia.' },
  'r-blackleg': { name: 'Mguu mweusi na uozo laini', desc: 'Bakteria wanaobebwa na mbegu wanaooza mashina na viazi.', symptoms: ['Kitako cha shina cheusi na chenye utelezi', 'Viazi vinavyooza vyenye harufu mbaya'], management: 'Tumia mbegu zilizothibitishwa, epuka kupanda kwenye udongo uliotuama maji, na ondoa mimea iliyoathirika.' },
  'r-beanrust': { name: 'Kutu ya maharagwe', desc: 'Ugonjwa wa majani unaopatikana sana kwenye maharagwe katika maeneo yenye unyevu.', symptoms: ['Vivimbe vidogo vya kahawia kama kutu vyenye unga, mara nyingi na duara la manjano'], management: 'Panda aina zinazostahimili, ondoa mabaki ya zao, na tumia dawa ya kuvu iliyosajiliwa (k.m. triazole) ikienea kabla ya maua.' },
  'r-als': { name: 'Madoa ya pembe (angular leaf spot)', desc: 'Hupatikana sana katika maeneo ya maharagwe ya nyanda za juu zenye unyevu; hubebwa na mbegu.', symptoms: ['Madoa ya kahawia yenye pembe yaliyozungukwa na mishipa ya jani', 'Vishada vya kijivu vya vijimbegu upande wa chini'], management: 'Tumia mbegu safi, badilisha mazao, na nyunyizia shaba au dawa ya kuvu iliyosajiliwa ikiwa ni mbaya.' },
  'r-bcmv': { name: 'Virusi vya mosaiki ya maharagwe (BCMV)', desc: 'Hubebwa na mbegu na kusambazwa na vidukari.', symptoms: ['Mosaiki ya kijani hafifu na iliyokolea', 'Majani yaliyokunjamana na kujikunja'], management: "Tumia mbegu zilizothibitishwa zisizo na virusi na aina zinazostahimili; ng'oa mimea iliyoambukizwa mapema. Dawa za wadudu hazizuii vidukari kusambaza virusi hivi." },
  'r-beanfly': { name: 'Inzi wa maharagwe', desc: 'Funza huchimba kwenye kitako cha shina la miche.', symptoms: ['Miche inayonyauka', 'Shina lililovimba na kupasuka usawa wa udongo'], management: 'Panda mapema, weka matandazo, pandisha udongo kuzunguka mashina, na tumia dawa ya kutibu mbegu iliyosajiliwa. Dimethoate sasa ni ya kuua mchwa pekee.' },
  'r-stemrust': { name: 'Kutu ya shina la ngano (Ug99)', desc: 'Jamii ya Ug99 iligunduliwa kwanza Afrika Mashariki na inatishia aina nyingi za zamani.', symptoms: ['Vivimbe virefu vya rangi ya matofali kwenye mashina na majani', 'Mashina dhaifu yanayoanguka'], management: 'Panda aina za KALRO zinazostahimili Ug99 na nyunyizia dawa ya triazole iliyosajiliwa dalili zikianza.' },
  'r-yrust': { name: 'Kutu ya manjano ya ngano', desc: 'Kutu ya hali ya baridi kwenye ngano ya nyanda za juu.', symptoms: ['Vivimbe vya manjano-machungwa kwa mistari kufuata majani'], management: 'Aina zinazostahimili na dawa iliyosajiliwa ya triazole au strobilurin + triazole mistari ikionekana.' },
  'r-septoria': { name: 'Baka la Septoria la ngano', desc: 'Baka la jani linalopatikana sana kwenye ngano ya nyanda za juu yenye baridi na mvua.', symptoms: ['Mabaka ya hudhurungi yenye vitone vidogo vyeusi'], management: 'Badilisha mazao, zika mabaki na linda jani la bendera kwa dawa ya kuvu iliyosajiliwa.' },
  'r-dbm': { name: 'Nondo mgongo-almasi (diamondback moth)', desc: 'Ana usugu mkubwa dhidi ya dawa nyingi za wadudu.', symptoms: ['Matundu madogo na "madirisha" angavu kwenye majani', 'Viwavi wadogo wa kijani wanaojinyonga ukiwagusa'], management: 'Tumia dawa za Bt, badilisha dawa zilizosajiliwa kwa kufuata njia ya utendaji, na tumia mitego ya feromoni.' },
  'r-blackrot': { name: 'Uozo mweusi wa kabichi', desc: 'Bakteria wanaobebwa na mbegu na mabaki.', symptoms: ['Mabaka ya manjano yenye umbo la V kuanzia ukingo wa jani', 'Mishipa iliyogeuka nyeusi'], management: 'Tumia mbegu safi, badilisha mazao kwa misimu 3, epuka kunyunyizia maji juu, na nyunyizia shaba kama kinga.' },
  'r-downy': { name: 'Ukungu chini ya jani (downy mildew)', desc: 'Huchochewa na hali ya baridi na mvua.', symptoms: ['Mabaka ya manjano juu ya majani', 'Ukungu wa kijivu-nyeupe upande wa chini'], management: 'Acha nafasi kati ya mimea, mwagilia asubuhi, na tumia bidhaa iliyosajiliwa kwa ugonjwa huu.' },
  'r-purple': { name: 'Baka la zambarau la vitunguu', desc: 'Ugonjwa wa majani ya vitunguu unaopatikana zaidi wakati wa unyevu.', symptoms: ['Vidonda vya zambarau vyenye kingo za manjano', 'Ncha za majani kufa'], management: 'Badilisha mazao, acha nafasi hewa ipite, na tumia dawa ya kuvu iliyosajiliwa kama mancozeb au triazole. Iprodione haiwezi tena kutumika kwenye mazao ya chakula.' },
  'r-thrips': { name: 'Thiripi wa vitunguu', desc: 'Wadudu wadogo sana wanaokwaruza majani.', symptoms: ['Michirizi ya fedha kwenye majani', 'Ncha za majani zilizopinda kama karatasi'], management: 'Kunyunyizia maji juu hupunguza thiripi; tumia mitego ya bluu yenye gundi na badilisha dawa zilizosajiliwa (fuata lebo).' },
  'r-cmd': { name: 'Ugonjwa wa mosaiki ya muhogo', desc: 'Husambazwa na inzi weupe na vipandikizi vyenye ugonjwa.', symptoms: ['Mosaiki ya manjano-kijani', 'Majani madogo yaliyopinda', 'Kudumaa'], management: "Panda vipandikizi safi vya aina zinazostahimili na ng'oa mimea iliyoambukizwa mapema." },
  'r-cbsd': { name: 'Ugonjwa wa michirizi ya kahawia ya muhogo', desc: 'Huozesha mizizi na kuifanya isiliwe.', symptoms: ['Mabaka ya manjano kwenye majani ya zamani', 'Michirizi ya kahawia kwenye mashina', 'Mabaka ya kahawia magumu ndani ya mizizi'], management: 'Tumia vipandikizi safi vya aina zinazostahimili na usihamishe vipandikizi kutoka maeneo yaliyoathirika.' },
  'r-bxw': { name: 'Mnyauko bakteria wa ndizi (BXW)', desc: 'Husambazwa na vifaa, wadudu wanaotembelea ua dume, na mbegu za kupanda.', symptoms: ['Majani kugeuka manjano na kunyauka', 'Ute wa manjano kutoka mashina yaliyokatwa', 'Ndizi kuiva mapema na kuoza ndani'], management: "Ondoa ua dume kwa fimbo yenye panda, safisha vifaa kwa moto au bleach, ng'oa migomba iliyoambukizwa, na ripoti kwa afisa wa ugani." },
  'r-aphids': { name: 'Vidukari', desc: 'Wadudu wanaofyonza utomvu na pia husambaza virusi.', symptoms: ['Makundi kwenye ncha za machipukizi na chini ya majani', 'Majani yaliyojikunja', 'Utomvu unaonata na ukungu mweusi'], management: 'Wahimize kombamwiko (ladybirds), nyunyizia sabuni au mwarubaini, na tumia bidhaa zilizosajiliwa tu idadi ikiwa kubwa. Imidacloprid na dimethoate sasa zimezuiliwa.' },
  'r-whitefly': { name: 'Inzi weupe', desc: 'Hubeba virusi vya kukunjika kwa majani ya nyanya na vya muhogo.', symptoms: ['Wadudu wadogo weupe wanaoruka ukigusa mmea', 'Majani kugeuka manjano', 'Ukungu mweusi'], management: 'Mitego ya manjano yenye gundi, neti zisizopitisha wadudu, kudhibiti magugu na kubadilisha bidhaa zilizosajiliwa.' },
  'r-cutworm': { name: 'Viwavi wakata miche (cutworms)', desc: 'Viwavi wa udongoni wanaokata miche usiku.', symptoms: ['Miche iliyokatwa usawa wa udongo', 'Viwavi wa kijivu waliojikunja udongoni karibu'], management: 'Lima mapema kuwaanika viwavi, waokote kwa mkono usiku, na weka kola kuzunguka miche. Chlorpyrifos sasa ni ya kuua mchwa pekee.' },
  'r-rkn': { name: 'Minyoo fundo wa mizizi (nematodes)', desc: 'Minyoo wadogo sana wanaotengeneza vivimbe kwenye mizizi.', symptoms: ['Mafundo au vivimbe kwenye mizizi', 'Kunyauka wakati wa joto licha ya kumwagilia', 'Kudumaa'], management: 'Badilisha na nafaka, tibu udongo wa kitalu kwa jua (solarisation), ongeza mboji, na tumia vishina vinavyostahimili. Carbofuran haipendekezwi tena.' },
  'r-damping': { name: 'Kuoza kwa miche (damping-off)', desc: 'Huua miche katika vitalu vyenye unyevu mwingi na msongamano.', symptoms: ['Miche kuanguka usawa wa udongo', 'Mbegu kuoza kabla ya kuota'], management: 'Tumia udongo safi unaotiririsha maji, panda kwa nafasi, mwagilia asubuhi tu, na tumia bidhaa za Trichoderma.' },
  'r-botrytis': { name: 'Ukungu wa kijivu (grey mould)', desc: 'Huota kwenye sehemu zilizoharibika wakati wa baridi na unyevu, hata baada ya mavuno.', symptoms: ['Ukungu wa kijivu kama manyoya kwenye maua, matunda na mashina'], management: 'Boresha mzunguko wa hewa, ondoa sehemu zilizokufa, epuka kujeruhi na tumia bidhaa iliyosajiliwa. Iprodione haiwezi tena kutumika kwenye mazao ya chakula.' },
};

/** The whole library in the app language. */
export function getLibrary(lang: Lang = getLang()): LibraryEntry[] {
  const ref = lang === 'sw' ? REFERENCE.map((r) => ({ ...r, ...(REFERENCE_SW[r.id] ?? {}) })) : REFERENCE;
  return [...scannable(lang), ...ref];
}

export const LIBRARY: LibraryEntry[] = getLibrary('en');
export const LIBRARY_FILTERS = ['All', 'Scanner can detect', 'Maize', 'Tomato', 'Potato', 'Beans', 'Wheat', 'Fungal', 'Oomycete', 'Bacterial', 'Viral', 'Pest'];
