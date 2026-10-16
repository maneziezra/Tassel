// Mche writing rule: no middle-dot meta strings. Rewrites " · " separators in UI code and in lib/sw.ts
// (keys and values together, so English keys and the Kiswahili dictionary stay in sync).
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const D = ' · ';

// Translation keys that read better with a specific rewrite. [oldKey, newKey, newSw]
const KEYS = [
  ['Language' + D + 'Lugha', 'Language / Lugha', 'Lugha / Language'],
  ['Week {n}' + D + '{stage}', 'Week {n}: {stage}', 'Wiki {n}: {stage}'],
  ['Ask' + D + 'Share' + D + 'Learn with Kenyan farmers', 'Ask, share and learn with Kenyan farmers', 'Uliza, shiriki na ujifunze na wakulima wa Kenya'],
  ['Reference prices' + D + 'farmer prices' + D + 'agro-dealers', 'Reference prices, farmer prices and agro-dealers', 'Bei za marejeleo, bei za wakulima na maduka ya pembejeo'],
  ['{a} acres' + D + '{h} ha', '{a} acres ({h} ha)', 'ekari {a} (hekta {h})'],
  ['Tap a field to zoom to it' + D + 'long-press to open it', 'Tap a field to zoom to it. Long-press to open it.', 'Gusa shamba kulikuza. Bonyeza kwa muda kulifungua.'],
];

// Code-level separators that read better as a colon than a comma.
const CODE = [
  ["`${t('Weather')}" + D + '${', "`${t('Weather')}: ${"],
  ['`${item.farmName}' + D + '`', '`${item.farmName}: `'],
  ['{x.farmName}' + D + '{', '{x.farmName}: {'],
];

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(tsx|ts)$/.test(e.name)) out.push(p);
  }
  return out;
}

let changed = 0;
const files = [...walk(path.join(root, 'app'), []), ...walk(path.join(root, 'components'), [])];
for (const f of files) {
  let s = fs.readFileSync(f, 'utf8');
  const before = s;
  for (const [a, b] of CODE) s = s.split(a).join(b);
  for (const [a, b] of KEYS) s = s.split(a).join(b);
  s = s.split(D).join(', ');
  if (s !== before) { fs.writeFileSync(f, s, 'utf8'); changed++; console.log('fixed', path.relative(root, f)); }
}

const swPath = path.join(root, 'lib', 'sw.ts');
let sw = fs.readFileSync(swPath, 'utf8');
for (const [a, b, v] of KEYS) {
  const re = new RegExp("'" + a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "':\\s*'[^']*'");
  if (!re.test(sw)) { console.log('MISSING sw key', a); continue; }
  sw = sw.replace(re, "'" + b + "': '" + v + "'");
}
sw = sw.split(D).join(', ');
fs.writeFileSync(swPath, sw, 'utf8');
console.log('files changed:', changed, '| middle dots left in sw.ts:', (sw.match(/·/g) || []).length);
