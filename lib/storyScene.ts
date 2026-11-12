// Tassel — which animated scene shows a farming step (components/StoryScene.tsx).
//
// The scene is chosen from the step's own words, in order, so the picture never
// shows something the text does not say. Pure and tested (scripts/test-story-scene.mjs).

export type SceneKind =
  | 'weed'
  | 'topdress'
  | 'spray'
  | 'water'
  | 'harvest'
  | 'dry'
  | 'store'
  | 'scout'
  | 'remove'
  | 'stake'
  | 'prepare'
  | 'earthup'
  | 'transplant'
  | 'net'
  | 'seedtreat'
  | 'sort'
  | 'mix'
  | 'grow';

const RULES: [SceneKind, RegExp][] = [
  ['sort', /\bsort\b|mouldy|broken grain|damaged grain|\bgrade\b/i],
  ['seedtreat', /inoculant|rhizobium|seed dressing|dressed seed|treat (the )?seed/i],
  ['net', /\bnet\b|netting|insect-proof/i],
  ['remove', /\brogue|uproot|pull out|destroy|\bburn\b|remove (the )?(infected|sick|diseased|wilt\w*)|remove wilt\w* plants/i],
  ['dry', /^dry\b|\bdry (the )?(grain|threshed|cobs|beans|to)\b|tarpaulin|sun-dry/i],
  ['harvest', /^harvest\b|^cut the haulms|haulm|\bpick every/i],
  ['spray', /\bspray|fungicide|insecticide|herbicide|blight protection|blight product|chemical group|protect (the flag leaf|against blight)/i],
  ['scout', /^scout|^watch for|^use pheromone|^check (cobs|leaves|for)|\bscout\b|monitor/i],
  ['weed', /\bweed/i],
  ['prepare', /plough|harrow|\btill|land prep|soil (sample|test)|\blime\b|\bdig\b/i],
  ['topdress', /top-?dress|fertili[sz]|\burea\b|manure|compost|phosphorus|nitrogen/i],
  ['topdress', /\b(CAN|DAP|NPK|TSP|MOP)\b/],
  ['earthup', /earth(ing)? up|hilling|hill up|ridge up/i],
  ['transplant', /transplant|nursery|seedbed|raised bed|trays?\b|hardening/i],
  ['stake', /\bstake|trellis|prun|tie (the )?plants?|desucker|suckers|side shoots/i],
  ['water', /irrigat|\bwater/i],
  ['store', /hermetic|\bstore|storage|\bsacks?\b|\bbags?\b|crates?|\bpack\b/i],
  ['harvest', /harvest|\bpick\b|maturity|\bmature\b/i],
  ['scout', /inspect|check|look (at|for|under)|variety|tolerant/i],
];

/** The scene for one advisory, calendar or treatment step. 'grow' when nothing matches. */
export function sceneFor(text: string): SceneKind {
  for (const [kind, re] of RULES) if (re.test(text)) return kind;
  return 'grow';
}

/** Crops the scenes can draw; anything else uses a generic leafy plant. */
export type SceneCrop = 'maize' | 'beans' | 'tomato' | 'potato' | 'wheat' | 'coffee' | 'leafy';

export function sceneCrop(crop: string | undefined | null): SceneCrop {
  const c = (crop ?? '').toLowerCase();
  if (/maize|corn/.test(c)) return 'maize';
  if (/bean/.test(c)) return 'beans';
  if (/tomato/.test(c)) return 'tomato';
  if (/potato/.test(c)) return 'potato';
  if (/wheat/.test(c)) return 'wheat';
  if (/coffee/.test(c)) return 'coffee';
  return 'leafy';
}

/** "Do not weed during flowering", "Stop irrigation…": the scene shows what NOT to do. */
export function isDont(text: string): boolean {
  return /^(do not|don't|never|stop|avoid)\b/i.test(text.trim());
}

/** The Noto animated emoji (components/NotoEmoji.tsx) that labels a step of this kind. */
export function sceneEmoji(kind: SceneKind, crop?: string | null): string {
  const c = sceneCrop(crop);
  const produce = c === 'maize' ? 'corn' : c === 'tomato' ? 'tomato' : c === 'potato' ? 'potato' : c === 'beans' ? 'beans' : 'greens';
  const map: Record<SceneKind, string> = {
    weed: 'herb', topdress: 'plant', spray: 'droplet', water: 'droplet', harvest: produce, dry: 'sun', store: 'check',
    scout: 'eyes', remove: 'warning', stake: 'plant', prepare: 'tractor', earthup: 'plant', transplant: 'plant',
    net: 'bug', seedtreat: 'microbe', sort: 'eyes', mix: 'droplet', grow: 'plant',
  };
  return map[kind];
}

/** The plain line icon (MaterialCommunityIcons) for a step of this kind. Since 12 Nov the screens
 * use these, not the emoji: the app is a work tool (lib/motion.ts). */
export function sceneIcon(kind: SceneKind) {
  const map = {
    weed: 'grass', topdress: 'sprout-outline', spray: 'spray', water: 'water-outline', harvest: 'basket-outline',
    dry: 'white-balance-sunny', store: 'warehouse', scout: 'magnify', remove: 'delete-outline', stake: 'sprout-outline',
    prepare: 'tractor', earthup: 'sprout-outline', transplant: 'sprout-outline', net: 'bug-outline', seedtreat: 'seed-outline',
    sort: 'sort-variant', mix: 'cup-water', grow: 'sprout-outline',
  } as const satisfies Record<SceneKind, string>;
  return map[kind];
}

/** Watch-out cards: one line icon per kind of threat named (see threatEmojis). */
export function threatIcons(threat: string) {
  const map = { bug: 'bug-outline', ant: 'bug-outline', fungus: 'mushroom-outline', microbe: 'virus-outline', warning: 'alert-outline' } as const;
  return Array.from(new Set(threatEmojis(threat).map((e) => map[e])));
}

/** Watch-out cards: one emoji per kind of threat named (insect, fungus, germ), at most two. */
export function threatEmojis(threat: string): ('bug' | 'ant' | 'fungus' | 'microbe' | 'warning')[] {
  const out: ('bug' | 'ant' | 'fungus' | 'microbe' | 'warning')[] = [];
  for (const part of threat.toLowerCase().split(/&|,| and /)) {
    const p = part.trim();
    const e = /mite|aphid|thrip|whitefl/.test(p) ? 'ant'
      : /worm|fly|flies|bruchid|moth|tuta|weevil|borer|beetle|caterpillar|locust|bug/.test(p) ? 'bug'
      : /wilt|virus|viral|necrosis|bacteri|streak|mosaic|greening/.test(p) ? 'microbe'
      : /blight|rust|rot|mildew|spot|scab|damping|blotch|mould|mold|anthracnose|smut|aflatoxin/.test(p) ? 'fungus'
      : null;
    if (e && !out.includes(e)) out.push(e);
  }
  return out.length ? out.slice(0, 2) : ['warning'];
}
