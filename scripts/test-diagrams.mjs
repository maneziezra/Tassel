// Behaviour tests for lib/diagramFacts.ts: every advisory diagram number must
// come from the step's own text (rule 1). Run via `npm test`.
import assert from 'node:assert/strict';
import { diagramFacts, rangeLabel } from '../lib/diagramFacts.ts';
import { CROPS } from '../lib/advisory.ts';

let n = 0;
const ok = (name, fn) => {
  fn();
  n++;
  console.log('PASS ' + name);
};

ok('maize: 75 × 30 cm spacing', () => {
  const f = diagramFacts('Spacing 75 × 30 cm, one seed per hole ≈ 17,800 plants per acre (about 44,000 per hectare).');
  assert.deepEqual(f, [{ kind: 'spacing', row: [75, 75], plant: [30, 30] }]);
});

ok('beans: ranges stay ranges, spacing first then depth', () => {
  const f = diagramFacts('Plant 3–5 cm deep at about 45–50 × 10–15 cm.');
  assert.deepEqual(f, [
    { kind: 'spacing', row: [45, 50], plant: [10, 15] },
    { kind: 'depth', cm: [3, 5] },
  ]);
  assert.equal(rangeLabel([45, 50]), '45–50');
});

ok('potato: depth and "rows 75 cm apart, 30 cm within the row"', () => {
  const f = diagramFacts('Plant whole certified seed tubers 10 cm deep, rows 75 cm apart, 30 cm within the row.');
  assert.deepEqual(f, [
    { kind: 'spacing', row: [75, 75], plant: [30, 30] },
    { kind: 'depth', cm: [10, 10] },
  ]);
});

ok('tomato: the first pair when the step lists two', () => {
  const f = diagramFacts('Spacing about 60 × 45 cm (bush types) or 90 × 60 cm (staked types).');
  assert.deepEqual(f[0], { kind: 'spacing', row: [60, 60], plant: [45, 45] });
});

ok('potato rotation: 3 seasons', () => {
  const f = diagramFacts('Rotate: do not plant after potato, tomato or other solanaceous crops for 3 seasons (bacterial wilt).');
  assert.deepEqual(f, [{ kind: 'rotation', seasons: 3 }]);
});

ok('certified seed only when no measured fact is in the step', () => {
  assert.deepEqual(diagramFacts('Use clean certified seed — many bean viruses are carried in seed.'), [{ kind: 'certified' }]);
});

ok('no diagram for a step without a stated fact', () => {
  assert.deepEqual(diagramFacts('First weeding.'), []);
  // "5–10 cm from the stem" is a placement, not a depth: no depth diagram
  assert.deepEqual(diagramFacts('Top-dress with nitrogen (CAN or urea) at knee height, placed 5–10 cm from the stem.'), []);
});

ok('every number a diagram draws appears in its own step text', () => {
  let drawn = 0;
  for (const crop of CROPS)
    for (const stage of crop.stages)
      for (const act of stage.activities)
        for (const f of diagramFacts(act)) {
          drawn++;
          const nums = f.kind === 'spacing' ? [...f.row, ...f.plant] : f.kind === 'depth' ? f.cm : f.kind === 'rotation' ? [f.seasons] : [];
          for (const v of nums) assert.ok(act.includes(String(v)), `${v} not in "${act}"`);
        }
  assert.ok(drawn >= 6, `expected diagrams across the guides, got ${drawn}`);
});

console.log(`\n${n} diagram tests passed`);
