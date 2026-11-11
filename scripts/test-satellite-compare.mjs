// Behaviour tests for lib/aerial.ts and lib/satelliteCompare.ts. Run via `npm test`.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { AERIAL, aerialTiles, mercX, mercY } from '../lib/aerial.ts';
import { GREEN_MIN, WATER_MIN, change, compareDates, dueFieldCheck, earlierClear, fieldAlert, pickEarlier, FIELD_CHECK_EVERY_MS } from '../lib/satelliteCompare.ts';

let n = 0;
const ok = (name, fn) => {
  fn();
  n++;
  console.log('PASS ' + name);
};

// A field-sized box near Eldoret (about 120 m x 100 m).
const nw = { lat: 0.5152, lng: 35.2690 };
const se = { lat: 0.5143, lng: 35.2701 };

ok('tile maths: known Web Mercator values', () => {
  assert.equal(mercX(0, 1), 1);
  assert.equal(mercX(-180, 3), 0);
  assert.ok(Math.abs(mercY(0, 1) - 1) < 1e-9); // the equator is the middle row
  assert.ok(mercY(10, 5) < mercY(-10, 5)); // north is up
});

ok('aerial tiles cover the whole frame, at the sharpest zoom the budget allows', () => {
  const r = aerialTiles(nw, se, 300, 250);
  assert.ok(r);
  assert.equal(r.z, AERIAL.maxZoom);
  assert.ok(r.tiles.length >= 1 && r.tiles.length <= 9);
  const left = Math.min(...r.tiles.map((t) => t.left)), top = Math.min(...r.tiles.map((t) => t.top));
  const right = Math.max(...r.tiles.map((t) => t.left + t.width)), bottom = Math.max(...r.tiles.map((t) => t.top + t.height));
  assert.ok(left <= 0 && top <= 0 && right >= 300 && bottom >= 250);
  for (const t of r.tiles) assert.match(t.uri, /^https:\/\/server\.arcgisonline\.com\/.*World_Imagery.*\/18\/\d+\/\d+$/);
});

ok('aerial tiles: square pixels on the ground (same scale across and down, within 1%)', () => {
  const r = aerialTiles(nw, se, 300, 300 * ((nw.lat - se.lat) / (se.lng - nw.lng)));
  assert.ok(Math.abs(r.tiles[0].width / r.tiles[0].height - 1) < 0.01);
});

ok('a big field steps down a zoom instead of fetching many images', () => {
  const r = aerialTiles({ lat: 0.53, lng: 35.25 }, { lat: 0.50, lng: 35.29 }, 300, 220);
  assert.ok(r && r.z < AERIAL.maxZoom && r.tiles.length <= 9);
});

ok('no frame, no tiles', () => {
  assert.equal(aerialTiles(nw, se, 0, 100), null);
  assert.equal(aerialTiles(se, nw, 300, 250), null);
});

ok('a change needs the same thresholds interpret() uses; less is "about the same"', () => {
  assert.equal(GREEN_MIN, 0.08);
  assert.equal(WATER_MIN, 0.1);
  assert.equal(change(0.60, 0.67, GREEN_MIN), 'same');
  assert.equal(change(0.60, 0.69, GREEN_MIN), 'up');
  assert.equal(change(0.60, 0.50, GREEN_MIN), 'down');
  assert.equal(change(null, 0.5, GREEN_MIN), 'unknown');
  const src = readFileSync(new URL('../lib/satellite.ts', import.meta.url), 'utf8');
  assert.match(src, /dv < -0\.08 && dw < -0\.1/); // if interpret() changes, change these together
});

const o = (id, day, ndvi, ndwi, extra = {}) => ({
  id, observed_at: `2026-10-${String(day).padStart(2, '0')}T08:00:00Z`, ndvi20_median: ndvi, ndwi_crop_median: ndwi, quality: 'good', suspect: false, ...extra,
});

ok('then and now: green cover and leaf water are judged separately', () => {
  const r = compareDates(o(1, 3, 0.70, 0.20), o(2, 24, 0.55, 0.15));
  assert.deepEqual(r, { green: 'down', water: 'same', days: 21 });
});

ok('the earlier date offered is a clear one, about three weeks back', () => {
  const obs = [o(1, 1, 0.5, 0.1), o(2, 5, 0.5, 0.1, { quality: 'unusable' }), o(3, 8, 0.5, 0.1), o(4, 20, 0.5, 0.1, { suspect: true }), o(5, 28, 0.5, 0.1)];
  assert.deepEqual(earlierClear(obs, obs[4]).map((x) => x.id), [1, 3]);
  assert.equal(pickEarlier(obs, obs[4]).id, 3); // 7 Oct is the target; 8 Oct is nearest
  assert.equal(pickEarlier(obs, obs[0]), null);
});

ok('alerts: only a clear, recent "act" reading notifies, once per image', () => {
  const r = { tone: 'act', canAlert: true, headline: 'Possible water stress', action: 'Inspect the north end within 24–48 hours.', latestId: 77 };
  assert.deepEqual(fieldAlert('f1', 'Main Shamba', r), { key: 'sat:f1:77', title: 'Main Shamba: Possible water stress', body: 'Inspect the north end within 24–48 hours.' });
  assert.equal(fieldAlert('f1', 'Main Shamba', { ...r, tone: 'watch' }), null);
  assert.equal(fieldAlert('f1', 'Main Shamba', { ...r, canAlert: false }), null);
  assert.equal(fieldAlert('f1', 'Main Shamba', { ...r, tone: 'normal' }), null);
  assert.equal(fieldAlert('f1', 'Main Shamba', { ...r, latestId: null }), null);
});

ok('fields are re-checked at most about once a day', () => {
  const now = 1_800_000_000_000;
  assert.equal(dueFieldCheck(null, now), true);
  assert.equal(dueFieldCheck(now - 3600_000, now), false);
  assert.equal(dueFieldCheck(now - FIELD_CHECK_EVERY_MS, now), true);
});

console.log(`\n${n} satellite compare tests passed`);
