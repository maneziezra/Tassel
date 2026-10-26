// Tassel — Kiswahili version of the treatment knowledge base (lib/diseases.ts).
// Same rules as the English text: active ingredients only, no doses, PCPB 2025
// restrictions kept. Active-ingredient and pathogen names stay in their
// scientific form so farmers can match them to product labels.

import type { Chemical } from './diseases';
import { SW_DISEASES_V5 } from './diseases.v5.sw';

export type DiseaseSw = {
  disease: string;
  pathogen?: string;
  symptoms: string;
  spread: string | null;
  kenya: string | null;
  cultural: string[];
  biological: string[];
  chemical: Chemical[];
};

export const CROP_SW: Record<string, string> = {
  Apple: 'Tufaha',
  Blueberry: 'Blueberi',
  Cherry: 'Cheri',
  Maize: 'Mahindi',
  Grape: 'Zabibu',
  Orange: 'Chungwa',
  Peach: 'Pichi',
  'Pepper (capsicum)': 'Pilipili hoho',
  Potato: 'Viazi',
  Raspberry: 'Rasiberi',
  Soybean: 'Soya',
  Squash: 'Maboga',
  Strawberry: 'Stroberi',
  Tomato: 'Nyanya',
  Beans: 'Maharagwe',
  Wheat: 'Ngano',
  Cassava: 'Muhogo',
  Banana: 'Ndizi',
  Coffee: 'Kahawa',
  Tea: 'Chai',
  Kale: 'Sukuma wiki',
  Cabbage: 'Kabichi',
  Onion: 'Kitunguu',
  Sorghum: 'Mtama',
  Avocado: 'Parachichi',
  Mango: 'Embe',
  Cashew: 'Korosho',
  Citrus: 'Machungwa',
  Rice: 'Mpunga',
  Millet: 'Mawele',
  Sugarcane: 'Miwa',
  Cotton: 'Pamba',
  Cucumber: 'Tango',
  Pumpkin: 'Malenge',
  Eggplant: 'Biringanya',
  Olive: 'Mzeituni',
  'Black gram': 'Dengu nyeusi',
  Capsicum: 'Pilipili hoho',
};

export const MANCOZEB_NOTE_SW = 'Mancozeb ilikuwa ikikaguliwa na PCPB mwaka 2025 — hakikisha bidhaa bado imesajiliwa.';
export const CHEMICAL_RULES_SW =
  'Tumia tu bidhaa zilizosajiliwa na Bodi ya Kudhibiti Bidhaa za Kuua Wadudu (PCPB) kwa zao hili. Fuata kipimo kilichoandikwa kwenye lebo, vaa glavu, barakoa na buti, usichanganye bidhaa isipokuwa lebo inaruhusu, na heshimu muda wa kusubiri kabla ya kuvuna.';

const COPPER: Chemical = { active: 'Shaba (copper hydroxide au copper oxychloride)' };
const MANCOZEB: Chemical = { active: 'Mancozeb', note: MANCOZEB_NOTE_SW };
const LATE_BLIGHT_PATHOGEN = 'Phytophthora infestans (ukungu wa maji, si kuvu halisi)';

function healthy(tips: string[]): DiseaseSw {
  return {
    disease: 'Afya',
    symptoms: 'Hakuna dalili za ugonjwa zilizoonekana kwenye jani hili.',
    spread: null,
    kenya: null,
    cultural: tips,
    biological: [],
    chemical: [],
  };
}

