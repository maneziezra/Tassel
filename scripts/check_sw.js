// Checks lib/sw.ts against the strings used in the code.
//   node scripts/check_sw.js   -> prints duplicate keys, orphan keys, missing keys
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'lib', 'sw.ts'), 'utf8');
const body = src.slice(src.indexOf('= {') + 2, src.lastIndexOf('}') + 1);
// duplicate keys
const keyRe = /^\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"|([A-Za-z_][\w]*))\s*:/gm;
const seen = new Map();
let m;
while ((m = keyRe.exec(body))) {
  const k = (m[1] ?? m[2] ?? m[3]).replace(/\\'/g, "'");
  seen.set(k, (seen.get(k) || 0) + 1);
}
const SW = eval('(' + body + ')');
const dups = [...seen].filter(([, n]) => n > 1).map(([k]) => k);
// all source text
let all = '';
function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (/\.(tsx?)$/.test(f) && f !== 'sw.ts') all += fs.readFileSync(p, 'utf8') + '\n';
  }
}
['app', 'components', 'lib'].forEach((d) => walk(path.join(root, d)));
const dbValues = ['Irish potatoes', 'Maize (dry, white)', 'Wheat (dry)', 'National average', 'High late blight risk', 'Medium late blight risk', 'Low late blight risk', 'farmers'];
const orphans = Object.keys(SW).filter((k) => !all.includes(k) && !dbValues.includes(k));
// placeholders must match
const badVars = Object.entries(SW).filter(([k, v]) => {
  const a = (k.match(/\{\w+\}/g) || []).sort().join();
  const b = (v.match(/\{\w+\}/g) || []).sort().join();
  return a !== b;
}).map(([k]) => k);
// missing
const cand = new Set();
for (const f of ['strings.txt', 'strings2.txt']) {
  const p = path.join(__dirname, f);
  if (!fs.existsSync(p)) continue;
  fs.readFileSync(p, 'utf8').split('\n').forEach((l) => cand.add(l.split('\t')[0]));
}
// L('...') strings in buildPlan
const plan = all.match(/\bL\(\s*'((?:[^'\\\n]|\\.)*)'/g) || [];
plan.forEach((s) => cand.add(s.replace(/^L\(\s*'/, '').replace(/'$/, '').replace(/\\'/g, "'")));
const ignore = /^(CropGuard AI|EN|SW|Kiswahili|Nairobi|NCPB|Mkulima Young|PGRST\d+|\(tabs\)|.*\[id\].*|LIVE)$|^[a-z_]+=|^&|^\$\{|^:|window\.|width=|^id, |^\{crop\}: \{disease\}\?$|___|_\(|^\\n|^1\.2 acres|^Hello |^Habari |^Cherry|^Corn|^Pepper,|Imagery ©|^© Open|^Spider|^Late blight$|^Common rust$|^Grey leaf|^Haunglongbing|^Citrus|^Cercospora|^size unknown|^Tomato___|^\d\. |^1\. |accuracy|^']/i;
const missing = [...cand].filter((s) => s && SW[s] === undefined && SW[s.trim()] === undefined && !ignore.test(s));
console.log('keys', Object.keys(SW).length);
console.log('DUPLICATES', JSON.stringify(dups));
console.log('PLACEHOLDER MISMATCH', JSON.stringify(badVars));
console.log('ORPHANS (key not found in code)', JSON.stringify(orphans, null, 1));
console.log('MISSING (in code, no translation)', JSON.stringify(missing, null, 1));
