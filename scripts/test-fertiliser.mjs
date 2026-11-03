// Behaviour tests for lib/fertiliser.ts: a crop the guide does not cover gets no
// plan, never another crop's rates (rule 1). Run via `npm test`.
import assert from 'node:assert/strict';

// The module require()s its bag pictures (Metro assets); Node only needs a stand-in.
globalThis.require = (path) => path;
const { PLANS, guideFor, planFor } = await import('../lib/fertiliser.ts');

let n = 0;
const ok = (name, fn) => {
  fn();
  n++;
  console.log('PASS ' + name);
};

ok('every guide crop finds its own plan, in English and Kiswahili', () => {
  for (const p of PLANS) assert.equal(guideFor(p.crop)?.crop, p.crop);
  assert.equal(guideFor('Mahindi')?.crop, 'Maize');
  assert.equal(guideFor('Nyanya')?.crop, 'Tomato');
});

ok('coffee has its own per-tree plan from the Kenya Coffee Sustainability Manual', () => {
  const c = guideFor('Coffee');
  assert.equal(c?.crop, 'Coffee');
  assert.equal(guideFor('Kahawa')?.crop, 'Coffee');
  const [npk, can] = c.apps;
  assert.equal(npk.perTreeG, 250);
  assert.equal(can.perTreeG, 300);
  assert.equal(npk.treesPerAcre, 538); // 1,330 trees per hectare
  assert.equal(npk.refKgPerAcre, (250 * 538) / 1000);
  assert.ok(c.source.includes('Kenya Coffee Sustainability Manual'));
});

ok('tea and a blank crop get no plan (no maize rates by default)', () => {
  assert.equal(guideFor('Tea'), null);
  assert.equal(guideFor(''), null);
  assert.equal(guideFor(null), null);
});

ok('the manual picker still always has a plan', () => {
  assert.equal(planFor('Beans').crop, 'Beans');
  assert.ok(planFor('Coffee'));
});

console.log(`\n${n} fertiliser tests passed`);
