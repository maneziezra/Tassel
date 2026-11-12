// Tassel — disease & pest encyclopedia.
//
// v1.0 listed "44 diseases" with a "detection %" next to each, but the scanner
// model was never trained on most of them (e.g. fall armyworm, maize lethal
// necrosis). v2.0 splits the library honestly:
//  - SCANNABLE: every disease and pest guide in lib/diseases.ts; "scanner can detect"
//    (scanLabel) only when the model in use can name the class (123 in model v5;
//    the v8 guides wait for a v8 model), and
//  - REFERENCE: important Kenyan problems the scanner cannot detect yet.
// No invented accuracy figures; no doses; PCPB-restricted products removed.

import { ALL_DISEASES, localizeDisease, scannerCanName, type Kind } from './diseases';
import { getLang, type Lang } from './i18n';

export type Severity = 'Low' | 'Medium' | 'High' | 'Critical';
export type LibraryEntry = {
  id: string;
  name: string;
  sci: string;
  kind: Kind;
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
      scanLabel: scannerCanName(base.label) ? base.label : undefined,
      notifiable: base.notifiable,
    };
  });
}

const REFERENCE: LibraryEntry[] = [
  // Maize
  { id: 'r-smut', name: 'Head smut', sci: 'Sporisorium reilianum', kind: 'Fungal', crops: ['Maize'], severity: 'Medium',
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
  { id: 'r-bcmv', name: 'Bean common mosaic virus', sci: 'BCMV (Potyvirus)', kind: 'Viral', crops: ['Beans'], severity: 'Medium',
    desc: 'Carried in seed and spread by aphids.',
    symptoms: ['Light and dark green mosaic', 'Puckered, curled leaves'],
    management: 'Use certified virus-free seed and resistant varieties; rogue infected plants early. Insecticides do not stop aphids passing this virus.' },
  { id: 'r-beanfly', name: 'Bean fly', sci: 'Ophiomyia spp.', kind: 'Pest', crops: ['Beans'], severity: 'High',
    desc: 'Maggots tunnel in the stem base of seedlings.',
    symptoms: ['Wilting seedlings', 'Swollen, cracked stem at soil level'],
    management: 'Plant early, mulch, earth up soil around stems, and use a registered seed treatment. Dimethoate is now termiticide-only.' },

  // Brassicas, onion, cassava, banana
  { id: 'r-dbm', name: 'Diamondback moth', sci: 'Plutella xylostella', kind: 'Pest', crops: ['Cabbage', 'Kale'], severity: 'High',
    desc: 'Highly resistant to many insecticides.',
    symptoms: ['Small holes and clear "windows" in leaves', 'Small green caterpillars that wriggle when touched'],
    management: 'Use Bt sprays, rotate registered insecticides strictly by mode of action, and use pheromone traps.' },
  { id: 'r-thrips', name: 'Onion thrips', sci: 'Thrips tabaci', kind: 'Pest', crops: ['Onion'], severity: 'High',
    desc: 'Tiny insects that rasp the leaves.',
    symptoms: ['Silvery streaks on leaves', 'Twisted, papery leaf tips'],
    management: 'Overhead watering suppresses thrips; use blue sticky traps and rotate registered insecticides (follow the label).' },
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
  'r-smut': { name: 'Fukwe (head smut)', desc: 'Kuvu wa udongoni anayegeuza ua dume na gunzi kuwa unga mweusi wa vijimbegu.', symptoms: ['Unga mweusi mahali pa magunzi au maua dume', 'Maua dume yenye majani mengi kama kichaka'], management: 'Ondoa na choma mimea yenye fukwe kabla haijapasuka, badilisha mazao na tumia mbegu zilizothibitishwa zilizotibiwa.' },
  'r-stalkborer': { name: 'Funza wa shina la mahindi', desc: 'Viwavi huchimba ndani ya mashina.', symptoms: ['Kiini kufa kwenye mimea michanga', 'Matundu madogo kwenye majani', 'Mashimo na kinyesi ndani ya mashina'], management: 'Haribu mabaki ya zao, tumia push-pull, na tumia dawa iliyosajiliwa ndani ya kikonyo uharibifu ukionekana (fuata lebo). Carbofuran na chlorpyrifos hazipendekezwi tena.' },
  'r-bwilt': { name: 'Mnyauko bakteria', desc: 'Bakteria wa udongoni na mbegu wanaoziba mishipa ya maji ya mmea. Hakuna tiba ya kemikali.', symptoms: ['Mmea kunyauka ghafla majani yakiwa bado kijani', 'Ute mweupe kama maziwa shina lililokatwa likiwekwa kwenye maji', 'Pete ya kahawia ndani ya viazi'], management: "Tumia mbegu za viazi zilizothibitishwa, badilisha mazao kwa misimu 3 au zaidi mbali na jamii ya nyanya, ng'oa mimea iliyonyauka pamoja na viazi vyake na uichome, na safisha vifaa." },
  'r-tuta': { name: 'Mchimbaji wa majani ya nyanya (Tuta absoluta)', desc: 'Nondo vamizi ambaye viwavi wake huchimba majani na kutoboa matunda.', symptoms: ['Mabaka ya fedha yaliyochimbwa kwenye majani', 'Matundu madogo kwenye matunda', 'Ncha za mmea zilizoharibika'], management: 'Mitego ya feromoni na ya maji, ondoa majani yaliyochimbwa, neti zisizopitisha wadudu kwenye greenhouse, na badilisha dawa zilizosajiliwa za njia tofauti za utendaji (fuata lebo).' },
  'r-ber': { name: 'Kuoza kwa kitako cha tunda', desc: 'Si maambukizi — husababishwa na kumwagilia bila usawa kunakozuia kalsiamu kufika kwenye tunda.', symptoms: ['Baka jeusi, gumu kama ngozi, lililozama chini ya tunda'], management: 'Mwagilia mara kwa mara, weka matandazo ili unyevu ubaki sawa, na epuka naitrojeni nyingi. Dawa za kalsiamu za kunyunyizia husaidia kidogo tu.' },
  'r-fusarium': { name: 'Mnyauko fusari', desc: 'Kuvu wa udongoni anayeziba mishipa ya maji.', symptoms: ['Kugeuka manjano kunakoanzia upande mmoja wa mmea', 'Michirizi ya kahawia ndani ya shina', 'Kunyauka wakati wa joto la mchana'], management: 'Tumia aina zinazostahimili au miche iliyopandikizwa, badilisha mazao na boresha mifereji ya maji. Kutibu udongo kwa Trichoderma kunaweza kusaidia.' },
  'r-blackleg': { name: 'Mguu mweusi na uozo laini', desc: 'Bakteria wanaobebwa na mbegu wanaooza mashina na viazi.', symptoms: ['Kitako cha shina cheusi na chenye utelezi', 'Viazi vinavyooza vyenye harufu mbaya'], management: 'Tumia mbegu zilizothibitishwa, epuka kupanda kwenye udongo uliotuama maji, na ondoa mimea iliyoathirika.' },
  'r-bcmv': { name: 'Virusi vya mosaiki ya maharagwe (BCMV)', desc: 'Hubebwa na mbegu na kusambazwa na vidukari.', symptoms: ['Mosaiki ya kijani hafifu na iliyokolea', 'Majani yaliyokunjamana na kujikunja'], management: "Tumia mbegu zilizothibitishwa zisizo na virusi na aina zinazostahimili; ng'oa mimea iliyoambukizwa mapema. Dawa za wadudu hazizuii vidukari kusambaza virusi hivi." },
  'r-beanfly': { name: 'Inzi wa maharagwe', desc: 'Funza huchimba kwenye kitako cha shina la miche.', symptoms: ['Miche inayonyauka', 'Shina lililovimba na kupasuka usawa wa udongo'], management: 'Panda mapema, weka matandazo, pandisha udongo kuzunguka mashina, na tumia dawa ya kutibu mbegu iliyosajiliwa. Dimethoate sasa ni ya kuua mchwa pekee.' },
  'r-dbm': { name: 'Nondo mgongo-almasi (diamondback moth)', desc: 'Ana usugu mkubwa dhidi ya dawa nyingi za wadudu.', symptoms: ['Matundu madogo na "madirisha" angavu kwenye majani', 'Viwavi wadogo wa kijani wanaojinyonga ukiwagusa'], management: 'Tumia dawa za Bt, badilisha dawa zilizosajiliwa kwa kufuata njia ya utendaji, na tumia mitego ya feromoni.' },
  'r-thrips': { name: 'Thiripi wa vitunguu', desc: 'Wadudu wadogo sana wanaokwaruza majani.', symptoms: ['Michirizi ya fedha kwenye majani', 'Ncha za majani zilizopinda kama karatasi'], management: 'Kunyunyizia maji juu hupunguza thiripi; tumia mitego ya bluu yenye gundi na badilisha dawa zilizosajiliwa (fuata lebo).' },
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
/** Crops with their own filter pill (most-grown in Kenya first). */
export const LIBRARY_CROPS = ['Maize', 'Beans', 'Potato', 'Tomato', 'Coffee', 'Tea', 'Wheat', 'Cassava', 'Banana', 'Sorghum', 'Rice', 'Mango', 'Cabbage', 'Onion', 'Sugarcane', 'Cotton'];
export const LIBRARY_FILTERS = ['All', 'Scanner can detect', ...LIBRARY_CROPS, 'Fungal', 'Oomycete', 'Bacterial', 'Viral', 'Pest'];
