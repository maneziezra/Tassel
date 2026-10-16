// Brand check: every colour literal and font setting used outside lib/theme.ts.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const theme = fs.readFileSync(path.join(root, 'lib', 'theme.ts'), 'utf8');
const brand = new Set((theme.match(/#[0-9A-Fa-f]{6}\b/g) || []).map((h) => h.toUpperCase()));
const files = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (/\.tsx?$/.test(f) && f !== 'theme.ts') files.push(p);
  }
})(path.join(root, 'app'));
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (/\.tsx?$/.test(f)) files.push(p);
  }
})(path.join(root, 'components'));
['advisory.ts', 'encyclopedia.ts'].forEach((f) => files.push(path.join(root, 'lib', f)));
const off = {};
const fonts = {};
let total = 0;
const sizes = {};
const weights = {};
for (const f of files) {
  const rel = path.relative(root, f).replace(/\\/g, '/');
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(/#[0-9A-Fa-f]{3,8}\b/g)) {
    let h = m[0].toUpperCase();
    if (h.length === 4) h = '#' + h.slice(1).split('').map((c) => c + c).join('');
    if (h.length === 9) h = h.slice(0, 7);
    total++;
    if (!brand.has(h) && !['#FFFFFF', '#000000'].includes(h)) (off[h] = off[h] || new Set()).add(rel);
  }
  for (const m of src.matchAll(/fontFamily:\s*['"]([^'"]+)/g)) (fonts[m[1]] = fonts[m[1]] || new Set()).add(rel);
  for (const m of src.matchAll(/fontSize:\s*(\d+)/g)) sizes[m[1]] = (sizes[m[1]] || 0) + 1;
  for (const m of src.matchAll(/fontWeight:\s*'(\d+|bold)'/g)) weights[m[1]] = (weights[m[1]] || 0) + 1;
}
console.log('files', files.length, 'colour literals', total, 'brand tokens', brand.size);
console.log('OFF-PALETTE:');
Object.entries(off).sort((a, b) => b[1].size - a[1].size).forEach(([h, fs]) => console.log(' ', h, [...fs].join(', ')));
console.log('FONTS:', JSON.stringify(Object.fromEntries(Object.entries(fonts).map(([k, v]) => [k, [...v]]))));
console.log('FONT SIZES:', JSON.stringify(Object.entries(sizes).sort((a, b) => a[0] - b[0])));
console.log('FONT WEIGHTS:', JSON.stringify(weights));
