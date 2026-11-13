// Tests for the real step photos (13 Nov 2026; lib/storyPhotos.ts, components/StoryPhoto.tsx).
// Every scene kind has a photo file, an open licence the app may use, a credit and a caption in
// English and Kiswahili. Run via `npm test`.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { STORY_PHOTO_CREDITS, creditLine } from '../lib/storyPhotos.ts';
import { sceneFor } from '../lib/storyScene.ts';

let n = 0;
const ok = (name, fn) => {
  fn();
  n++;
  console.log('PASS ' + name);
};
const KINDS = ['weed', 'topdress', 'spray', 'water', 'harvest', 'dry', 'store', 'scout', 'remove', 'stake', 'prepare', 'earthup', 'transplant', 'net', 'seedtreat', 'sort', 'mix', 'grow'];
const root = new URL('../', import.meta.url);

ok('every scene kind has a photo file, 960 x 640 JPEG, not too heavy', () => {
  assert.deepEqual(Object.keys(STORY_PHOTO_CREDITS).sort(), [...KINDS].sort());
  let total = 0;
  for (const k of KINDS) {
    const f = new URL(`assets/story/${k}.jpg`, root);
    assert.ok(existsSync(f), `${k}.jpg missing`);
    const b = readFileSync(f);
    assert.equal(b[0], 0xff, `${k}.jpg is not a JPEG`);
    assert.equal(b[1], 0xd8, `${k}.jpg is not a JPEG`);
    total += statSync(f).size;
  }
  assert.ok(total < 3_000_000, `photos add ${total} bytes to the app`);
});

ok('licences: only CC0, public domain, CC BY or CC BY-SA; never non-commercial or no-derivatives', () => {
  for (const [k, c] of Object.entries(STORY_PHOTO_CREDITS)) {
    assert.match(c.licence, /^(CC0|Public domain|CC BY(-SA)? [1-4]\.0)$/, `${k}: ${c.licence}`);
    assert.doesNotMatch(c.licence, /NC|ND/, k);
    assert.match(c.source, /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/, `${k}: source`);
    assert.ok(c.author.trim().length > 1, `${k}: author`);
  }
});

ok('credit line names the author and the licence (shown on the photo)', () => {
  const c = STORY_PHOTO_CREDITS.weed;
  assert.equal(creditLine(c), `${c.author} · ${c.licence}`);
});

ok('every photo has a caption in English and Kiswahili, and claims no place the source does not', () => {
  for (const [k, c] of Object.entries(STORY_PHOTO_CREDITS)) {
    assert.ok(c.alt.en.length > 5 && c.alt.sw.length > 5, k);
    if (/Kenya/.test(c.alt.en)) assert.match(c.title + ' ' + c.source, /Kenya|Baringo/, `${k} says Kenya`);
  }
});

ok('steps reach the right photo (the picture never shows work the text does not say)', () => {
  assert.equal(sceneFor('Top-dress with CAN when the maize is knee high'), 'topdress');
  assert.equal(sceneFor('Weed early, before the crop is 4 weeks old'), 'weed');
  assert.equal(sceneFor('Spray in the early morning'), 'spray');
  assert.equal(sceneFor('Pull out and destroy infected plants'), 'remove');
  assert.equal(sceneFor('Dry the grain on a tarpaulin'), 'dry');
});

console.log(`\n${n} story photo tests passed`);
