// node --experimental-strip-types scripts/test-pcpb.mjs
// Behaviour tests for the PCPB catalogue (lib/pcpbCore.ts + lib/pcpbData.generated.json).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { cropKey, problemKey, productsFor, planMix, fmtDose, labelUse } from '../lib/pcpbCore.ts';

const root = path.resolve(import.meta.dirname, '..');
const cat = JSON.parse(fs.readFileSync(path.join(root, 'lib/pcpbData.generated.json'), 'utf8'));
const byName = (n) => cat.products.find((p) => p.d.toLowerCase().startsWith(n.toLowerCase()));

let passed = 0;
const test = (name, fn) => {
  fn();
  passed++;
  console.log('PASS', name);
};

test('catalogue comes from the register snapshot with a date', () => {
  assert.match(cat.source, /pcpb\.go\.ke/);
  assert.equal(cat.fetched, '2026-10-26');
  assert.ok(cat.products.length > 1000);
});

test('a problem is paired only with the crop the register names it for (word order)', () => {
  // "early and late blight on Tomatoes and for control of Coffee Berry Disease in Coffee"
  const dorado = byName('Dorado');
  assert.ok(dorado.p.includes('tomato:late_blight') && dorado.p.includes('coffee:cbd'));
  assert.ok(!dorado.p.includes('tomato:cbd'), 'tomato:cbd came from pairing every crop with every problem');
  for (const k of ['tomato:cbd', 'tomato:blast', 'tomato:faw', 'tomato:stalk_borer', 'maize:tuta']) {
    assert.deepEqual(cat.products.filter((p) => p.p.includes(k)).map((p) => p.d), [], k);
  }
  // lists keep every crop: "blight in Tomatoes and potatoes"
  assert.ok(byName('Downmid').p.includes('potato:late_blight'));
  // the crop inside a problem name, and a crop adjective, still count
  assert.ok(byName('Quadris').p.includes('coffee:cbd'));
  assert.ok(byName('Deraphon').p.includes('maize:stalk_borer'));
  // "(maize weevil, ...) in Maize & Wheat": the whole list
  assert.ok(byName('Wivoguard').p.includes('wheat:weevils'));
  // "... in tomatoes and downy mildew in roses": the mildew is on roses
  assert.ok(!byName('Agrilax').p.includes('tomato:downy_mildew'));
  // "broad-leaved weeds in maize (NOT FOR USE IN COFFEE)"
  assert.deepEqual(byName('Shikwekwe').p, ['maize:broadleaf_weeds']);
  // a long list still reaches its last crop
  assert.ok(byName('Sulcop').p.includes('tomato:rust'));
});

test('no June 2025 withdrawn or restricted active is in the catalogue', () => {
  for (const p of cat.products) {
    for (const a of cat.restrictedActives) assert.ok(!p.a.toLowerCase().includes(a), `${p.n} contains ${a}`);
  }
});

test('no product the register marks "not for open field"', () => {
  for (const p of cat.products) assert.ok(!/not\s+for\s+(use\s+)?(in|on)?\s*open\s+field/i.test(p.u), p.n);
});

test('every product has a registration number and a label link', () => {
  for (const p of cat.products) {
    assert.match(p.r, /PCPB/i, p.n);
    assert.ok(p.l, `${p.n} has no label`);
  }
});

test('every label rate carries a quote', () => {
  for (const p of cat.products.filter((x) => x.lab)) {
    for (const u of p.lab.uses) assert.ok(u.quote.length > 20, `${p.d} ${u.crop}`);
  }
});

test('crop and problem parsing from model labels', () => {
  assert.equal(cropKey('Corn___Common_rust'), 'maize');
  assert.equal(cropKey('Tomato___Late_blight'), 'tomato');
  assert.equal(cropKey('Bean___angular_leaf_spot'), 'beans');
  assert.equal(problemKey('Tomato___Late_blight'), 'late_blight');
  assert.equal(problemKey('Corn___Common_rust'), 'rust');
  assert.equal(problemKey('Corn___Cercospora_leaf_spot Gray_leaf_spot'), 'leaf_spot');
  assert.equal(problemKey('Fall armyworm'), 'faw');
  assert.equal(problemKey('Tomato___healthy'), null);
  assert.equal(problemKey('Tomato___Tomato_mosaic_virus'), null, 'no spray suggested for a virus');
});

test('products match crop AND problem from the same register clause', () => {
  const wheatRust = productsFor(cat, { crop: 'wheat', problem: 'rust' });
  assert.ok(wheatRust.length > 0);
  for (const p of wheatRust) assert.ok(p.p.includes('wheat:rust'), p.n);
  // Ortiva Top is registered for maize and bean rust, not wheat.
  assert.ok(!wheatRust.some((p) => p.d.startsWith('Ortiva Top')));
});

test('label-verified products rank first', () => {
  const maizeFaw = productsFor(cat, { crop: 'maize', problem: 'faw', limit: 3 });
  assert.ok(maizeFaw.every((p) => labelUse(p, 'maize', 'faw')), maizeFaw.map((p) => p.d).join(', '));
});

test('Roundup Turbo is not offered for maize (registered for non-crop, tea and coffee only)', () => {
  const rt = byName('Round Up Turbo');
  assert.ok(rt);
  assert.ok(!rt.c.includes('maize'));
});

test('Ridomil Gold: 50 g per 20 L on potato late blight, scaled to a 16 L tank', () => {
  const p = byName('Ridomil Gold');
  const m = planMix(p, 'potato', 'late_blight', 16, 1);
  assert.equal(fmtDose(m.perTank), '40 g');
  assert.equal(m.tanks, Math.ceil(500 / 16)); // label: 500 L/ha
  assert.equal(fmtDose(m.total), '1.25 kg'); // 50 g/20 L x 500 L/ha, not 40 g x 32 rounded-up tanks
});

test('Belt on maize FAW keeps the label range (never averaged)', () => {
  const p = byName('Belt 480');
  const m = planMix(p, 'maize', 'faw', 20, 0.5);
  assert.equal(fmtDose(m.perTank), '7.5–10 mL');
  assert.equal(fmtDose(m.total), '75–100 mL'); // 150–200 mL/ha x 0.5 ha
  assert.equal(m.tanks, 10); // 400 L/ha x 0.5 ha / 20 L
});

test('no rate for a crop the label does not cover (Coragen on maize)', () => {
  const p = byName('Coragen');
  const m = planMix(p, 'maize', 'faw', 20, 1);
  assert.equal(m.perTank, null);
  assert.equal(m.total, null);
});

test('unverified labels never produce a number', () => {
  for (const name of ['Lumax', 'Stomp 455', 'Round Up Turbo']) {
    const p = byName(name);
    assert.ok(p, name);
    assert.ok(!p.lab, `${name} must have no label rates`);
    assert.equal(planMix(p, p.c[0], null, 20, 1).perTank, null);
  }
});

test('PHI shown is never shorter than the register value (Score on French beans: 14 days)', () => {
  const p = byName('Score 250');
  assert.equal(labelUse(p, 'beans', 'leaf_spot').phiDays, 14);
});

test('fmtDose formats ranges and units', () => {
  assert.equal(fmtDose({ min: 1500, max: 3000, unit: 'mL' }), '1.5–3 L');
  assert.equal(fmtDose({ min: 7, max: 7, unit: 'g' }), '7 g');
  assert.equal(fmtDose(null), null);
});

console.log(`\n${passed} PCPB tests passed`);
