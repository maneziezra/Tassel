// node scripts/test-rules.mjs
// Guards for the rules that do not bend (docs/HANDOFF.md section 1) across the app code.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const files = [];
const walk = (d) => {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(f)) files.push(p);
  }
};
['app', 'components', 'lib'].forEach((d) => walk(path.join(root, d)));
const read = (p) => fs.readFileSync(p, 'utf8');

let passed = 0;
const test = (name, fn) => {
  fn();
  passed++;
  console.log('PASS', name);
};

test('rule 1: none of the fabricated study figures appear in the app', () => {
  const banned = [/86\s?%\s?vs\.?\s?40\s?%/i, /\b43\s?\/\s?50\b/, /\b4\.4\s?\/\s?5\b/, /\b4\.8\s?\/\s?5\b/, /100\s?% of 50/i, /\b5\.1\s?\/\s?6\b/, /\b97\.4\s?%/, /\b94\.7\s?%/];
  for (const f of files) for (const re of banned) assert.ok(!re.test(read(f)), `${path.relative(root, f)} matches ${re}`);
});

test('offline scan: the model loads through a file:// URL, not useTensorflowModel(require) (fails in the release APK)', () => {
  for (const f of files) {
    if (f.endsWith('useDiseaseModel.ts')) continue;
    assert.doesNotMatch(read(f), /useTensorflowModel\s*\(/, `${path.relative(root, f)} calls useTensorflowModel; use lib/useDiseaseModel`);
  }
  const hook = read(path.join(root, 'lib/useDiseaseModel.ts'));
  assert.match(hook, /Asset\.fromModule\(MODEL\)/);
  assert.match(hook, /loadTensorflowModel\(\{ url \}/);
});

test('rule 1: the KSEF report claims no fabricated or unmeasured result', () => {
  const report = read(path.join(root, 'docs/KSEF_2026_TASSEL_PROJECT_REPORT.md'));
  const banned = [/86\s?%\s?vs\.?\s?40\s?%/i, /\b43\s?\/\s?50\b/, /\b4\.4\s?\/\s?5\b/, /\b4\.8\s?\/\s?5\b/, /100\s?% of 50/i, /\b5\.1\s?\/\s?6\b/, /\b97\.4\s?%/, /\b94\.7\s?%/,
    /sub-100 millisecond/i, /500 consecutive inference/i, /world's first/i, /peer-reviewed operational protocol/i, /eliminates farmer dos/i];
  for (const re of banned) assert.ok(!re.test(report), `report matches ${re}`);
  assert.match(report, /Field accuracy[^.|]*not (been )?measured/i, 'the report says field accuracy is not measured');
});

test('rule 1: every model count written in the app matches assets/model/class_labels.json', () => {
  const labels = JSON.parse(read(path.join(root, 'assets/model/class_labels.json')));
  const list = Array.isArray(labels) ? labels : Object.values(labels);
  const total = list.length;
  const healthy = list.filter((l) => /healthy/i.test(l)).length;
  const crops = new Set(list.map((l) => String(l).split('___')[0].replace(/^Orange$/, 'Citrus'))).size;
  const claims = [
    [/(?<!\()(\d+) (?:leaf )?classes/g, total],
    [/(\d+) leaf conditions/g, total],
    [/(\d+) diseases and pests/g, total - healthy],
    [/(\d+) healthy classes/g, healthy],
    [/on (\d+) crops/g, crops],
  ];
  for (const f of files) {
    if (f.endsWith('sw.ts')) continue;
    // user-facing text only: drop comment lines
    const src = read(f).split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
    for (const [re, want] of claims) for (const m of src.matchAll(re)) assert.equal(Number(m[1]), want, `${path.relative(root, f)}: "${m[0]}" should be ${want}`);
  }
});

test('rule 5: AI limits are not stated as numbers the server does not enforce', () => {
  const meth = read(path.join(root, 'app/methodology.tsx'));
  assert.ok(!/\d+ questions per hour|\d+-per-hour/.test(meth));
});

test('rule 2: PCPB products only come from the generated register catalogue', () => {
  const pcpb = read(path.join(root, 'lib/pcpb.ts'));
  assert.ok(pcpb.includes("from './pcpbData.generated.json'"));
  assert.ok(!/labelRate20L|ratePerAcre/.test(files.map(read).join('\n')), 'hand-typed label rates are back');
});

test('rule 3: below 75% the result screen offers no product examples', () => {
  const result = read(path.join(root, 'app/result.tsx'));
  assert.match(result, /uncertain \? \[\] : getRegisteredProducts/);
  assert.match(result, /uncertain \? t\('Not sure'\) : disease/, 'the title never names a disease below the threshold');
  const classifier = read(path.join(root, 'lib/classifier.ts'));
  assert.match(classifier, /CONFIDENCE_THRESHOLD\s*=\s*0\.75/);
});

test('rule 3: community posts name a scanned disease only when sure (75%+)', () => {
  assert.match(read(path.join(root, 'lib/theme.ts')), /isSure = \(c[^)]*\)[^=]*=> c != null && c >= 0\.75/);
  assert.match(read(path.join(root, 'app/(tabs)/community.tsx')), /isSure\(item\.scan_confidence\) \? scan\.disease : t\('Not sure'\)/);
  assert.match(read(path.join(root, 'app/post/[id].tsx')), /isSure\(post\.scan_confidence\)/);
  const np = read(path.join(root, 'app/new-post.tsx'));
  assert.match(np, /const sure = isSure\(/);
  assert.doesNotMatch(np, /agronomist/i, 'no agronomist reviews posts');
});

test('decision 26 Oct: no system emoji in app code (Noto Animated Emoji only)', () => {
  const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2B50}\u{2705}]/u;
  for (const f of files) assert.ok(!emoji.test(read(f)), `${path.relative(root, f)} contains a system emoji`);
});

console.log(`\n${passed} rule guards passed`);
