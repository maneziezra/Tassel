// node --experimental-strip-types scripts/test-fieldart.mjs
// The Home hero draws the field from its real satellite grid (lib/fieldArt.ts).
import assert from 'node:assert/strict';
import { layoutField, ndviColor, utmEpsg, MAX_HERO_CELLS } from '../lib/fieldArt.ts';
import { toUtm } from '../lib/satelliteCore.ts';

let passed = 0;
const test = (name, fn) => {
  fn();
  passed++;
  console.log('PASS', name);
};

// A ~60 x 40 m field near Eldoret (lat 0.52, lng 35.27 -> UTM zone 36N).
const poly = [
  [0.5200, 35.2700],
  [0.5200, 35.27054],
  [0.51964, 35.27054],
  [0.51964, 35.2700],
];
const epsg = utmEpsg(poly[0][0], poly[0][1]);

function gridFor(polygon, res10 = 10) {
  const ring = polygon.map(([la, lo]) => toUtm(la, lo, epsg));
  const x0 = Math.floor(Math.min(...ring.map((p) => p[0])) / 10) * 10;
  const y0 = Math.ceil(Math.max(...ring.map((p) => p[1])) / 10) * 10;
  const w = 7, h = 5, n = w * h;
  const grid10 = { x0, y0, w, h, res: res10, bounds: [[0, 0], [0, 0]], inside: Array(n).fill(1), ndvi: Array.from({ length: n }, (_, i) => (i === 3 ? null : 700)), ndwi_water: Array(n).fill(-500) };
  const w2 = 4, h2 = 3, n2 = w2 * h2;
  const cls = Array(n2).fill(2);
  cls[5] = 4; // one 20 m cell with possible severe water stress
  const grid20 = { x0, y0, w: w2, h: h2, res: 20, bounds: [[0, 0], [0, 0]], cls, ndwi_crop: Array(n2).fill(100), ndvi: Array(n2).fill(700) };
  return { epsg, resolution: {}, grid10, grid20 };
}

test('UTM zone for Eldoret is 36N (EPSG 32636); Nairobi south of the equator is 32737', () => {
  assert.equal(utmEpsg(0.52, 35.27), 32636);
  assert.equal(utmEpsg(-1.29, 36.82), 32737);
});

test('nothing to draw without a boundary or a grid', () => {
  assert.equal(layoutField(null, null, 300, 200), null);
});

test('boundary only (first satellite check running): outline, no squares', () => {
  const art = layoutField(poly, null, 300, 200);
  assert.equal(art.outline.length, 4);
  assert.equal(art.cells.length, 0);
  for (const [x, y] of art.outline) {
    assert.ok(x >= 0 && x <= 300 && y >= 0 && y <= 200, `point ${x},${y} inside the box`);
  }
});

test('with a grid: one square per in-field 10 m cell, cloud cells marked', () => {
  const art = layoutField(poly, gridFor(poly), 300, 200);
  assert.equal(art.cells.length, 35);
  assert.equal(art.res, 10);
  assert.equal(art.cells.filter((c) => c.noData).length, 1);
  assert.equal(art.cells[0].color, ndviColor(0.7));
});

test('stress outlines come only from the 20 m joint mask', () => {
  const art = layoutField(poly, gridFor(poly), 300, 200);
  assert.equal(art.stress.length, 1);
  assert.ok(Math.abs(art.stress[0].s - 2 * art.cells[0].s) < 1e-6, '20 m outline is twice a 10 m square');
});

test('north is up: the northern edge has smaller y', () => {
  const art = layoutField(poly, null, 300, 200);
  assert.ok(art.outline[0][1] < art.outline[2][1]);
});

test('very large fields switch to the 20 m layer to stay fast', () => {
  const g = gridFor(poly);
  g.grid10.inside = Array(MAX_HERO_CELLS + 1).fill(1);
  const art = layoutField(poly, g, 300, 200);
  assert.equal(art.res, 20);
});

console.log(`\n${passed} field-art tests passed`);
