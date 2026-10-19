// Tassel — crop calendar: what to do on each field, worked out from its
// planting date (transplanting date for tomato). Timings follow the advisory
// guides (lib/advisory.ts) and are typical for Kenyan conditions; varieties and
// altitude change them, so tasks are shown as windows, not exact days.
// Tasks name practices and active ingredients, never doses.

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { IconName } from '../components/ui';
import { getLang, type Lang } from './i18n';
import type { Farm } from './data';

export type CalTask = {
  id: string;
  start: number; // days after planting
  end: number;
  icon: IconName;
  title: { en: string; sw: string };
  detail: { en: string; sw: string };
};

export type CropCalendar = { id: string; plantingLabel: { en: string; sw: string }; tasks: CalTask[] };

const T = (
  id: string,
  start: number,
  end: number,
  icon: IconName,
  titleEn: string,
  titleSw: string,
  detailEn: string,
  detailSw: string
): CalTask => ({ id, start, end, icon, title: { en: titleEn, sw: titleSw }, detail: { en: detailEn, sw: detailSw } });

export const CALENDARS: Record<string, CropCalendar> = {
  maize: {
    id: 'maize',
    plantingLabel: { en: 'Planting date', sw: 'Tarehe ya kupanda' },
    tasks: [
      T('plant', 0, 0, 'sprout', 'Plant and apply planting fertiliser', 'Panda na weka mbolea ya kupandia',
        'Certified seed 5 cm deep at 75 × 30 cm. Put fertiliser in the furrow and cover it with a little soil before the seed.',
        'Mbegu zilizothibitishwa kina cha sm 5 kwa nafasi ya sm 75 × 30. Weka mbolea kwenye mtaro na uifunike kwa udongo kidogo kabla ya mbegu.'),
      T('gap', 10, 14, 'magnify', 'Check germination and gap-fill', 'Kagua uotaji na ziba nafasi',
        'Replant empty holes within two weeks of planting so the crop matures evenly.',
        'Panda tena mashimo yasiyoota ndani ya wiki mbili ili zao likomae kwa pamoja.'),
      T('weed1', 14, 21, 'shovel', 'First weeding', 'Palizi ya kwanza',
        'Weed 2–3 weeks after emergence. Weeds compete most in the first 6 weeks.',
        'Palilia wiki 2–3 baada ya kuota. Magugu hushindana zaidi katika wiki 6 za kwanza.'),
      T('faw', 14, 56, 'bug-outline', 'Scout for fall armyworm twice a week', 'Kagua viwavijeshi vamizi mara mbili kwa wiki',
        'Look for ragged holes and sawdust-like droppings in the whorl, best at dawn or dusk. Treat only if you find larvae.',
        'Tafuta matundu yaliyochanika na kinyesi kama unga wa mbao ndani ya kikonyo, alfajiri au jioni. Tibu tu ukipata viwavi.'),
      T('topdress', 28, 42, 'flask-outline', 'Second weeding and top-dress at knee height', 'Palizi ya pili na mbolea ya kukuzia (urefu wa goti)',
        'Apply CAN or urea 5–10 cm from the stem when the soil is moist, at the rate from your soil test or extension officer.',
        'Weka CAN au urea sm 5–10 kutoka kwenye shina udongo ukiwa na unyevu, kwa kipimo kutoka kipimo cha udongo au afisa wa ugani.'),
      T('tassel', 56, 77, 'flower', 'Tasselling and silking — avoid stress', 'Kutoa maua — epusha zao na shida',
        'The most water-sensitive stage. Scout for grey leaf spot, northern leaf blight and maize lethal necrosis.',
        'Hiki ndicho kipindi kinachohitaji maji zaidi. Kagua madoa ya kijivu, baka la kaskazini na ugonjwa wa MLN.'),
      T('fill', 84, 112, 'archive-outline', 'Grain filling — prepare storage', 'Kujaza punje — andaa hifadhi',
        'Keep weeds down, check cobs for ear rot and buy hermetic storage bags.',
        'Dhibiti magugu, kagua magunzi kutafuta uozo na nunua mifuko ya kuhifadhi isiyopitisha hewa.'),
      T('harvest', 120, 150, 'hand-back-right', 'Harvest when husks are dry', 'Vuna maganda yakikauka',
        'Dry grain on tarpaulins to below 13.5% moisture and sort out mouldy cobs (aflatoxin risk).',
        'Kausha nafaka juu ya turubai hadi unyevu chini ya 13.5% na tenga magunzi yenye ukungu (hatari ya sumukuvu).'),
    ],
  },
  beans: {
    id: 'beans',
    plantingLabel: { en: 'Planting date', sw: 'Tarehe ya kupanda' },
    tasks: [
      T('plant', 0, 0, 'sprout', 'Plant with Rhizobium inoculant', 'Panda ukitumia Rhizobium',
        'Clean certified seed, mixed with Rhizobium inoculant in the shade just before planting. Use a phosphorus fertiliser.',
        'Mbegu safi zilizothibitishwa, changanya na Rhizobium kivulini kabla ya kupanda. Tumia mbolea yenye fosforasi.'),
      T('beanfly', 7, 14, 'bug-outline', 'Watch for bean fly', 'Angalia inzi wa maharagwe',
        'Wilting seedlings with swollen stem bases point to bean fly. Earth up soil around the stems.',
        'Miche inayonyauka yenye vitako vya shina vilivyovimba huashiria inzi wa maharagwe. Pandisha udongo kuzunguka mashina.'),
      T('weed1', 14, 18, 'shovel', 'First weeding (shallow)', 'Palizi ya kwanza (juu juu)',
        'Weed shallowly so you do not damage the roots.', 'Palilia juu juu ili usiharibu mizizi.'),
      T('weed2', 28, 32, 'shovel', 'Second weeding — before flowering', 'Palizi ya pili — kabla ya maua',
        'Do not weed once flowering starts; it knocks off flowers.', 'Usipalilie maua yakianza kutoka; huangusha maua.'),
      T('flower', 35, 56, 'flower', 'Flowering — water and scout', 'Kutoa maua — maji na ukaguzi',
        'Critical water period. Scout for aphids, thrips, rust and angular leaf spot.',
        'Kipindi muhimu cha maji. Kagua vidukari, thiripi, kutu na madoa ya pembe.'),
      T('harvest', 70, 90, 'hand-back-right', 'Harvest when most pods are dry', 'Vuna maganda mengi yakikauka',
        'Dry threshed beans to below 13% moisture and store them in hermetic bags.',
        'Kausha maharagwe yaliyopurwa hadi unyevu chini ya 13% na uyahifadhi kwenye mifuko isiyopitisha hewa.'),
    ],
  },
  potato: {
    id: 'potato',
    plantingLabel: { en: 'Planting date', sw: 'Tarehe ya kupanda' },
    tasks: [
      T('plant', 0, 0, 'sprout', 'Plant certified seed potatoes', 'Panda mbegu za viazi zilizothibitishwa',
        'Whole tubers 10 cm deep at 75 × 30 cm with fertiliser in the furrow. Do not plant after potato or tomato for 3 seasons.',
        'Viazi vizima kina cha sm 10 kwa nafasi ya sm 75 × 30 na mbolea kwenye mtaro. Usipande baada ya viazi au nyanya kwa misimu 3.'),
      T('weed1', 18, 24, 'shovel', 'First weeding', 'Palizi ya kwanza', 'Weed before the plants close the rows.', 'Palilia kabla mimea haijafunika mistari.'),
      T('blight', 21, 90, 'weather-pouring', 'Watch the blight risk', 'Fuatilia hatari ya baka',
        'From emergence, check the late blight risk on the Home screen and protect the crop before wet, cool weather.',
        'Tangu kuota, angalia hatari ya baka chelewa kwenye skrini ya Mwanzo na linda zao kabla ya hali ya mvua na baridi.'),
      T('hill1', 28, 35, 'terrain', 'First hilling (plants about 20 cm)', 'Kupandisha udongo mara ya kwanza (mimea sm 20)',
        'Pull soil up around the stems to protect the tubers.', 'Pandisha udongo kuzunguka mashina kulinda viazi.'),
      T('hill2', 49, 56, 'terrain', 'Second hilling', 'Kupandisha udongo mara ya pili',
        'Cover developing tubers. Remove wilting plants together with their tubers (bacterial wilt).',
        'Funika viazi vinavyokua. Ondoa mimea inayonyauka pamoja na viazi vyake (mnyauko bakteria).'),
      T('haulm', 85, 100, 'content-cut', 'Stop irrigating and cut the haulms', 'Acha kumwagilia na kata majani',
        'About 2 weeks before harvest. Leave tubers in the soil so the skins harden.',
        'Takriban wiki 2 kabla ya kuvuna. Acha viazi ardhini ili maganda yawe magumu.'),
      T('harvest', 100, 120, 'hand-back-right', 'Harvest on a dry day', 'Vuna siku kavu',
        'Avoid bruising and store in a dark, cool, airy place.', 'Epuka kuchubua na hifadhi mahali penye giza, ubaridi na hewa.'),
    ],
  },
  tomato: {
    id: 'tomato',
    plantingLabel: { en: 'Transplanting date', sw: 'Tarehe ya kupandikiza' },
    tasks: [
      T('plant', 0, 0, 'sprout', 'Transplant seedlings', 'Pandikiza miche',
        'At 4–6 true leaves, in the evening. Mix planting fertiliser into the hole and water at once. Never plant next to potatoes.',
        'Miche ikiwa na majani halisi 4–6, jioni. Changanya mbolea ya kupandia shimoni na mwagilia mara moja. Usipande karibu na viazi.'),
      T('stake', 7, 14, 'format-vertical-align-top', 'Stake before plants reach 30 cm', 'Weka vigingi kabla mimea haijafika sm 30',
        'Stakes or trellis keep leaves dry and fruit off the soil.', 'Vigingi au fremu huweka majani makavu na matunda mbali na udongo.'),
      T('scout', 14, 42, 'magnify', 'Remove side shoots and scout weekly', 'Ondoa machipukizi ya pembeni na kagua kila wiki',
        'Remove suckers below the first flower cluster. Scout for early blight, whiteflies and Tuta absoluta mines.',
        'Ondoa machipukizi chini ya kishada cha kwanza cha maua. Kagua baka la mapema, inzi weupe na njia za Tuta absoluta.'),
      T('topdress', 21, 28, 'flask-outline', 'First top-dress (in small split doses)', 'Mbolea ya kukuzia ya kwanza (kwa awamu ndogo)',
        'Use the rate your extension officer or soil test gives.', 'Tumia kipimo kutoka kwa afisa wa ugani au kipimo cha udongo.'),
      T('flower', 35, 63, 'flower', 'Flowering — water evenly', 'Kutoa maua — mwagilia kwa usawa',
        'Uneven watering causes blossom-end rot. Protect against blight in wet weather; use pheromone traps for Tuta absoluta.',
        'Kumwagilia bila usawa husababisha kuoza kwa kitako cha tunda. Linda dhidi ya baka wakati wa mvua; tumia mitego ya feromoni kwa Tuta absoluta.'),
      T('harvest', 63, 120, 'basket-outline', 'Harvest every 2–3 days', 'Vuna kila siku 2–3',
        'Check the pre-harvest interval on the label of anything you sprayed recently.',
        'Angalia muda wa kusubiri kabla ya kuvuna kwenye lebo ya dawa yoyote uliyonyunyizia karibuni.'),
    ],
  },
  wheat: {
    id: 'wheat',
    plantingLabel: { en: 'Planting date', sw: 'Tarehe ya kupanda' },
    tasks: [
      T('plant', 0, 0, 'sprout', 'Drill seed with planting fertiliser', 'Panda mbegu pamoja na mbolea ya kupandia',
        'Certified rust-tolerant seed, 2–5 cm deep, about 50 kg per acre.',
        'Mbegu zilizothibitishwa zinazostahimili kutu, kina cha sm 2–5, takriban kilo 50 kwa ekari.'),
      T('topdress', 28, 42, 'flask-outline', 'Top-dress and control weeds', 'Mbolea ya kukuzia na kudhibiti magugu',
        'Top-dress with CAN at tillering and control broadleaf and grass weeds early.',
        'Weka CAN wakati wa kuchipua na dhibiti magugu ya majani mapana na nyasi mapema.'),
      T('rust', 28, 84, 'magnify', 'Scout for rust weekly', 'Kagua kutu kila wiki',
        'Look for rust pustules on leaves and stems.', 'Tafuta vivimbe vya kutu kwenye majani na mashina.'),
      T('flag', 63, 98, 'flag-outline', 'Protect the flag leaf', 'Linda jani la bendera',
        'Spray a fungicide only if rust or septoria reaches the upper leaves.',
        'Nyunyizia dawa ya kuvu tu ikiwa kutu au septoria imefika majani ya juu.'),
      T('harvest', 110, 150, 'hand-back-right', 'Harvest when grain is hard', 'Vuna punje zikiwa ngumu',
        'Harvest below about 14% moisture and dry to 12–13% before storage.',
        'Vuna unyevu ukiwa chini ya takriban 14% na kausha hadi 12–13% kabla ya kuhifadhi.'),
    ],
  },
};

