// node --experimental-strip-types scripts/test-satellite-export.mjs
// Checks that the app's labels and exports never claim 10 m for anything that uses B11 or SCL.
import assert from 'node:assert/strict';
import { RESOLUTION, productLabel, toCsv, toGeoJson, fromUtm, toUtm } from '../lib/satelliteCore.ts';

let n = 0;
const test = (name, fn) => { fn(); n++; console.log('ok', name); };

test('dashboard labels', () => {
  assert.equal(productLabel('NDVI'), 'NDVI · 10 m');
  assert.equal(productLabel('NDWI_CROP'), 'Crop-water NDWI · 20 m');
  assert.equal(productLabel('JOINT_MASK'), 'Joint stress mask · 20 m');
  assert.equal(productLabel('NDWI_WATER'), 'Open-water NDWI · 10 m');
});

test('no product that uses B11 or SCL claims 10 m', () => {
  for (const [id, p] of Object.entries(RESOLUTION.products)) {
    if (p.bands.includes('B11') || p.bands.includes('SCL')) {
      assert.ok(p.effective_resolution_m >= 20 && p.grid_m >= 20, `${id} claims ${p.effective_resolution_m} m`);
    }
  }
  assert.deepEqual(RESOLUTION.products.NDWI_WATER.bands, ['B03', 'B08']);
});

const epsg = 32636;
const [cx, cy] = toUtm(0.5538, 35.3767, epsg);
const x20 = Math.floor(cx / 20) * 20 - 40, y20 = Math.ceil(cy / 20) * 20 + 40;
const grid = {
  epsg,
  resolution: RESOLUTION,
  grid10: { x0: x20 + 20, y0: y20 - 20, w: 4, h: 4, res: 10, bounds: [[0, 0], [0, 0]], inside: [0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0], ndvi: new Array(16).fill(480), ndwi_water: new Array(16).fill(-550) },
  grid20: { x0: x20, y0: y20, w: 4, h: 4, res: 20, bounds: [[0, 0], [0, 0]], cls: [255, 255, 255, 255, 255, 2, 3, 255, 255, 2, 0, 255, 255, 255, 255, 255], ndwi_crop: new Array(16).fill(-50), ndvi: new Array(16).fill(470) },
};
const obs = {
  id: 1, farm_id: 'f', scene_id: 'S2A_TEST', observed_at: '2026-10-17T08:10:00Z', scene_cloud_pct: 3, total_px: 4, valid_px: 3, haze_px: 0, valid_pct: 75,
  total_px10: 4, valid_px10: 4, quality: 'limited', suspect: false, ndvi_median: 0.48, ndvi_p10: 0.4, ndvi_p90: 0.55, ndvi20_median: 0.47,
  ndwi_crop_median: -0.05, ndwi_crop_p10: -0.08, ndwi_crop_p90: -0.02, ndwi_water_median: -0.55, crop_fraction: 1, baseline_n: 3,
  ndvi_baseline: 0.5, ndwi_baseline: -0.03, ndvi_spread: 0.02, ndwi_spread: 0.02, ndvi_delta: -0.03, ndwi_delta: -0.02, ndvi_anomaly: -1, ndwi_anomaly: -1,
  rain_mm_21d: 40, et0_mm_21d: 110, rain_deficit: 0.6, water_stress_score: 0.2, dominant_class: 2, stressed_fraction: 0.25, class_fractions: [], method_version: 's2-joint-v2',
  resolution: RESOLUTION,
};

test('CSV carries resolution in metadata lines and column names', () => {
  const csv = toCsv([obs], 'Test field');
  assert.match(csv, /# NDVI: NDVI, bands B04\+B08, effective resolution 10 m/);
  assert.match(csv, /# NDWI_CROP: Crop-water NDWI, bands B08\+B11, effective resolution 20 m/);
  assert.match(csv, /# JOINT_MASK: Joint stress mask, bands B02\+B04\+B08\+B11\+SCL, effective resolution 20 m/);
  assert.match(csv, /# NDWI_WATER: Open-water NDWI, bands B03\+B08, effective resolution 10 m/);
  const header = csv.split('\n').find((l) => l.startsWith('field,'));
  assert.ok(header.includes('ndwi_crop_20m_median') && header.includes('joint_mask_20m_class') && header.includes('ndvi_10m_median') && header.includes('ndwi_water_10m_median'));
  assert.ok(!/ndwi_crop_10m|joint_mask_10m|water_stress_score_10m/.test(header));
});

test('GeoJSON: 20 m products as 20 m squares, 10 m products as 10 m squares', () => {
  const gj = JSON.parse(toGeoJson(grid, obs, 'Test field'));
  assert.equal(gj.properties.resolution.products.NDWI_CROP.effective_resolution_m, 20);
  const f20 = gj.features.filter((f) => f.properties.layer === 'analysis_20m');
  const f10 = gj.features.filter((f) => f.properties.layer === 'native_10m');
  assert.equal(f20.length, 4);
  assert.equal(f10.length, 4);
  for (const f of f20) {
    assert.equal(f.properties.cell_size_m, 20);
    assert.equal(f.properties.joint_mask_effective_resolution_m, 20);
    assert.equal(f.properties.ndwi_crop_effective_resolution_m, 20);
    // the square really is 20 m across
    const [[lo0, la0], [lo1, la1]] = f.geometry.coordinates[0];
    const a = toUtm(la0, lo0, epsg), b = toUtm(la1, lo1, epsg);
    assert.ok(Math.abs(Math.hypot(b[0] - a[0], b[1] - a[1]) - 20) < 0.05);
  }
  for (const f of f10) {
    assert.equal(f.properties.cell_size_m, 10);
    assert.ok(!('ndwi_crop' in f.properties) && !('joint_mask_class' in f.properties), 'a 20 m product leaked onto a 10 m pixel');
    assert.equal(f.properties.ndvi_effective_resolution_m, 10);
  }
  assert.ok(Math.abs(fromUtm(cx, cy, epsg)[0] - 0.5538) < 1e-6);
});

console.log(`${n} passed`);
