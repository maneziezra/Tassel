// Tests for the guides written for the v8 models (lib/diseases.v8.ts, scripts/kb/kb_e_v8.py).
// Run via `npm test`. A model may be published over the air only when every class it can
// name has a guide, and the library must not claim the built-in model detects these classes.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { labelList, uncoveredLabels } from '../lib/modelUpdateCore.ts';
import { buildPlan, getDisease, getDiseaseL, scannerCanName } from '../lib/diseases.ts';
import { setActiveLabels } from '../lib/labels.ts';
import { V8_LIST } from '../lib/diseases.v8.ts';
import { SW_DISEASES_V8 } from '../lib/diseases.v8.sw.ts';
import { CROP_SW } from '../lib/diseases.sw.ts';

let n = 0;
const ok = (name, fn) => {
  fn();
  n++;
  console.log('PASS ' + name);
};
const v8c = labelList(JSON.parse(readFileSync(new URL('./kb/extra_labels/v8c.json', import.meta.url), 'utf8')));
const builtin = labelList(JSON.parse(readFileSync(new URL('../assets/model/class_labels.json', import.meta.url), 'utf8')));

ok('v8c: every class the model can name has a treatment guide (the phone runs the same check)', () => {
  assert.ok(v8c && v8c.length > builtin.length);
  assert.deepEqual(uncoveredLabels(v8c, (l) => Boolean(getDisease(l))), []);
});

ok('every v8 guide has its Kiswahili twin, and every new crop a Kiswahili name', () => {
  for (const d of V8_LIST) {
    assert.ok(SW_DISEASES_V8[d.label], `${d.label} has no Kiswahili`);
    assert.ok(CROP_SW[d.crop], `${d.crop} has no Kiswahili name`);
    assert.equal(getDiseaseL(d.label, 'sw').disease, SW_DISEASES_V8[d.label].disease);
  }
});

ok('PCPB: no restricted active and no dose in any v8 guide', () => {
  const text = JSON.stringify([V8_LIST, SW_DISEASES_V8]).toLowerCase();
  for (const b of ['chlorothalonil', 'chlorpyrifos', 'dimethoate', 'imidacloprid', 'abamectin', 'iprodione', 'carbofuran']) assert.ok(!text.includes(b), b);
  assert.doesNotMatch(text, /\d+(\.\d+)?\s*(ml|g|kg|l|litres?|%|ppm)\b/);
});

ok('nutrient disorders get fertiliser steps, never a spray', () => {
  const disorders = V8_LIST.filter((d) => d.kind === 'Disorder');
  assert.equal(disorders.length, 3);
  for (const d of disorders) {
    assert.deepEqual(d.chemical, []);
    for (const lang of ['en', 'sw']) {
      const plan = JSON.stringify(buildPlan(d, lang));
      assert.doesNotMatch(plan, /spray|nyunyiz|Option:|Chaguo:/i, `${d.label} plan mentions spraying`);
    }
  }
});

ok('wheat blast is marked for reporting to the county officer', () => {
  assert.equal(getDisease('Wheat___Blast')?.notifiable, true);
});

ok('library: the built-in model does not "detect" v8-only classes; a v8 model does', () => {
  const only = V8_LIST.filter((d) => !builtin.includes(d.label));
  assert.ok(only.length >= 18);
  setActiveLabels(null);
  for (const d of only) assert.equal(scannerCanName(d.label), false, d.label);
  assert.equal(scannerCanName(builtin[0]), true);
  setActiveLabels(v8c);
  for (const d of only) assert.equal(scannerCanName(d.label), true, d.label);
  setActiveLabels(null);
});

console.log(`\n${n} v8 guide tests passed`);
