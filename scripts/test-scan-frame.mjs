// Behaviour tests for lib/scanFrame.ts: a camera scan must give the model only what
// was inside the gold guide frame, because the model was trained on leaves that fill
// the picture. Run via `npm test`.
import assert from 'node:assert/strict';
import { FRAME_SHARE, FRAME_SLACK, frameFraction } from '../lib/scanFrame.ts';

let n = 0;
const ok = (name, fn) => {
  fn();
  n++;
  console.log('PASS ' + name);
};
const near = (a, b, eps = 0.01) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

ok('TECNO 720x1600, 3:4 portrait photo: frame is 43% of the short side, 50% with slack', () => {
  // cover scale = max(720/3000, 1600/4000) = 0.4; frame = 0.72*720/0.4 = 1296 px of 3000
  near(frameFraction(720, 1600, 3000, 4000), (1296 / 3000) * FRAME_SLACK);
});

ok('photo reported in landscape on a portrait screen gives the same crop', () => {
  near(frameFraction(720, 1600, 4000, 3000), frameFraction(720, 1600, 3000, 4000));
});

ok('a screen with the same shape as the photo keeps the frame share plus slack', () => {
  near(frameFraction(750, 1000, 3000, 4000), FRAME_SHARE * FRAME_SLACK);
});

ok('never more than the whole photo, never a sliver, safe on missing sizes', () => {
  assert.equal(frameFraction(1000, 1000, 1000, 1000) <= 1, true);
  assert.equal(frameFraction(320, 4000, 3000, 4000) >= 0.2, true);
  assert.equal(frameFraction(0, 0, 3000, 4000), 1);
  assert.equal(frameFraction(720, 1600, 0, 0), 1);
});

console.log(`scan frame: ${n} passed`);
