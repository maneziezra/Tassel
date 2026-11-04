// Behaviour tests for lib/photoQuality.ts. Run via `npm test`.
import assert from 'node:assert/strict';
import { assessQuality } from '../lib/photoQuality.ts';

let n = 0;
const ok = (name, fn) => {
  fn();
  n++;
  console.log('PASS ' + name);
};

const S = 64;
const make = (f) => {
  const a = new Uint8ClampedArray(S * S * 4);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const v = f(x, y);
      a.set([v, v, v, 255], (y * S + x) * 4);
    }
  return a;
};
const noise = (x, y) => 110 + 60 * Math.sin(x * 1.7) * Math.cos(y * 2.3); // plenty of edges
const flat = () => 120;

ok('a detailed, well-lit image is neither dark nor blurry', () => {
  const q = assessQuality(make(noise), S);
  assert.equal(q.dark, false);
  assert.equal(q.blurry, false);
});

ok('a flat image has no edges: blurry', () => {
  assert.equal(assessQuality(make(flat), S).blurry, true);
});

ok('a dim image is dark', () => {
  const q = assessQuality(make((x, y) => noise(x, y) * 0.25), S);
  assert.equal(q.dark, true);
});

ok('brightness is the mean grey value', () => {
  assert.ok(Math.abs(assessQuality(make(flat), S).brightness - 120) < 0.5);
});

console.log(`\n${n} photo-quality tests passed`);
