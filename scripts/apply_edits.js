// node scripts/apply_edits.js edits.json
// edits.json: [{ "file": "app/x.tsx", "edits": [{ "old": "...", "new": "..." }] }]
// Each "old" must occur exactly once. Nothing is written if any edit fails.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const spec = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const out = [];
let ok = true;
for (const { file, edits } of spec) {
  const p = path.join(root, file);
  let src = fs.readFileSync(p, 'utf8');
  const crlf = src.includes('\r\n');
  if (crlf) src = src.replace(/\r\n/g, '\n');
  edits.forEach((e, i) => {
    const n = src.split(e.old).length - 1;
    if (n !== 1) {
      ok = false;
      console.log(`FAIL ${file} #${i}: found ${n} times: ${e.old.slice(0, 80)}`);
    } else src = src.replace(e.old, () => e.new);
  });
  out.push([p, crlf ? src.replace(/\n/g, '\r\n') : src]);
}
if (ok) {
  out.forEach(([p, s]) => fs.writeFileSync(p, s));
  console.log('OK', out.length, 'files');
} else process.exit(1);
