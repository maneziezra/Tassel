// Collects candidate UI strings for the Kiswahili dictionary (lib/sw.ts).
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const dirs = ['app', 'components', 'lib'];
const skip = new Set(['sw.ts', 'diseases.sw.ts', 'advisory.sw.ts', 'diseases.ts', 'encyclopedia.ts', 'advisory.ts']);
const files = [];
function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (/\.(tsx?|jsx?)$/.test(f) && !skip.has(f)) files.push(p);
  }
}
dirs.forEach((d) => walk(path.join(root, d)));
const out = new Map();
const add = (s, file) => {
  s = s.replace(/\\'/g, "'").replace(/\\"/g, '"');
  if (!/[A-Za-z]/.test(s)) return;
  if (/^[a-z0-9_\-./:@#]+$/.test(s) && !s.includes(' ')) return; // identifiers, routes
  const k = s;
  if (!out.has(k)) out.set(k, new Set());
  out.get(k).add(path.relative(root, file).replace(/\\/g, '/'));
};
const str = `'((?:[^'\\\\\\n]|\\\\.)*)'|"((?:[^"\\\\\\n]|\\\\.)*)"|\`([^\`$]*)\``;
const callRe = new RegExp(`\\b(?:t|tr)\\(\\s*(?:${str})`, 'g');
const propRe = new RegExp(`\\b(?:label|title|text|placeholder|hint|message|body|subtitle|sub|note|action|cta|empty|heading)\\s*[=:]\\s*\\{?\\s*(?:${str})`, 'g');
const jsxRe = />\s*([^<>{}\n]*[A-Za-z][^<>{}\n]*?)\s*</g;
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  let m;
  while ((m = callRe.exec(src))) add(m[1] ?? m[2] ?? m[3], f);
  if (f.endsWith('.tsx')) {
    while ((m = propRe.exec(src))) add(m[1] ?? m[2] ?? m[3], f);
    while ((m = jsxRe.exec(src))) {
      const s = m[1].trim();
      if (s && !/=>|&&|;|\s=\s|\)\s*\{|^\)|\($/.test(s)) add(s, f);
    }
  }
}
const list = [...out.keys()].sort((a, b) => a.localeCompare(b));
fs.writeFileSync(path.join(__dirname, 'strings.txt'), list.join('\n'));
console.log('files', files.length, 'strings', list.length);
