// Tassel — "Which crop is this leaf from?": the rules (no phone APIs; tested in Node).
//
// Why (Ezra, 11 Nov 2026, on the TECNO): a sukuma wiki (kale) leaf came back as
// "Eggplant, little leaf" and then as "Downy mildew of cabbage, 82%". The offline model has never
// seen kale: it knows 35 crops, and a leaf from any other crop is forced onto the nearest one it
// knows, sometimes with high confidence. A photo cannot tell the model what it was never taught.
//
// So the farmer says the crop first (one tap, remembered), and then:
//  1. A crop the model has not learned is never guessed offline. It goes to the online photo
//     check, and the app says why.
//  2. A crop the model knows: only that crop's classes can be named. The confidence shown is the
//     model's belief among that crop's classes (the share of probability each class holds within
//     the crop). No more eggplant for a tomato farmer.
//  3. If the model puts almost none of its belief on the chosen crop (CROP_MASS_MIN), the photo
//     does not look like the leaves it learned for that crop: the answer is "Not sure", with the
//     raw, low confidences shown. This stops rule 2 from turning a stray 2% into a confident name.
//  4. "I don't know the crop": unchanged, every class competes (and rule 3 of the app still holds:
//     below 75% it says "Not sure").
//
// CROP_MASS_MIN is a starting value, not a measured one. Measuring it (accuracy with the crop
// known, on the held-out test photos) needs a Kaggle run; until then it is deliberately cautious.

import { describeLabel } from './labels';

export const CROP_MASS_MIN = 0.15;
export const ANY_CROP = 'any';

/** Names the farmer may use → the crop name the model's labels give (lower case). */
const ALIAS: Record<string, string> = {
  capsicum: 'pepper (capsicum)',
  pepper: 'pepper (capsicum)',
  'sweet pepper': 'pepper (capsicum)',
  orange: 'citrus',
  lemon: 'citrus',
  corn: 'maize',
  bean: 'beans',
  'irish potato': 'potato',
  'irish potatoes': 'potato',
  'sukuma wiki': 'kale',
  sukuma: 'kale',
  brinjal: 'eggplant',
};

export function cropKey(name: string | null | undefined): string {
  const k = (name ?? '').trim().toLowerCase();
  return ALIAS[k] ?? k;
}

/** Positions of the classes that belong to a crop (Orange counts as Citrus). */
export function cropIndices(labels: string[], crop: string): number[] {
  const want = cropKey(crop);
  if (!want) return [];
  const out: number[] = [];
  labels.forEach((l, i) => {
    if (cropKey(describeLabel(l).crop) === want) out.push(i);
  });
  return out;
}

/** Has the offline model learned this crop at all? */
export function scannerKnows(labels: string[], crop: string | null | undefined): boolean {
  return !!crop && crop !== ANY_CROP && cropIndices(labels, crop).length > 0;
}

export type Ranked = { index: number; confidence: number };
export type Judged = {
  kind: 'any' | 'crop' | 'offcrop' | 'unknown-crop';
  top: Ranked[]; // best first, up to 3
  mass: number | null; // share of the model's belief on the chosen crop
};

const top3 = (items: Ranked[]) => [...items].sort((a, b) => b.confidence - a.confidence).slice(0, 3);

/** Rank the model's output given what the farmer said the crop is. */
export function judge(probs: ArrayLike<number>, labels: string[], crop: string | null | undefined): Judged {
  const all = Array.from(probs, (p, index) => ({ index, confidence: p }));
  if (!crop || crop === ANY_CROP) return { kind: 'any', top: top3(all), mass: null };
  const idx = cropIndices(labels, crop);
  if (!idx.length) return { kind: 'unknown-crop', top: top3(all), mass: 0 };
  const within = idx.map((i) => all[i]);
  const mass = within.reduce((s, x) => s + x.confidence, 0);
  if (!(mass >= CROP_MASS_MIN)) return { kind: 'offcrop', top: top3(within), mass };
  return { kind: 'crop', top: top3(within.map((x) => ({ index: x.index, confidence: x.confidence / mass }))), mass };
}

/**
 * The crops offered on the scan screen: the farmer's own first, then the usual Kenyan list,
 * each marked with whether the offline scanner has learned it.
 */
export function cropOptions(labels: string[], mine: (string | null | undefined)[], choices: string[]): { crop: string; offline: boolean }[] {
  const seen = new Set<string>();
  const out: { crop: string; offline: boolean }[] = [];
  for (const c of [...mine, ...choices]) {
    const name = (c ?? '').trim();
    const k = cropKey(name);
    if (!name || seen.has(k)) continue;
    seen.add(k);
    out.push({ crop: name, offline: scannerKnows(labels, name) });
  }
  return out;
}
