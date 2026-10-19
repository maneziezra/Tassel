// Tassel — Kiswahili version of the crop advisory guides (lib/advisory.ts).
// Same agronomy as the English text; no pesticide doses.

import type { CropGuide } from './advisory';
import type { Lang } from './i18n';

type StageSw = { name: string; days: string; activities: string[]; products: { name: string; usage: string }[] };
type GuideSw = { name: string; season: string; duration: string; stages: Record<number, StageSw> };

const LABEL = 'Fuata lebo ya bidhaa.';

const SW: Record<string, GuideSw> = {
  maize: {
    name: 'Mahindi',
    season: 'Mvua ndefu na fupi',
    duration: 'Siku 100–150 (kutegemea aina na mwinuko)',
    stages: {
      1: {
        name: 'Kuandaa shamba',
        days: 'Kabla ya kupanda',
        activities: [
          'Ondoa magugu na mabaki ya zao lililopita (zika mabaki ili kupunguza magonjwa ya madoa ya majani).',
          'Lima na haro hadi udongo uwe laini kabla ya mvua.',
          'Peleka sampuli ya udongo kwenye maabara ya udongo ya kaunti au kituo cha KALRO ukiweza — itakuonyesha mbolea sahihi.',
        ],
        products: [{ name: 'Dawa ya magugu ya kabla ya kuota iliyosajiliwa kwa mahindi', usage: `Si lazima. ${LABEL}` }],
      },
      2: {
        name: 'Kupanda',
        days: 'Mvua zinapoanza',
        activities: [
          'Panda mbegu zilizothibitishwa za aina inayofaa mwinuko wako, kina cha sm 5.',
          'Nafasi ya sm 75 × 30, mbegu moja kwa shimo ≈ mimea 17,800 kwa ekari (takriban 44,000 kwa hekta).',
          'Weka mbolea ya kupandia kwenye mtaro na uifunike kwa udongo kidogo kabla ya mbegu.',
          'Mbegu zilizothibitishwa kwa kawaida tayari zimetibiwa — usizitibu tena.',
        ],
        products: [
          { name: 'Mbegu zilizothibitishwa (chotara au OPV)', usage: 'Takriban kilo 10 kwa ekari' },
          { name: 'DAP (18-46-0) au NPK', usage: 'Kiwango cha kawaida kilo 50/ekari — kipimo cha udongo kitakupa kiwango chako halisi' },
        ],
      },
      3: {
        name: 'Ukuaji wa majani',
        days: 'Wiki 2–7',
        activities: [
          'Palizi ya kwanza wiki 2–3 baada ya kuota; palizi ya pili kabla ya kuweka mbolea ya kukuzia.',
          'Weka mbolea ya kukuzia yenye naitrojeni (CAN au urea) mmea ukifika urefu wa goti, sm 5–10 kutoka kwenye shina.',
          'Kagua viwavijeshi vamizi mara mbili kwa wiki: majani yaliyochanika na kinyesi ndani ya kikonyo.',
        ],
        products: [
          { name: 'CAN (26% N)', usage: 'Kiwango cha kawaida kilo 50/ekari kama mbolea ya kukuzia' },
          { name: 'Kudhibiti viwavijeshi (emamectin benzoate, spinetoram au Bt)', usage: `Tu ukipata viwavi. ${LABEL}` },
        ],
      },
      4: {
        name: 'Kutoa maua dume na nywele',
        days: 'Wiki 8–11',
        activities: [
          'Kipindi kinachohitaji maji zaidi — epusha ukame ukiweza kumwagilia.',
          'Kagua madoa ya kijivu na baka la kaskazini; piga picha majani yanayotiliwa shaka.',
          'Angalia ugonjwa wa MLN (majani kukauka kuanzia kingo) na uripoti kwa afisa wa ugani.',
        ],
        products: [{ name: 'Dawa ya kuvu ya strobilurin + triazole', usage: `Tu ikiwa madoa yamefika jani la gunzi. ${LABEL}` }],
      },
      5: {
        name: 'Kujaza punje',
        days: 'Wiki 12–16',
        activities: [
          'Weka shamba bila magugu.',
          'Andaa hifadhi safi na mifuko isiyopitisha hewa kabla ya kuvuna.',
          'Kagua magunzi kutafuta uozo — magunzi yaliyooza yanaweza kuwa na sumukuvu (aflatoxin); yaweke mbali na chakula na lishe ya mifugo.',
        ],
        products: [{ name: 'Mifuko ya hifadhi isiyopitisha hewa', usage: 'Kinga dhidi ya dumuzi bila kemikali' }],
      },
      6: {
        name: 'Kuvuna na kuhifadhi',
        days: 'Maganda yakikauka',
        activities: [
          'Vuna maganda yakikauka na punje zikiwa ngumu.',
          'Kausha nafaka juu ya turubai (kamwe si juu ya udongo) hadi unyevu chini ya 13.5% kabla ya kuhifadhi.',
          'Tenga punje zenye ukungu, zilizovunjika na zilizoharibiwa na wadudu ili kupunguza hatari ya sumukuvu.',
        ],
        products: [],
      },
    },
  },
  tomato: {
    name: 'Nyanya',
    season: 'Mwaka mzima (kwa umwagiliaji)',
    duration: 'Siku 90–150',
    stages: {
      1: {
        name: 'Kitalu',
        days: 'Wiki 0–4',
        activities: [
          'Tumia kitalu kilichoinuliwa au trei zenye udongo safi unaotiririsha maji (tibu udongo kwa jua ukiutumia tena).',
          'Panda kina cha sm 1 kwa mistari; mwagilia taratibu, asubuhi tu — kitalu chenye maji mengi husababisha miche kuoza.',
          'Funika kwa neti isiyopitisha wadudu ili kuzuia inzi weupe (hubeba virusi vya kukunjika kwa majani).',
        ],
        products: [
          { name: 'Mbegu chotara zilizothibitishwa', usage: 'Chagua aina zinazostahimili magonjwa ya eneo lako (angalia pakiti)' },
          { name: 'Dawa ya kibiolojia ya Trichoderma', usage: `Dhidi ya kuoza kwa miche. ${LABEL}` },
        ],
      },
      2: {
        name: 'Kupandikiza',
        days: 'Wiki 4–6',
        activities: [
          'Pandikiza miche ikiwa na majani halisi 4–6, jioni au siku yenye mawingu.',
          'Nafasi ya takriban sm 60 × 45 (aina fupi) au sm 90 × 60 (aina za vigingi).',
          'Changanya mbolea ya kupandia vizuri na udongo shimoni na mwagilia mara moja.',
          'Usipande karibu na viazi — baka chelewa huhama kati yao.',
        ],
        products: [{ name: 'DAP au NPK', usage: 'Takriban kijiko kimoja cha chai (gramu 5) kwa shimo, kikichanganywa na udongo' }],
      },
      3: {
        name: 'Ukuaji wa majani',
        days: 'Wiki 6–9',
        activities: [
          'Weka vigingi au fremu kabla mimea haijafika sm 30.',
          'Ondoa machipukizi ya pembeni chini ya kishada cha kwanza cha maua.',
          'Weka mbolea ya kukuzia kwa awamu ndogo kama alivyoshauri afisa wa ugani.',
          'Kagua kila wiki baka la mapema, inzi weupe na njia za Tuta absoluta.',
        ],
        products: [
          { name: 'Mitego ya manjano yenye gundi', usage: 'Kwa inzi weupe na wachimbaji majani' },
          { name: 'Dawa ya wadudu ya mwarubaini', usage: LABEL },
        ],
      },
      4: {
        name: 'Kutoa maua',
        days: 'Wiki 9–12',
        activities: [
          'Mwagilia mara kwa mara — kumwagilia bila usawa husababisha kuoza kwa kitako cha tunda.',
          'Linda dhidi ya baka wakati wa mvua (angalia hatari ya baka kwenye skrini ya Mwanzo).',
          'Tumia mitego ya feromoni kufuatilia Tuta absoluta.',
        ],
        products: [
          { name: 'Dawa ya kuvu ya kinga (shaba au mancozeb)', usage: `${LABEL} Mancozeb ilikuwa ikikaguliwa na PCPB mwaka 2025.` },
          { name: 'Mtego wa feromoni wa Tuta absoluta', usage: 'Mmoja au zaidi kwa kila greenhouse / robo ekari' },
        ],
      },
      5: {
        name: 'Kuzaa na kuvuna',
        days: 'Wiki 12+',
        activities: [
          'Vuna katika hatua ya rangi ambayo soko lako linataka; vuna kila siku 2–3.',
          'Shika kwa upole na pakia kwenye kreti safi.',
          'Angalia muda wa kusubiri kabla ya kuvuna wa dawa yoyote uliyonyunyizia karibuni.',
        ],
        products: [{ name: 'Bacillus thuringiensis (Bt)', usage: `Kwa viwavi wa matunda. ${LABEL}` }],
      },
    },
  },
  beans: {
    name: 'Maharagwe',
    season: 'Mvua ndefu na fupi',
    duration: 'Siku 60–90',
    stages: {
      1: {
        name: 'Kupanda',
        days: 'Mvua zinapoanza',
        activities: [
          'Tumia mbegu safi zilizothibitishwa — virusi vingi vya maharagwe hubebwa na mbegu.',
          'Changanya mbegu na Rhizobium kivulini kabla ya kupanda.',
          'Panda kina cha sm 3–5 kwa nafasi ya takriban sm 45–50 × 10–15.',
          'Tumia mbolea yenye fosforasi; maharagwe huhitaji naitrojeni kidogo vinundu vikishaota.',
        ],
        products: [
          { name: 'Rhizobium ya maharagwe (k.m. BIOFIX)', usage: 'Fuata maelekezo ya pakiti' },
          { name: 'DAP au TSP', usage: 'Kipimo cha udongo kitakupa kiwango chako halisi' },
        ],
      },
      2: {
        name: 'Ukuaji wa majani',
        days: 'Wiki 2–5',
        activities: [
          'Palilia wiki 2 na 4 baada ya kuota (juu juu, ili kulinda mizizi).',
          'Inzi wa maharagwe: kupanda mapema, matandazo na kupandisha udongo kuzunguka shina husaidia miche kuishi.',
          'Kagua vidukari na vivimbe vya kutu.',
        ],
        products: [{ name: 'Dawa ya kutibu mbegu au ya wadudu iliyosajiliwa kwa inzi wa maharagwe', usage: `Dimethoate sasa ni ya kuua mchwa pekee (PCPB 2025). ${LABEL}` }],
      },
      3: {
        name: 'Kutoa maua',
        days: 'Wiki 5–8',
        activities: ['Kipindi muhimu cha maji.', 'Usipalilie wakati wa maua — huangusha maua.', 'Kagua thiripi na utitiri buibui wakati wa ukame.'],
        products: [{ name: 'Mwarubaini au sabuni ya kuua wadudu', usage: `Kwa thiripi na utitiri. ${LABEL}` }],
      },
      4: {
        name: 'Kujaza maganda na kuvuna',
        days: 'Wiki 8–12',
        activities: ['Vuna maganda mengi yakiwa makavu na rangi ya manjano-kahawia.', 'Kausha maharagwe yaliyopurwa hadi unyevu chini ya 13%.', 'Hifadhi kwenye mifuko isiyopitisha hewa.'],
        products: [{ name: 'Mifuko ya hifadhi isiyopitisha hewa', usage: 'Kinga dhidi ya fukusi bila kemikali' }],
      },
    },
  },
  wheat: {
    name: 'Ngano',
    season: 'Nyanda za juu, msimu wa baridi',
    duration: 'Siku 110–150',
    stages: {
      1: {
        name: 'Kuandaa shamba na kupanda',
        days: 'Wiki 0–2',
        activities: [
          'Lima na haro hadi udongo uwe laini na imara.',
          'Panda mbegu zilizothibitishwa kina cha sm 2–5, takriban kilo 50 kwa ekari (kilo 125/ha).',
          'Chagua aina ya KALRO inayostahimili kutu ya shina (Ug99) na kutu ya manjano.',
        ],
        products: [
          { name: 'Mbegu za ngano zilizothibitishwa zinazostahimili kutu', usage: 'Takriban kilo 50 kwa ekari' },
          { name: 'DAP', usage: 'Kiwango cha kawaida kilo 50/ekari wakati wa kupanda' },
        ],
      },
      2: {
        name: 'Kuchipua (tillering)',
        days: 'Wiki 4–8',
        activities: ['Weka mbolea ya kukuzia ya CAN.', 'Dhibiti magugu ya majani mapana na nyasi mapema.', 'Kagua vivimbe vya kutu kwenye majani na mashina.'],
        products: [
          { name: 'CAN (26% N)', usage: 'Kiwango cha kawaida kilo 50/ekari' },
          { name: 'Dawa ya magugu ya ngano iliyosajiliwa', usage: LABEL },
        ],
      },
      3: {
        name: 'Kutoa masuke na kujaza punje',
        days: 'Wiki 9–16',
        activities: ['Linda jani la bendera — hulisha punje.', 'Nyunyizia dawa ya kuvu ikiwa kutu au septoria imefika majani ya juu.', 'Kagua vidukari.'],
        products: [{ name: 'Dawa ya kuvu ya triazole au strobilurin + triazole', usage: LABEL }],
      },
      4: {
        name: 'Kuvuna',
        days: 'Wiki 16–20',
        activities: ['Vuna punje zikiwa ngumu na unyevu chini ya takriban 14%.', 'Kausha hadi 12–13% kabla ya kuhifadhi.', 'Hifadhi kwenye magunia safi yasiyogusa sakafu.'],
        products: [],
      },
    },
  },
  potato: {
    name: 'Viazi',
    season: 'Nyanda za juu, mvua zote mbili',
    duration: 'Siku 90–120',
    stages: {
      1: {
        name: 'Kuandaa shamba na kupanda',
        days: 'Wiki 0–2',
        activities: [
          'Badilisha mazao: usipande baada ya viazi, nyanya au mazao mengine ya jamii hiyo kwa misimu 3 (mnyauko bakteria).',
          'Panda viazi vizima vya mbegu vilivyothibitishwa kina cha sm 10, mistari sm 75 na sm 30 ndani ya mstari.',
          'Weka mbolea ya kupandia kwenye mtaro na uifunike kidogo kabla ya mbegu.',
        ],
        products: [
          { name: 'Mbegu za viazi zilizothibitishwa (k.m. Shangi)', usage: 'Takriban magunia 16–20 ya kilo 50 kwa ekari' },
          { name: 'DAP au NPK', usage: 'Kipimo cha udongo kitakupa kiwango chako halisi' },
        ],
      },
      2: {
        name: 'Kuota',
        days: 'Wiki 2–5',
        activities: ['Palizi ya kwanza.', 'Pandisha udongo mimea ikifika urefu wa takriban sm 20.', 'Anza kinga ya baka hali ya baridi na mvua inapoanza.'],
        products: [{ name: 'Dawa ya kuvu ya kinga (mancozeb au shaba)', usage: `${LABEL} Mancozeb ilikuwa ikikaguliwa na PCPB mwaka 2025.` }],
      },
      3: {
        name: 'Ukuaji na kunenepa kwa viazi',
        days: 'Wiki 5–11',
        activities: [
          'Pandisha udongo mara ya pili kufunika viazi vinavyokua.',
          'Wakati wa mvua, tumia dawa ya baka ya ndani ya mmea na badilisha makundi ya kemikali.',
          'Ondoa mimea inayonyauka pamoja na viazi vyake (mnyauko bakteria) — usiiache shambani.',
        ],
        products: [{ name: 'Dawa ya baka ya ndani ya mmea (k.m. michanganyiko ya metalaxyl-M, dimethomorph au cymoxanil)', usage: LABEL }],
      },
      4: {
        name: 'Kukomaa na kuvuna',
        days: 'Wiki 12–16',
        activities: [
          'Acha kumwagilia takriban wiki 2 kabla ya kuvuna.',
          'Kata majani na uache viazi ardhini takriban wiki 2 ili maganda yawe magumu.',
          'Vuna siku kavu, epuka kuchubua, na hifadhi mahali penye giza, ubaridi na hewa.',
        ],
        products: [],
      },
    },
  },
};

/** A crop guide in the app language (English is the fallback for anything missing). */
export function localizeGuide(guide: CropGuide, lang: Lang): CropGuide {
  const sw = lang === 'sw' ? SW[guide.id] : undefined;
  if (!sw) return guide;
  return {
    ...guide,
    name: sw.name,
    season: sw.season,
    duration: sw.duration,
    stages: guide.stages.map((s) => {
      const st = sw.stages[s.id];
      if (!st) return s;
      return {
        ...s,
        name: st.name,
        days: st.days,
        activities: st.activities,
        products: s.products.map((p, i) => ({ ...p, name: st.products[i]?.name ?? p.name, usage: st.products[i]?.usage ?? p.usage })),
      };
    }),
  };
}
