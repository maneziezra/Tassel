// Tassel — turns the disease guide's words into pictures for the scan result.
// Pure (no React Native imports) so scripts/test-result-pictures.mjs can check it.
//
// Rule 5 (every claim backed): a picture is shown only when the guide's own text says it.
// Matching runs on the English source text, so the same pictures show in Kiswahili.

export type Picture = { key: string; label: string; icon?: string; noto?: 'rain' | 'droplet' | 'bug' | 'leaves' };

const SPREAD: Array<[RegExp, Picture]> = [
  [/rain|splash/i, { key: 'rain', label: 'Rain splash', noto: 'rain' }],
  [/wind|air(borne)?\b|spores? (blow|carried)/i, { key: 'wind', label: 'Wind', icon: 'weather-windy' }],
  [/insect|aphid|whitefl|thrips|leafhopper|beetle|vector|mite|psyllid|mealybug/i, { key: 'insects', label: 'Insects', noto: 'bug' }],
  [/seed|tuber|transplant|seedling|cutting|planting material|sett/i, { key: 'seed', label: 'Infected seed', icon: 'seed-outline' }],
  [/soil|debris|residue|crop remains|stubble/i, { key: 'soil', label: 'Soil and old crop', icon: 'shovel' }],
  [/tool|hand|knife|prun|worker|touch|machinery/i, { key: 'hands', label: 'Hands and tools', icon: 'hand-back-left-outline' }],
  [/irrigation|dew|wet|humid|moist|water/i, { key: 'wet', label: 'Damp weather', noto: 'droplet' }],
];

// "Does not need rain" must not draw rain: a sentence with a negation gives no picture.
const NEGATION = /\b(not|no|never|without)\b|n't\b/i;

/** "How it spreads" pictures, only those the text names, at most 4. */
export function spreadPictures(spreadEn: string | null | undefined): Picture[] {
  if (!spreadEn) return [];
  const sentences = spreadEn.split(/(?<=[.;])\s+/).filter((s) => !NEGATION.test(s));
  return SPREAD.filter(([re]) => sentences.some((s) => re.test(s))).map(([, p]) => p).slice(0, 4);
}

const STEP_ICONS: Array<[RegExp, string]> = [
  [/burn|destroy|bury|dispose/i, 'fire'],
  [/remove|pull|uproot|rogue|cut off|pick off|prune/i, 'content-cut'],
  [/rotat/i, 'sync'],
  [/spac|airflow|air flow|ventilat|stake|open the canopy/i, 'weather-windy'],
  [/mulch/i, 'layers-outline'],
  [/irrigat|water|drip/i, 'water-outline'],
  [/certified|resistant|tolerant|variet|clean seed|seed/i, 'seed-outline'],
  [/weed/i, 'shovel'],
  [/disinfect|clean|wash|sanitis|sanitiz|sterili/i, 'hand-wash-outline'],
  [/trap/i, 'bug-outline'],
  [/scout|check|monitor|inspect|watch/i, 'magnify'],
  [/fertili|manure|nitrogen|potash|lime|compost/i, 'sack'],
];

/** The icon for one action step; a plain check when no word matches. */
export function stepIcon(stepEn: string): string {
  return STEP_ICONS.find(([re]) => re.test(stepEn))?.[1] ?? 'check-circle-outline';
}

/** A short title for a step tile: its first clause, whole (the full step opens on tap). */
export function stepTitle(step: string): string {
  const m = step.match(/^(.+?)(?:[;:]|,\s|\s[—–-]\s|\s\(|\.\s|\.$|$)/);
  return (m ? m[1] : step).trim();
}

export const KIND_PICTURE: Record<string, Picture> = {
  Fungal: { key: 'Fungal', label: 'Fungus', icon: 'mushroom-outline' },
  Oomycete: { key: 'Oomycete', label: 'Water mould', icon: 'water-outline' },
  Bacterial: { key: 'Bacterial', label: 'Bacteria', icon: 'bacteria-outline' },
  Viral: { key: 'Viral', label: 'Virus', icon: 'virus-outline' },
  Pest: { key: 'Pest', label: 'Pest', noto: 'bug' },
  Algal: { key: 'Algal', label: 'Alga', icon: 'leaf-circle-outline' },
  Disorder: { key: 'Disorder', label: 'Disorder', icon: 'flask-outline' },
};

/** Danger meter: how many of 4 segments are filled. */
export const URGENCY_LEVEL: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };
