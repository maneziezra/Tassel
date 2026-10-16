// Second pass: every remaining string literal that looks like user-facing text.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const have = new Set(fs.readFileSync(path.join(__dirname, 'strings.txt'), 'utf8').split('\n'));
const files = [];
function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (/\.tsx$/.test(f)) files.push(p);
  }
}
walk(path.join(root, 'app'));
walk(path.join(root, 'components'));
['data', 'weather', 'notify', 'speech', 'classifier', 'i18n', 'supabase', 'diseases'].forEach((n) => {
  const p = path.join(root, 'lib', n + '.ts');
  if (fs.existsSync(p)) files.push(p);
});
const out = new Map();
const re = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"/g;
for (const f of files) {
  let src = fs.readFileSync(f, 'utf8');
  const rel = path.relative(root, f).replace(/\\/g, '/');
  if (rel === 'lib/diseases.ts') {
    const i = src.indexOf('export function buildPlan');
    src = i >= 0 ? src.slice(i) : '';
  }
  let m;
  while ((m = re.exec(src))) {
    let s = (m[1] ?? m[2]).replace(/\\'/g, "'");
    if (have.has(s) || !/[A-Za-z]{2}/.test(s)) continue;
    if (/^(#|\.|@|\/|https?:|rgba?\(|sw-|en-)/.test(s)) continue;
    if (/^[a-z0-9_\-./:]+$/.test(s)) continue; // identifiers
    if (/^[a-z]+[A-Z][A-Za-z]*$/.test(s)) continue; // camelCase
    if (/^(use client|react|expo|Ionicons|MaterialCommunityIcons)$/.test(s)) continue;
    if (!out.has(s)) out.set(s, new Set());
    out.get(s).add(rel);
  }
}
const lines = [...out.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([s, fs]) => `${s}\t[${[...fs].join(',')}]`);
fs.writeFileSync(path.join(__dirname, 'strings2.txt'), lines.join('\n'));
console.log('extra', lines.length);
