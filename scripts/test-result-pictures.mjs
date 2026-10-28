// Behaviour tests for lib/resultPictures.ts: the scan result draws a picture only
// when the disease guide's own words say it (rule 5). Run via `npm test`.
import assert from 'node:assert/strict';
import { spreadPictures, stepIcon, stepTitle } from '../lib/resultPictures.ts';

let n = 0;
const ok = (name, fn) => {
  fn();
  n++;
  console.log('PASS ' + name);
};
const keys = (s) => spreadPictures(s).map((p) => p.key);

ok('rain splash and damp weather from the guide text', () => {
  assert.deepEqual(keys('Spores from fallen infected leaves, splashed by rain in cool wet weather.'), ['rain', 'wet']);
});

ok('a negation draws nothing: "Does not need rain"', () => {
  assert.deepEqual(keys('Airborne spores; favoured by warm days, cool nights and shade. Does not need rain.'), ['wind']);
});

ok('soil and old crop from residue; nothing invented', () => {
  assert.deepEqual(keys('Survives on maize residue left on the surface; spreads in warm, humid weather with long leaf wetness.'), ['soil', 'wet']);
  assert.deepEqual(keys(null), []);
  assert.deepEqual(keys('Unknown.'), []);
});

ok('insects, seed and hands', () => {
  assert.deepEqual(keys('Spread by whiteflies and in infected transplants; also on hands and tools.'), ['insects', 'seed', 'hands']);
});

ok('step icons follow the words; plain check otherwise', () => {
  assert.equal(stepIcon('Remove and burn infected leaves.'), 'fire');
  assert.equal(stepIcon('Remove infected leaves.'), 'content-cut');
  assert.equal(stepIcon('Rotate with non-host crops for 3 seasons.'), 'sync');
  assert.equal(stepIcon('Plant certified, resistant varieties.'), 'seed-outline');
  assert.equal(stepIcon('Keep a good record.'), 'check-circle-outline');
});

ok('step titles are whole first clauses, never cut mid-word or with "…"', () => {
  assert.equal(stepTitle('Remove infected leaves, then burn them.'), 'Remove infected leaves');
  assert.equal(stepTitle('Rotate crops; avoid tomato after potato.'), 'Rotate crops');
  assert.equal(stepTitle('Use certified seed.'), 'Use certified seed');
  assert.equal(stepTitle('Stake plants (60 cm) for airflow.'), 'Stake plants');
  for (const s of ['Remove infected leaves, then burn them.', 'Use certified seed.']) assert.ok(!stepTitle(s).includes('…'));
});

console.log(`\n${n} result-picture tests passed`);
