// Behaviour tests for lib/storyScene.ts: every advisory step gets a picture that shows
// what its words say, and "Do not..." steps are marked as such. Run via `npm test`.
import assert from 'node:assert/strict';
import { CROPS } from '../lib/advisory.ts';
import { diagramFacts } from '../lib/diagramFacts.ts';
import { isDont, sceneEmoji, sceneFor } from '../lib/storyScene.ts';

let n = 0;
const ok = (name, fn) => {
  fn();
  n++;
  console.log('PASS ' + name);
};

ok('the work named in a step picks its scene', () => {
  assert.equal(sceneFor('Top-dress with CAN.'), 'topdress');
  assert.equal(sceneFor('First weeding 2–3 weeks after emergence; second weeding before top-dressing.'), 'weed');
  assert.equal(sceneFor('Dry grain on tarpaulins (never on bare soil) to below 13.5% moisture before storage.'), 'dry');
  assert.equal(sceneFor('Harvest when husks are dry and grain is hard.'), 'harvest');
  assert.equal(sceneFor('Remove wilting plants with their tubers (bacterial wilt) — do not leave them in the field.'), 'remove');
  assert.equal(sceneFor('Plough and harrow to a fine, firm seedbed.'), 'prepare');
  assert.equal(sceneFor('Scout twice a week for fall armyworm: ragged leaves and droppings in the whorl.'), 'scout');
  assert.equal(sceneFor('Cover with insect-proof net to keep whiteflies off.'), 'net');
});

ok('"can" in a sentence is not the fertiliser CAN', () => {
  assert.notEqual(sceneFor('Check cobs for ear rots — rotten cobs can contain aflatoxin.'), 'topdress');
  assert.equal(sceneFor('The most water-sensitive stage — avoid drought stress if you can irrigate.'), 'water');
});

ok('"Do not" steps are marked, others are not', () => {
  assert.equal(isDont('Do not weed during flowering — it knocks off flowers.'), true);
  assert.equal(isDont('Stop irrigation about 2 weeks before harvest.'), true);
  assert.equal(isDont('Weed 2 and 4 weeks after emergence.'), false);
});

ok('almost every advisory step without a measured diagram gets a specific scene', () => {
  let steps = 0;
  let generic = 0;
  for (const c of CROPS)
    for (const s of c.stages)
      for (const a of s.activities) {
        if (diagramFacts(a).length) continue;
        steps++;
        if (sceneFor(a) === 'grow') generic++;
      }
  assert.ok(steps > 50);
  assert.ok(generic <= 2, `${generic} steps fall back to the generic scene`);
});

ok('every scene has an emoji that exists in the bundled Noto set', () => {
  const names = new Set(['plant', 'corn', 'tomato', 'potato', 'bug', 'rain', 'droplet', 'sparkles', 'party', 'leaves', 'sick', 'happy', 'thinking',
    'sun', 'tractor', 'ant', 'check', 'herb', 'fungus', 'microbe', 'warning', 'eyes', 'fallenleaf', 'beans', 'greens', 'thumbsup', 'siren']);
  for (const k of ['weed', 'topdress', 'spray', 'water', 'harvest', 'dry', 'store', 'scout', 'remove', 'stake', 'prepare', 'earthup', 'transplant', 'net', 'seedtreat', 'sort', 'mix', 'grow'])
    for (const crop of ['Maize', 'Beans', 'Coffee', null]) assert.ok(names.has(sceneEmoji(k, crop)), `${k}/${crop}`);
});

console.log(`\n${n} story-scene tests passed`);
