// Mche: no labels set in capitals. Rewrites the remaining ALL-CAPS labels to sentence case.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const map = { 'PERSONAL INFO': 'Personal info', 'YOUR COUNTY': 'Your county', ACCOUNT: 'Account', MANAGEMENT: 'Management', SYMPTOMS: 'Symptoms' };
const files = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (f.endsWith('.tsx')) files.push(p);
  }
})(path.join(root, 'app'));
for (const f of files) {
  let s = fs.readFileSync(f, 'utf8');
  let n = 0;
  for (const [a, b] of Object.entries(map)) {
    const re = new RegExp(`>(\\s*)${a}(\\s*)<`, 'g');
    s = s.replace(re, (m, p1, p2) => (n++, `>${p1}${b}${p2}<`));
  }
  if (f.endsWith(path.join('(tabs)', 'scan.tsx'))) {
    const before = s;
    s = s.replace(/borderColor: C\.secondary/g, 'borderColor: C.accent');
    if (s !== before) n++;
  }
  if (n) {
    fs.writeFileSync(f, s);
    console.log(path.relative(root, f), n);
  }
}