/** Which calendar fits a field's crop text (English or Kiswahili). */
export function calendarFor(crop: string | null | undefined): CropCalendar | null {
  const c = (crop ?? '').toLowerCase();
  if (/maize|corn|mahindi/.test(c)) return CALENDARS.maize;
  if (/bean|maharag/.test(c)) return CALENDARS.beans;
  if (/potato|viazi|kiazi/.test(c)) return CALENDARS.potato;
  if (/tomato|nyanya/.test(c)) return CALENDARS.tomato;
  if (/wheat|ngano/.test(c)) return CALENDARS.wheat;
  return null;
}

export type TaskStatus = 'done' | 'now' | 'soon' | 'later' | 'missed';
export type FieldTask = {
  key: string; // farmId:taskId
  farmId: string;
  farmName: string;
  task: CalTask;
  title: string;
  detail: string;
  startDate: Date;
  endDate: Date;
  status: TaskStatus;
  ticked: boolean;
};

const DAY = 86400000;

export function parseDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toIsoDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function daysSince(iso: string, today = new Date()): number {
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((t.getTime() - parseDate(iso).getTime()) / DAY);
}

const tickKey = (farmId: string) => `cal:${farmId}`;

export async function loadTicks(farmId: string): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(tickKey(farmId));
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export async function saveTicks(farmId: string, ids: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(tickKey(farmId), JSON.stringify(ids));
  } catch {
    // non-critical
  }
}

