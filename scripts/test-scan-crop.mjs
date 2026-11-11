// Behaviour tests for lib/scanCrop.ts ("Which crop is this leaf from?"). Run via `npm test`.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ANY_CROP, CROP_MASS_MIN, cropIndices, cropKey, cropOptions, judge, scannerKnows } from '../lib/scanCrop.ts';

let n = 0;
const ok = (name, fn) => {
  fn();
  n++;
  console.log('PASS ' + name);
};

const raw = JSON.parse(readFileSync(new URL('../assets/model/class_labels.json', import.meta.url), 'utf8'));
const LABELS = Object.keys(raw).sort((a, b) => a - b).map((k) => raw[k]);
const at = (label) => {
  const i = LABELS.indexOf(label);
  assert.ok(i >= 0, `no class ${label}`);
  return i;
};
/** A model output: the given classes get the given probabilities, the rest share what is left. */
const probs = (given) => {
  const p = new Array(LABELS.length).fill(0);
  let used = 0;
  for (const [label, v] of Object.entries(given)) {
    p[at(label)] = v;
    used += v;
  }
  const rest = (1 - used) / (LABELS.length - Object.keys(given).length);
  return p.map((v) => (v === 0 ? rest : v));
};
const name = (j, k = 0) => LABELS[j.top[k].index];

ok('the bundled model has not learned kale or avocado, and has learned the Kenyan staples', () => {
  for (const c of ['Kale', 'Sukuma wiki', 'Avocado', 'Passion fruit']) assert.equal(scannerKnows(LABELS, c), false, c);
  for (const c of ['Maize', 'Beans', 'Tomato', 'Potato', 'Cabbage', 'Capsicum', 'Coffee', 'Tea', 'Citrus', 'Cassava']) assert.equal(scannerKnows(LABELS, c), true, c);
});

ok('crop names: the farmer\'s words reach the model\'s classes', () => {
  assert.equal(cropKey(' Sukuma Wiki '), 'kale');
  assert.equal(cropKey('Capsicum'), 'pepper (capsicum)');
  assert.ok(cropIndices(LABELS, 'Maize').every((i) => LABELS[i].startsWith('Corn_(maize)___')));
  assert.equal(cropIndices(LABELS, 'Maize').length, 7);
  // Orange (one class) is Citrus
  assert.equal(cropIndices(LABELS, 'Citrus').length, cropIndices(LABELS, 'Orange').length);
  assert.ok(cropIndices(LABELS, 'Citrus').some((i) => LABELS[i].startsWith('Orange___')));
});

ok('rule 1: a crop the model never learned is not guessed (the 11 Nov kale scan)', () => {
  // what the TECNO showed: eggplant 50%, eggplant healthy 43%
  const p = probs({ Eggplant___Little_leaf: 0.5, Eggplant___healthy: 0.43 });
  assert.equal(judge(p, LABELS, 'Kale').kind, 'unknown-crop');
  // with no crop said, the old behaviour: eggplant comes out on top
  assert.equal(name(judge(p, LABELS, ANY_CROP)), 'Eggplant___Little_leaf');
});

ok('rule 2: with the crop known, another crop\'s look-alike cannot win', () => {
  const p = probs({ Potato___Early_blight: 0.45, Tomato___Early_blight: 0.4, Tomato___Late_blight: 0.05 });
  assert.equal(name(judge(p, LABELS, null)), 'Potato___Early_blight');
  const j = judge(p, LABELS, 'Tomato');
  assert.equal(j.kind, 'crop');
  assert.equal(name(j), 'Tomato___Early_blight');
  assert.ok(j.top.every((x) => LABELS[x.index].startsWith('Tomato___')));
  // confidence is the share within the crop: 0.40 of about 0.45
  assert.ok(Math.abs(j.top[0].confidence - 0.4 / j.mass) < 1e-9 && j.top[0].confidence > 0.85);
  const sum = cropIndices(LABELS, 'Tomato').reduce((s, i) => s + p[i] / j.mass, 0);
  assert.ok(Math.abs(sum - 1) < 1e-9);
});

ok('rule 3: a stray 2% is never turned into a confident name', () => {
  // the far kale shot, if the farmer had said "Cabbage": almost no belief on cabbage
  const p = probs({ Eggplant___Little_leaf: 0.5, Eggplant___healthy: 0.43, Cabbage___Downy_mildew: 0.02 });
  const j = judge(p, LABELS, 'Cabbage');
  assert.equal(j.kind, 'offcrop');
  assert.ok(j.mass < CROP_MASS_MIN);
  assert.equal(name(j), 'Cabbage___Downy_mildew');
  assert.ok(j.top[0].confidence < 0.75 && Math.abs(j.top[0].confidence - 0.02) < 1e-9); // raw, so the app says "Not sure"
});

ok('rule 4: "I don\'t know the crop" keeps every class in play', () => {
  const p = probs({ Tomato___Late_blight: 0.9 });
  for (const c of [null, undefined, '', ANY_CROP]) {
    const j = judge(p, LABELS, c);
    assert.equal(j.kind, 'any');
    assert.equal(name(j), 'Tomato___Late_blight');
    assert.equal(j.top[0].confidence, 0.9);
  }
});

ok('the crop list: the farmer\'s own crops first, no repeats, each marked offline or online', () => {
  const list = cropOptions(LABELS, ['Kale', 'maize', null, 'Kale'], ['Maize', 'Tomato', 'Kale', 'Avocado']);
  assert.deepEqual(list.map((x) => x.crop), ['Kale', 'maize', 'Tomato', 'Avocado']);
  assert.deepEqual(list.map((x) => x.offline), [false, true, true, false]);
});

ok('the scan screen never runs the offline model on a crop it has not learned', () => {
  const scan = readFileSync(new URL('../app/(tabs)/scan.tsx', import.meta.url), 'utf8');
  assert.match(scan, /scannerKnows\(/);
  assert.match(scan, /pathname: '\/photo-check'/);
});

console.log(`\n${n} scan crop tests passed`);