export const SW_DISEASES: Record<string, DiseaseSw> = {
  Apple___Apple_scab: {
    disease: 'Upele wa tufaha (apple scab)',
    symptoms: 'Madoa ya kijani-mzeituni hadi kahawia yenye mguso kama velveti kwenye majani na matunda; majani yanaweza kugeuka manjano na kupukutika mapema.',
    spread: 'Vijimbegu kutoka kwa majani yaliyoanguka yenye ugonjwa, hurushwa na mvua wakati wa baridi na unyevu.',
    kenya: 'Tufaha hupandwa kwa kiwango kidogo katika nyanda za juu za Kenya ambapo hali ya baridi na unyevu huchochea ugonjwa huu.',
    cultural: [
      'Kusanya na kuharibu majani yaliyoanguka ili kuondoa chanzo cha vijimbegu.',
      'Pogoa ili kufungua matawi majani yakauke haraka.',
      'Panda aina zinazostahimili ugonjwa huu unapobadilisha miti.',
    ],
    biological: ['Dawa za kibiolojia zenye Bacillus subtilis zinaweza kupunguza maambukizi zikitumiwa kabla ya mvua.'],
    chemical: [{ active: 'Captan' }, { active: 'Difenoconazole' }, MANCOZEB],
  },
  Apple___Black_rot: {
    disease: 'Uozo mweusi (black rot)',
    symptoms: 'Madoa ya kahawia kwenye majani yenye kingo za zambarau ("jicho la chura"), matunda yanayooza na kuwa meusi, na vidonda vilivyozama kwenye matawi.',
    spread: 'Vijimbegu kutoka kwenye vidonda na matunda yaliyokauka, husambazwa na mvua katika hali ya joto na unyevu.',
    kenya: null,
    cultural: [
      'Kata vidonda na miti iliyokufa sm 15 chini ya sehemu iliyoathirika na uichome.',
      'Ondoa matunda yaliyokauka mtini na ardhini.',
      'Safisha vifaa vya kupogoa kwa dawa kati ya mti mmoja na mwingine.',
    ],
    biological: [],
    chemical: [COPPER, { active: 'Captan' }],
  },
  Apple___Cedar_apple_rust: {
    disease: 'Kutu ya tufaha (cedar apple rust)',
    symptoms: 'Madoa ya rangi ya chungwa-manjano angavu juu ya jani na vijineli vidogo upande wa chini.',
    spread: 'Huhitaji miti ya mreteni (juniper/cedar) iliyo karibu kukamilisha mzunguko wake; vijimbegu hupeperushwa hadi kwenye tufaha wakati wa masika.',
    kenya: 'Hatari ndogo nchini Kenya kwa sababu unahitaji aina fulani za mreteni zilizo karibu.',
    cultural: ['Ondoa miti ya mreteni/cedar iliyo karibu inapowezekana.', 'Chagua aina za tufaha zinazostahimili kutu.'],
    biological: [],
    chemical: [{ active: 'Myclobutanil' }, MANCOZEB],
  },
  Apple___healthy: healthy(['Endelea kupogoa ili hewa ipite na ondoa majani yaliyoanguka.', 'Weka mbolea iliyosawazika kulingana na kipimo cha udongo.']),
  Blueberry___healthy: healthy(['Blueberi huhitaji udongo wenye asidi (pH takriban 4.5–5.5); pima udongo kabla ya kupanda.', 'Weka matandazo ili mizizi ibaki na ubaridi na unyevu.']),
  'Cherry_(including_sour)___Powdery_mildew': {
    disease: 'Ubwiri unga (powdery mildew)',
    symptoms: 'Mabaka meupe kama unga kwenye majani machanga; majani hujikunja na kuharibika umbo.',
    spread: 'Vijimbegu vinavyopeperushwa hewani; huchochewa na mchana wa joto, usiku wa baridi na kivuli. Hauhitaji mvua.',
    kenya: null,
    cultural: ['Pogoa ili mwanga wa jua na hewa vipite.', 'Epuka naitrojeni nyingi inayotoa machipukizi laini.'],
    biological: ['Dawa za kunyunyizia za potassium bicarbonate.', 'Dawa za kibiolojia zenye Bacillus subtilis.'],
    chemical: [{ active: 'Salfa (sulphur)', note: 'Usinyunyizie salfa wakati wa joto kali (zaidi ya takriban 30 °C).' }, { active: 'Myclobutanil' }],
  },
  'Cherry_(including_sour)___healthy': healthy(['Endelea kukagua machipukizi mapya kila wiki.', 'Pogoa baada ya mavuno ili matawi yabaki wazi.']),
  'Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot': {
    disease: 'Madoa ya kijivu (grey leaf spot)',
    symptoms: 'Madoa marefu, membamba ya mstatili ya kijivu-hudhurungi yanayofuata kati ya mishipa ya jani, yakianzia majani ya chini.',
    spread: 'Huishi kwenye mabaki ya mahindi yaliyoachwa juu ya ardhi; huenea wakati wa joto na unyevu majani yanapobaki na maji kwa muda mrefu.',
    kenya: 'Ugonjwa muhimu wa mahindi nchini Kenya, hasa maeneo yenye unyevu ya magharibi na Bonde la Ufa.',
    cultural: [
      'Badilisha mahindi na maharagwe, soya au zao lisilo la nafaka kwa angalau msimu mmoja.',
      'Zika au ondoa mabaki ya mahindi baada ya mavuno.',
      'Muulize muuzaji wa pembejeo mbegu chotara zinazostahimili madoa ya kijivu (angalia pakiti ya mbegu).',
    ],
    biological: [],
    chemical: [
      { active: 'Azoxystrobin + propiconazole (au mchanganyiko mwingine wa strobilurin + triazole)', note: 'Husaidia zaidi wakati wa kutoa maua dume ikiwa madoa yanapanda juu ya mmea.' },
    ],
  },
  'Corn_(maize)___Common_rust_': {
    disease: 'Kutu ya kawaida (common rust)',
    symptoms: 'Vivimbe vidogo vya mviringo vya rangi ya matofali hadi kahawia kama unga pande zote mbili za jani.',
    spread: 'Vijimbegu vinavyopeperushwa na upepo; huchochewa na hali ya baridi na unyevu.',
    kenya: 'Hupatikana sana katika maeneo ya mahindi ya nyanda za juu wakati wa misimu ya baridi na mvua.',
    cultural: [
      'Panda mbegu chotara zinazostahimili kutu.',
      'Panda mapema msimu ili zao likomae kabla ya vipindi vya baridi na mvua.',
      'Kagua kila wiki kuanzia mmea ukifika urefu wa goti.',
    ],
    biological: [],
    chemical: [{ active: 'Propiconazole' }, { active: 'Azoxystrobin + propiconazole' }, MANCOZEB],
  },
  'Corn_(maize)___Northern_Leaf_Blight': {
    disease: 'Baka la kaskazini (northern leaf blight)',
    symptoms: 'Madoa marefu yenye umbo la sigara ya kijivu-kijani hadi hudhurungi, urefu wa sm 3–15, yakianzia majani ya chini.',
    spread: 'Vijimbegu kutoka kwa mabaki yenye ugonjwa, husambazwa na upepo na mvua katika joto la wastani na umande mwingi.',
    kenya: 'Hupatikana sana kwenye mahindi ya nyanda za juu za Kenya; huwa mbaya zaidi katika misimu ya baridi na unyevu.',
    cultural: [
      'Acha kupanda mahindi kwa msimu mmoja (badilisha mazao).',
      'Zika au ondoa mabaki ya zao baada ya mavuno.',
      'Tumia mbegu zilizothibitishwa za aina chotara zinazostahimili.',
    ],
    biological: [],
    chemical: [{ active: 'Azoxystrobin + propiconazole' }, { active: 'Propiconazole' }, MANCOZEB],
  },
  'Corn_(maize)___healthy': healthy([
    'Weka mbolea ya kukuzia yenye naitrojeni (k.m. CAN) mmea ukifika urefu wa goti, kwa kipimo kinachopendekezwa na kipimo cha udongo au afisa wa ugani.',
    'Kagua kila wiki viwavijeshi vamizi (fall armyworm) ndani ya kikonyo — kifaa hiki hakitambui wadudu.',
  ]),
  Grape___Black_rot: {
    disease: 'Uozo mweusi (black rot)',
    symptoms: 'Madoa ya hudhurungi kwenye majani yenye kingo nyeusi; zabibu husinyaa na kuwa "mumia" ngumu nyeusi.',
    spread: 'Vijimbegu kutoka kwa zabibu zilizokauka na mashina, husambazwa na mvua katika hali ya joto na unyevu.',
    kenya: null,
    cultural: ['Ondoa zabibu zote zilizokauka na mashina yenye ugonjwa.', 'Elekeza na pogoa mizabibu ili majani yakauke haraka.'],
    biological: [],
    chemical: [MANCOZEB, { active: 'Myclobutanil' }, { active: 'Captan' }],
  },
  'Grape___Esca_(Black_Measles)': {
    disease: 'Esca (surua nyeusi ya zabibu)',
    pathogen: 'Kundi la kuvu wanaooza mbao (Phaeomoniella chlamydospora na wengine)',
    symptoms: 'Mabaka ya manjano na kahawia kama milia ya chui kati ya mishipa ya jani; madoa meusi kwenye zabibu; kuoza kwa mbao ndani.',
    spread: 'Kuvu huingia kupitia majeraha ya kupogoa.',
    kenya: null,
    cultural: ['Pogoa wakati wa kiangazi na choma mbao zenye ugonjwa.', 'Funika majeraha makubwa ya kupogoa.', 'Ondoa mizabibu iliyoathirika vibaya.'],
    biological: ['Dawa za kulinda majeraha zenye Trichoderma zinaweza kupunguza maambukizi mapya kwenye majeraha ya kupogoa.'],
    chemical: [{ active: 'Hakuna dawa ya kunyunyizia inayotibu', note: 'Udhibiti ni kwa kuondoa mbao zenye ugonjwa na kulinda majeraha.' }],
  },
  'Grape___Leaf_blight_(Isariopsis_Leaf_Spot)': {
    disease: 'Baka la jani (Isariopsis leaf spot)',
    symptoms: 'Madoa yasiyo na umbo maalum ya rangi nyekundu-kahawia iliyokolea yenye duara la manjano kwenye majani ya zamani; majani yanaweza kupukutika.',
    spread: 'Vijimbegu vinavyorushwa na mvua katika hali ya joto na unyevu.',
    kenya: null,
    cultural: ['Ondoa na kuharibu majani yenye ugonjwa.', 'Epuka kulowesha majani unapomwagilia.'],
    biological: [],
    chemical: [COPPER, MANCOZEB],
  },
  Grape___healthy: healthy(['Weka mizabibu kwenye fremu na ipogoe ili hewa ipite.', 'Kagua majani kila wiki wakati wa mvua.']),
  'Orange___Haunglongbing_(Citrus_greening)': {
    disease: 'Ugonjwa wa ukijani wa machungwa (HLB)',
    pathogen: 'Candidatus Liberibacter spp., husambazwa na wadudu wa machungwa aina ya psyllid',
    symptoms: 'Majani kugeuka manjano kwa mabaka yasiyo sawa (si sawa pande zote za mshipa mkuu); matunda madogo, yaliyopinda na machungu.',
    spread: 'Hubebwa na wadudu aina ya psyllid na kupitia vikonyo au miche yenye ugonjwa.',
    kenya: 'Ugonjwa wa ukijani wa machungwa umeripotiwa nchini Kenya. Ripoti miti inayoshukiwa kwa afisa wa kilimo wa kaunti au KEPHIS.',
    cultural: [
      'Hakuna tiba. Ondoa na kuharibu miti yenye ugonjwa ili kulinda bustani iliyobaki.',
      'Nunua miche tu kutoka vitalu vilivyothibitishwa visivyo na magonjwa.',
      'Kagua machipukizi mapya kila wiki kutafuta psyllid.',
    ],
    biological: [],
    chemical: [{ active: 'Kudhibiti psyllid kwa dawa ya wadudu iliyosajiliwa na PCPB', note: 'Imidacloprid imezuiliwa kwa matumizi yasiyo ya shambani wazi tangu 2025 — muulize afisa wako wa ugani.' }],
  },
  Peach___Bacterial_spot: {
    disease: 'Madoa ya bakteria',
    symptoms: 'Madoa madogo yenye maji yanayogeuka kahawia-zambarau na kudondoka, yakiacha "matundu ya risasi"; madoa yaliyozama kwenye matunda.',
    spread: 'Matone ya mvua na mvua inayosukumwa na upepo; huingia kupitia vitundu vya asili na majeraha.',
    kenya: null,
    cultural: ['Epuka kumwagilia kwa kunyunyizia juu ya mimea.', 'Pogoa vitawi vyenye ugonjwa wakati wa kiangazi.', 'Chagua aina zinazostahimili unapopanda.'],
    biological: [],
    chemical: [{ ...COPPER, note: 'Shaba hulinda machipukizi mapya; haitibu madoa yaliyopo.' }],
  },
  Peach___healthy: healthy(['Punguza matunda ili yawe makubwa zaidi.', 'Pogoa kuacha katikati wazi kwa mwanga na hewa.']),
  'Pepper,_bell___Bacterial_spot': {
    disease: 'Madoa ya bakteria',
    symptoms: 'Madoa madogo yenye maji kwenye majani yanayogeuka kahawia yenye kingo za manjano; madoa yaliyoinuka kama kigaga kwenye matunda; majani kupukutika.',
    spread: 'Mbegu zenye ugonjwa, matone ya mvua, na kushika mimea ikiwa na maji.',
    kenya: 'Hupatikana sana kwenye pilipili hoho wakati wa mvua.',
    cultural: [
      'Tumia mbegu safi zilizothibitishwa na miche yenye afya.',
      'Usifanye kazi shambani majani yakiwa na maji.',
      'Ondoa mimea iliyoathirika vibaya; usipande pilipili wala nyanya mahali hapo kwa misimu 2.',
    ],
    biological: [],
    chemical: [{ ...COPPER, note: 'Nyunyizia kama kinga wakati wa mvua; shaba haitibu majani yaliyokwisha kuambukizwa.' }],
  },
  'Pepper,_bell___healthy': healthy(['Mwagilia kwenye shina, si juu ya majani.', 'Weka vigingi ili matunda yasiguse udongo.']),
  Potato___Early_blight: {
    disease: 'Baka la mapema (early blight)',
    symptoms: 'Madoa ya kahawia iliyokolea yenye pete kama shabaha, mara nyingi yakiwa na duara la manjano, yakianzia majani ya zamani ya chini.',
    spread: 'Vijimbegu kutoka kwa mabaki na udongo wenye ugonjwa, husambazwa na upepo na mvua; huwa mbaya zaidi kwenye mimea yenye shida.',
    kenya: 'Hupatikana sana katika maeneo ya viazi Kenya kama Nyandarua, Meru na Bomet.',
    cultural: [
      'Ondoa majani ya chini yenye ugonjwa.',
      'Hakikisha mimea ina chakula na maji ya kutosha — shida huufanya ugonjwa kuwa mbaya zaidi.',
      'Badilisha na mazao yasiyo ya jamii ya nyanya (si nyanya, pilipili wala biringanya).',
    ],
    biological: ['Dawa za kibiolojia zenye Bacillus subtilis kama kinga.'],
    chemical: [MANCOZEB, { active: 'Azoxystrobin' }, { active: 'Difenoconazole' }],
  },
  Potato___Late_blight: {
    disease: 'Baka chelewa (late blight)',
    pathogen: LATE_BLIGHT_PATHOGEN,
    symptoms: 'Mabaka makubwa meusi yenye maji kwenye majani, ukungu mweupe upande wa chini wakati wa unyevu, na uozo wa kahawia kwenye viazi.',
    spread: 'Vijimbegu husambazwa na upepo na mvua; huenea kwa kasi sana katika hali ya baridi (10–25 °C), mvua na unyevu.',
    kenya: 'Ugonjwa hatari zaidi wa viazi katika nyanda za juu za Kenya. Shamba zima linaweza kupotea ndani ya takriban wiki moja ya mvua.',
    cultural: [
      'Ondoa na zika (usiweke kwenye mboji) mimea yenye ugonjwa mara moja.',
      'Pandisha udongo kuzunguka mashina kulinda viazi.',
      'Tumia mbegu za viazi zilizothibitishwa na panda aina zinazostahimili.',
      'Kata na ondoa majani wiki 2 kabla ya kuvuna ikiwa baka lipo.',
    ],
    biological: [],
    chemical: [
      { active: 'Metalaxyl-M + mancozeb', note: 'Ya ndani ya mmea + kinga. ' + MANCOZEB_NOTE_SW },
      { active: 'Cymoxanil + mancozeb' },
      { active: 'Bidhaa za dimethomorph au propamocarb' },
      { active: 'Badilisha makundi ya dawa', note: 'Phytophthora hujenga usugu dhidi ya metalaxyl ikitumiwa peke yake mara kwa mara.' },
    ],
  },
  Potato___healthy: healthy([
    'Anza kinga ya baka mapema hali ya baridi na mvua inapoanza — angalia hatari ya baka kwenye skrini ya Mwanzo.',
    'Pandisha udongo kuzunguka mashina mimea inapokua.',
  ]),
  Raspberry___healthy: healthy(['Pogoa mashina ya zamani baada ya kuzaa.', 'Weka mistari membamba ili hewa ipite.']),
  Soybean___healthy: healthy(['Changanya mbegu na Rhizobium ya soya kabla ya kupanda.', 'Palilia mapema — soya hushindana vibaya na magugu katika wiki 6 za kwanza.']),
  Squash___Powdery_mildew: {
    disease: 'Ubwiri unga (powdery mildew)',
    symptoms: 'Mabaka meupe kama unga juu ya majani; majani hugeuka manjano na kufa mapema.',
    spread: 'Vijimbegu vinavyopeperushwa hewani; hupatikana sana wakati wa kiangazi chenye usiku wenye unyevu.',
    kenya: null,
    cultural: ['Ondoa majani yaliyoathirika sana.', 'Acha nafasi kati ya mimea ili hewa ipite.'],
    biological: ['Dawa za kunyunyizia za potassium bicarbonate.', 'Dawa za kibiolojia zenye Bacillus subtilis.'],
    chemical: [{ active: 'Salfa (sulphur)', note: 'Baadhi ya aina za maboga huathiriwa na salfa; jaribu kwenye mimea michache kwanza na epuka wakati wa joto.' }],
  },
  Strawberry___Leaf_scorch: {
    disease: 'Kuungua kwa jani (leaf scorch)',
    symptoms: 'Madoa mengi madogo ya zambarau iliyokolea yanayoungana hadi jani lionekane kama limeungua.',
    spread: 'Matone ya mvua kutoka majani yenye ugonjwa.',
    kenya: null,
    cultural: ['Ondoa na kuharibu majani yenye ugonjwa.', 'Tumia umwagiliaji wa matone badala ya kunyunyizia juu.', 'Panda vitalu upya kila miaka 2–3.'],
    biological: [],
    chemical: [{ active: 'Captan' }, COPPER],
  },
  Strawberry___healthy: healthy(['Ondoa vitawi vinavyotambaa ukitaka matunda makubwa.', 'Weka matandazo ya majani makavu ili matunda yabaki safi.']),
  Tomato___Bacterial_spot: {
    disease: 'Madoa ya bakteria',
    symptoms: 'Madoa madogo meusi yenye maji kwenye majani na matunda, wakati mwingine yenye duara la manjano; madoa kama vigaga kwenye matunda.',
    spread: 'Mbegu zenye ugonjwa, matone ya mvua na kushika mimea ikiwa na maji.',
    kenya: 'Hupatikana sana kwenye nyanya za shambani wakati wa mvua.',
    cultural: ['Tumia mbegu safi zilizothibitishwa.', 'Ondoa majani yenye ugonjwa; epuka kushika mimea ikiwa na maji.', 'Tumia umwagiliaji wa matone na matandazo.'],
    biological: [],
    chemical: [{ ...COPPER, note: 'Ni kinga tu — anza mapema wakati wa mvua.' }],
  },
  Tomato___Early_blight: {
    disease: 'Baka la mapema (early blight)',
    symptoms: 'Madoa meusi yenye pete kama shabaha na duara la manjano kwenye majani ya zamani; madoa meusi yaliyozama kwenye shina (uozo wa shingo).',
    spread: 'Vijimbegu kutoka mabaki na udongo unaorushwa; huwa mbaya zaidi kwenye mimea yenye shida wakati wa joto na unyevu.',
    kenya: 'Mojawapo ya magonjwa ya nyanya yanayopatikana sana nchini Kenya.',
    cultural: [
      'Ondoa majani ya chini yenye ugonjwa na uyachome au uyazike.',
      'Weka matandazo kuzuia udongo kurushwa kwenye majani.',
      'Weka vigingi na pogoa ili hewa ipite; badilisha mazao usipande nyanya, viazi wala pilipili.',
    ],
    biological: ['Dawa za kibiolojia zenye Bacillus subtilis.'],
    chemical: [
      MANCOZEB,
      { active: 'Azoxystrobin' },
      { active: 'Difenoconazole' },
      { active: 'Chlorothalonil si chaguo tena', note: 'Iliondolewa kwenye soko la Kenya na PCPB mwaka 2025.' },
    ],
  },
  Tomato___Late_blight: {
    disease: 'Baka chelewa (late blight)',
    pathogen: LATE_BLIGHT_PATHOGEN,
    symptoms: 'Mabaka makubwa ya kahawia-nyeusi yenye maji, ukungu mweupe chini ya majani wakati wa unyevu, uozo mgumu wa kahawia kwenye matunda.',
    spread: 'Upepo na mvua hubeba vijimbegu; huenea kwa kasi kubwa katika hali ya baridi, mvua na unyevu.',
    kenya: 'Ni mbaya sana kwenye nyanya za shambani katika misimu ya baridi na mvua nchini Kenya; mara nyingi hutoka mashamba ya viazi yaliyo karibu.',
    cultural: [
      'Ondoa na kuharibu mimea yenye ugonjwa mara moja — usiweke kwenye mboji.',
      'Usipande nyanya karibu na viazi.',
      'Weka vigingi, pogoa na acha nafasi ili majani yakauke haraka.',
    ],
    biological: [],
    chemical: [
      { active: 'Metalaxyl-M + mancozeb', note: MANCOZEB_NOTE_SW },
      { active: 'Cymoxanil + mancozeb' },
      { active: 'Bidhaa za dimethomorph au propamocarb' },
      { active: 'Badilisha makundi ya dawa', note: 'Epuka kutumia bidhaa za metalaxyl mfululizo.' },
    ],
  },
  Tomato___Leaf_Mold: {
    disease: 'Ukungu wa jani (leaf mould)',
    symptoms: 'Mabaka ya manjano hafifu juu ya jani na ukungu wa kijani-mzeituni kama velveti upande wa chini.',
    spread: 'Vijimbegu vinavyopeperushwa hewani; hustawi unyevu ukiwa zaidi ya takriban 85%, hupatikana sana kwenye greenhouse.',
    kenya: 'Hasa ni tatizo la greenhouse na vichuguu (tunnels).',
    cultural: ['Fungua madirisha na milango kupunguza unyevu.', 'Pogoa majani ya chini na acha nafasi kati ya mimea.', 'Mwagilia asubuhi kwenye shina.'],
    biological: [],
    chemical: [COPPER, { active: 'Difenoconazole' }],
  },
  Tomato___Septoria_leaf_spot: {
    disease: 'Madoa ya Septoria',
    symptoms: 'Madoa mengi madogo ya mviringo yenye kingo nyeusi na katikati iliyofifia yenye vitone vidogo vyeusi, yakianzia chini ya mmea.',
    spread: 'Matone ya mvua kutoka kwenye mabaki na majani yenye ugonjwa.',
    kenya: 'Hupatikana sana wakati wa mvua ndefu.',
    cultural: ['Ondoa majani ya chini yenye ugonjwa.', 'Weka matandazo na epuka kumwagilia juu ya majani.', 'Usipande nyanya mahali hapo kwa misimu 2.'],
    biological: [],
    chemical: [MANCOZEB, COPPER, { active: 'Azoxystrobin' }],
  },
  'Tomato___Spider_mites Two-spotted_spider_mite': {
    disease: 'Utitiri buibui (spider mites)',
    pathogen: 'Tetranychus urticae (utitiri buibui wenye madoa mawili)',
    symptoms: 'Vitone vidogo vya manjano, majani yenye rangi ya shaba na utando mwembamba upande wa chini.',
    spread: 'Utitiri hutembea na kupeperushwa kati ya mimea; idadi huongezeka sana wakati wa joto na ukame.',
    kenya: 'Hupatikana sana katika maeneo ya tambarare yenye joto na ukame na kwenye greenhouse.',
    cultural: [
      'Nyunyizia maji upande wa chini wa majani kuwaangusha utitiri.',
      'Ondoa majani yaliyoshambuliwa sana.',
      'Epuka dawa za wadudu zinazoua kila kitu kwa sababu zinaua maadui wa asili.',
    ],
    biological: [
      'Utitiri wawindaji (Phytoseiulus persimilis) huuzwa Kenya kwa udhibiti wa kibiolojia.',
      'Dawa za mwarubaini au sabuni ya kuua wadudu upande wa chini wa majani.',
    ],
    chemical: [
      { active: 'Spiromesifen au dawa nyingine ya utitiri iliyosajiliwa na PCPB' },
      { active: 'Abamectin imezuiliwa', note: 'Hairuhusiwi kutumika shambani wazi tangu ukaguzi wa PCPB wa 2025.' },
    ],
  },
  Tomato___Target_Spot: {
    disease: 'Madoa ya shabaha (target spot)',
    symptoms: 'Madoa ya kahawia ya mviringo yenye pete hafifu na duara la manjano kwenye majani, mashina na matunda.',
    spread: 'Vijimbegu kutoka kwenye mabaki; huchochewa na hali ya joto na unyevu.',
    kenya: 'Hufanana sana na baka la mapema — matibabu ni sawa.',
    cultural: ['Ondoa majani yenye ugonjwa.', 'Boresha nafasi na upogoaji ili hewa ipite.', 'Safisha mabaki ya zao baada ya mavuno.'],
    biological: [],
    chemical: [{ active: 'Azoxystrobin' }, { active: 'Difenoconazole' }, MANCOZEB],
  },
  Tomato___Tomato_Yellow_Leaf_Curl_Virus: {
    disease: 'Virusi vya kukunjika na kugeuka manjano kwa majani (TYLCV)',
    pathogen: 'Tomato yellow leaf curl virus, hubebwa na inzi weupe (Bemisia tabaci)',
    symptoms: 'Majani hujikunja juu na kugeuka manjano pembeni; mimea hudumaa na huzaa matunda machache.',
    spread: 'Ni kupitia inzi weupe tu (na miche yenye ugonjwa). Hauenei kwa kugusa.',
    kenya: 'Upo nchini Kenya; kudhibiti inzi weupe ndiyo kinga kuu.',
    cultural: [
      "Hakuna tiba. Ng'oa na kuharibu mimea yenye ugonjwa (iweke kwenye mfuko kwanza ili inzi weupe wasitoroke).",
      'Kuza miche chini ya neti isiyopitisha wadudu.',
      'Tumia mitego ya manjano yenye gundi; ondoa magugu yanayohifadhi inzi weupe.',
      'Muulize muuzaji wa pembejeo aina zinazostahimili TYLCV.',
    ],
    biological: ['Dawa za mwarubaini hupunguza idadi ya inzi weupe.'],
    chemical: [
      { active: 'Kudhibiti inzi weupe kwa bidhaa iliyosajiliwa na PCPB (k.m. spiromesifen)', note: 'Dawa hudhibiti mdudu, si virusi.' },
      { active: 'Imidacloprid imezuiliwa', note: 'Hairuhusiwi kutumika shambani wazi tangu ukaguzi wa PCPB wa 2025.' },
    ],
  },
  Tomato___Tomato_mosaic_virus: {
    disease: 'Virusi vya mosaiki (ToMV)',
    symptoms: 'Mchoro wa kijani hafifu na kijani kilichokolea (mosaiki); majani yaliyokunjamana au yenye umbo la feni; matunda kuiva bila usawa.',
    spread: 'Kwa mikono, vifaa na nguo, na kupitia mbegu. Ni imara sana — huishi kwenye nyuso na mabaki.',
    kenya: null,
    cultural: [
      'Hakuna tiba. Ondoa mimea yenye ugonjwa kwa uangalifu na uiharibu.',
      'Nawa mikono kwa sabuni na chovya vifaa kwenye bleach ya nyumbani ya 10% kati ya mimea.',
      'Usivute sigara wala kushika tumbaku karibu na nyanya.',
      'Tumia mbegu zilizothibitishwa na aina zinazostahimili.',
    ],
    biological: [],
    chemical: [{ active: 'Hakuna dawa inayodhibiti virusi hivi', note: 'Usafi ndio udhibiti pekee.' }],
  },
  Tomato___healthy: healthy(['Weka vigingi na pogoa ili hewa ipite.', 'Mwagilia kwenye shina asubuhi; weka matandazo kuzuia udongo kurushwa.']),

  // Added with model v5 (generated, see diseases.v5.sw.ts)
  ...SW_DISEASES_V5,
};

export const PEST_HINTS_SW: Record<string, string> = {
  Maize: 'Mahindi: matundu yaliyochanika kwenye majani machanga na kinyesi kama unga wa mbao ndani ya kikonyo huashiria viwavijeshi vamizi (fall armyworm). Kagua alfajiri au jioni.',
  Tomato: 'Nyanya: kagua upande wa chini wa majani kutafuta vidukari na inzi weupe, na angalia njia za fedha zinazopinda (Tuta absoluta).',
  Potato: 'Viazi: tafuta vidukari kwenye ncha za machipukizi na njia za wachimbaji majani.',
  Beans: 'Maharagwe: miche inayonyauka yenye kitako cha shina kilichovimba na kupasuka huashiria inzi wa maharagwe; pia kagua vidukari kwenye ncha za machipukizi.',
  Cabbage: 'Kabichi na sukuma wiki: matundu madogo na \"madirisha\" angavu kwenye majani huashiria viwavi wa nondo mgongo-almasi.',
};