/** All tasks for one field with their dates and status. */
export function fieldTasks(farm: Farm, ticks: string[], lang: Lang = getLang(), today = new Date()): FieldTask[] {
  const cal = calendarFor(farm.crop);
  if (!cal || !farm.planting_date) return [];
  const planted = parseDate(farm.planting_date);
  const now = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return cal.tasks.map((task) => {
    const startDate = new Date(planted.getTime() + task.start * DAY);
    const endDate = new Date(planted.getTime() + task.end * DAY);
    const ticked = ticks.includes(task.id);
    let status: TaskStatus;
    if (ticked) status = 'done';
    else if (now > endDate.getTime()) status = 'missed';
    else if (now >= startDate.getTime()) status = 'now';
    else if (startDate.getTime() - now <= 7 * DAY) status = 'soon';
    else status = 'later';
    return {
      key: `${farm.id}:${task.id}`,
      farmId: farm.id,
      farmName: farm.name,
      task,
      title: task.title[lang],
      detail: task.detail[lang],
      startDate,
      endDate,
      status,
      ticked,
    };
  });
}

/** Where the crop is now, for the field card ("Week 5 · Second weeding and top-dress"). */
export function currentStage(farm: Farm, lang: Lang = getLang(), today = new Date()): { week: number; title: string } | null {
  const cal = calendarFor(farm.crop);
  if (!cal || !farm.planting_date) return null;
  const d = daysSince(farm.planting_date, today);
  if (d < 0) return { week: 0, title: lang === 'sw' ? 'Bado kupandwa' : 'Not planted yet' };
  const active = cal.tasks.filter((t) => d >= t.start && d <= t.end);
  const last = [...cal.tasks].reverse().find((t) => d >= t.start);
  const pick = active[active.length - 1] ?? last ?? cal.tasks[0];
  return { week: Math.floor(d / 7) + 1, title: pick.title[lang] };
}
