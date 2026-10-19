// Tassel — satellite core: types, classes, resolution labels, geometry and exports.
//
// Pure (no imports), so scripts/test-satellite-export.mjs can test it with plain Node.
//
// Resolution rule (method s2-joint-v2), mirrored from the satellite-health function:
//   NDVI               B4, B8      10 m  native pixels
//   Open-water NDWI    B3, B8      10 m  native pixels   (NDWI_WATER)
//   Crop-water NDWI    B8, B11     20 m  analysis cells  (NDWI_CROP; B11 is natively 20 m)
//   Joint stress mask  …, B11, SCL 20 m  analysis cells
// 20 m products are drawn and exported as 20 m squares, never split into 10 m pixels.

export type Quality = 'excellent' | 'good' | 'limited' | 'unusable';

export type ProductId = 'NDVI' | 'NDWI_WATER' | 'NDWI_CROP' | 'JOINT_MASK' | 'WATER_STRESS_SCORE';

export type ProductMeta = { label: string; bands: string[]; effective_resolution_m: number; grid_m: number; note: string };

export type ResolutionMeta = {
  method_version: string;
  display_grid_m: number;
  analysis_grid_m: number;
  products: Record<ProductId, ProductMeta>;
  counts_note: string;
  statement: string;
};

/** Fallback copy of the server's metadata, used when a row predates it. The server's copy wins. */
export const RESOLUTION: ResolutionMeta = {
  method_version: 's2-joint-v2',
  display_grid_m: 10,
  analysis_grid_m: 20,
  products: {
    NDVI: { label: 'NDVI', bands: ['B04', 'B08'], effective_resolution_m: 10, grid_m: 10, note: 'Native 10 m bands.' },
    NDWI_WATER: { label: 'Open-water NDWI', bands: ['B03', 'B08'], effective_resolution_m: 10, grid_m: 10, note: 'Green–NIR NDWI for open water and flooding only. Native 10 m bands.' },
    NDWI_CROP: { label: 'Crop-water NDWI', bands: ['B08', 'B11'], effective_resolution_m: 20, grid_m: 20, note: 'B11 is natively 20 m; B8 is averaged to 20 m. No 10 m water information exists.' },
    JOINT_MASK: { label: 'Joint stress mask', bands: ['B02', 'B04', 'B08', 'B11', 'SCL'], effective_resolution_m: 20, grid_m: 20, note: 'Computed on the 20 m analysis grid because it uses crop-water NDWI and SCL.' },
    WATER_STRESS_SCORE: { label: 'Water-stress score', bands: ['B04', 'B08', 'B11'], effective_resolution_m: 20, grid_m: 20, note: 'From 20 m changes plus a ~10 km rainfall deficit.' },
  },
  counts_note: 'Clear and total counts for quality refer to 20 m analysis cells (400 m² each).',
  statement: 'Products that use B11 or SCL have 20 m effective resolution. They may be drawn on a 10 m map, but contain no 10 m information.',
};

/** "NDVI · 10 m", "Crop-water NDWI · 20 m", "Joint stress mask · 20 m", "Open-water NDWI · 10 m". */
export function productLabel(id: ProductId, meta: ResolutionMeta = RESOLUTION): string {
  const p = meta.products[id] ?? RESOLUTION.products[id];
  return `${p.label} · ${p.effective_resolution_m} m`;
}

export type Observation = {
  id: number;
  farm_id: string;
  scene_id: string;
  observed_at: string;
  scene_cloud_pct: number | null;
  total_px: number; // 20 m analysis cells in the field
  valid_px: number; // clear 20 m cells
  haze_px: number; // hazy 20 m cells
  valid_pct: number; // of 20 m cells
  total_px10: number | null; // 10 m pixels in the field
  valid_px10: number | null;
  quality: Quality;
  suspect: boolean;
  ndvi_median: number | null; // NDVI, native 10 m
  ndvi_p10: number | null;
  ndvi_p90: number | null;
  ndvi20_median: number | null; // NDVI at the 20 m analysis scale
  ndwi_crop_median: number | null; // crop-water NDWI, 20 m
  ndwi_crop_p10: number | null;
  ndwi_crop_p90: number | null;
  ndwi_water_median: number | null; // open-water NDWI, native 10 m
  crop_fraction: number | null;
  baseline_n: number;
  ndvi_baseline: number | null; // 20 m
  ndwi_baseline: number | null; // 20 m
  ndvi_spread: number | null;
  ndwi_spread: number | null;
  ndvi_delta: number | null; // 20 m
  ndwi_delta: number | null; // 20 m
  ndvi_anomaly: number | null;
  ndwi_anomaly: number | null;
  rain_mm_21d: number | null;
  et0_mm_21d: number | null;
  rain_deficit: number | null;
  water_stress_score: number | null;
  dominant_class: number;
  stressed_fraction: number | null;
  class_fractions: number[];
  method_version: string;
  resolution: ResolutionMeta | null;
};

export type GridBase = { x0: number; y0: number; w: number; h: number; res: number; bounds: [[number, number], [number, number]] };

/** Map layers, each on the grid it was computed on. Values ×1000, null = no data. */
export type Grid = {
  epsg: number;
  resolution: ResolutionMeta;
  grid10: GridBase & { inside: number[]; ndvi: (number | null)[]; ndwi_water: (number | null)[] };
  grid20: GridBase & { cls: number[]; ndwi_crop: (number | null)[]; ndvi: (number | null)[] };
};

// ------------------------------------------------------------------ classes

/** The joint crop-health and water-stress classes (20 m cells), with map colours in the Shamba palette. */
export const CLASSES: { code: number; label: string; short: string; color: string }[] = [
  { code: 0, label: 'No clear view (cloud or haze)', short: 'No data', color: '#B9BDB8' },
  { code: 1, label: 'Bare soil or not crop', short: 'Bare', color: '#CDBB9A' },
  { code: 2, label: 'Normal for this field', short: 'Normal', color: '#2E6A4F' },
  { code: 3, label: 'Possible mild water stress', short: 'Mild water stress', color: '#D9A93A' },
  { code: 4, label: 'Possible severe water stress', short: 'Water stress', color: '#A8472A' },
  { code: 5, label: 'Strong decline, water normal: possible pest, disease or nutrient problem', short: 'Decline', color: '#3E4C6E' },
  { code: 6, label: 'Some decline: possible pest, disease, nutrient or physical damage', short: 'Some decline', color: '#7D8DB3' },
  { code: 7, label: 'Open water or flooding', short: 'Water', color: '#3D7EA6' },
  { code: 8, label: 'Recovering', short: 'Recovering', color: '#8FC2A5' },
];
export const classMeta = (c: number) => CLASSES[c] ?? CLASSES[0];
export const STRESS = new Set([3, 4, 5, 6]);

// ------------------------------------------------------------------ geometry

const A = 6378137.0, F = 1 / 298.257223563, K0 = 0.9996, E2 = F * (2 - F), EP2 = E2 / (1 - E2);
const rad = (d: number) => (d * Math.PI) / 180;

/** WGS84 → UTM in a given EPSG zone (same formulas as the server). */
export function toUtm(lat: number, lng: number, epsg: number): [number, number] {
  const zone = epsg % 100, south = Math.floor(epsg / 100) === 327;
  const phi = rad(lat), lam0 = rad((zone - 1) * 6 - 180 + 3);
  const n = A / Math.sqrt(1 - E2 * Math.sin(phi) ** 2);
  const t = Math.tan(phi) ** 2, c = EP2 * Math.cos(phi) ** 2, a = Math.cos(phi) * (rad(lng) - lam0);
  const e4 = E2 * E2, e6 = e4 * E2;
  const m = A * ((1 - E2 / 4 - (3 * e4) / 64 - (5 * e6) / 256) * phi - ((3 * E2) / 8 + (3 * e4) / 32 + (45 * e6) / 1024) * Math.sin(2 * phi) +
    ((15 * e4) / 256 + (45 * e6) / 1024) * Math.sin(4 * phi) - ((35 * e6) / 3072) * Math.sin(6 * phi));
  const x = K0 * n * (a + ((1 - t + c) * a ** 3) / 6 + ((5 - 18 * t + t * t + 72 * c - 58 * EP2) * a ** 5) / 120) + 500000;
  let y = K0 * (m + n * Math.tan(phi) * (a * a / 2 + ((5 - t + 9 * c + 4 * c * c) * a ** 4) / 24 + ((61 - 58 * t + t * t + 600 * c - 330 * EP2) * a ** 6) / 720));
  if (south) y += 10000000;
  return [x, y];
}

/** UTM → WGS84 [lat, lng]. */
export function fromUtm(x: number, y: number, epsg: number): [number, number] {
  const zone = epsg % 100, south = Math.floor(epsg / 100) === 327;
  const lam0 = rad((zone - 1) * 6 - 180 + 3);
  const m = (south ? y - 10000000 : y) / K0;
  const mu = m / (A * (1 - E2 / 4 - (3 * E2 * E2) / 64 - (5 * E2 ** 3) / 256));
  const e1 = (1 - Math.sqrt(1 - E2)) / (1 + Math.sqrt(1 - E2));
  const p1 = mu + ((3 * e1) / 2 - (27 * e1 ** 3) / 32) * Math.sin(2 * mu) + ((21 * e1 * e1) / 16 - (55 * e1 ** 4) / 32) * Math.sin(4 * mu) +
    ((151 * e1 ** 3) / 96) * Math.sin(6 * mu) + ((1097 * e1 ** 4) / 512) * Math.sin(8 * mu);
  const n1 = A / Math.sqrt(1 - E2 * Math.sin(p1) ** 2), t1 = Math.tan(p1) ** 2, c1 = EP2 * Math.cos(p1) ** 2;
  const r1 = (A * (1 - E2)) / (1 - E2 * Math.sin(p1) ** 2) ** 1.5, d = (x - 500000) / (n1 * K0);
  const lat = p1 - ((n1 * Math.tan(p1)) / r1) * (d * d / 2 - ((5 + 3 * t1 + 10 * c1 - 4 * c1 * c1 - 9 * EP2) * d ** 4) / 24 +
    ((61 + 90 * t1 + 298 * c1 + 45 * t1 * t1 - 252 * EP2 - 3 * c1 * c1) * d ** 6) / 720);
  const lng = lam0 + (d - ((1 + 2 * t1 + c1) * d ** 3) / 6 + ((5 - 2 * c1 + 28 * t1 - 3 * c1 * c1 + 8 * EP2 + 24 * t1 * t1) * d ** 5) / 120) / Math.cos(p1);
  return [(lat * 180) / Math.PI, (lng * 180) / Math.PI];
}

// ------------------------------------------------------------------ exports

const num = (v: number | null | undefined, d = 3) => (v === null || v === undefined ? '' : v.toFixed(d));

/** CSV of every date. Column names carry the resolution; '#' lines carry the full metadata. */
export function toCsv(obs: Observation[], fieldName: string): string {
  const meta = obs.find((o) => o.resolution)?.resolution ?? RESOLUTION;
  const head = [
    `# Tassel Sentinel-2 export — ${fieldName.replace(/[\r\n]/g, ' ')}`,
    `# method ${meta.method_version}; analysis grid ${meta.analysis_grid_m} m; display grid ${meta.display_grid_m} m`,
    ...(['NDVI', 'NDWI_CROP', 'JOINT_MASK', 'NDWI_WATER', 'WATER_STRESS_SCORE'] as ProductId[]).map((id) => {
      const p = meta.products[id] ?? RESOLUTION.products[id];
      return `# ${id}: ${p.label}, bands ${p.bands.join('+')}, effective resolution ${p.effective_resolution_m} m`;
    }),
    `# ${meta.statement}`,
    `# ${meta.counts_note}`,
  ];
  const cols = 'field,date,quality,clear_20m_cells_pct,ndvi_10m_median,ndvi_20m_median,ndwi_crop_20m_median,ndwi_water_10m_median,' +
    'ndvi_20m_baseline,ndwi_crop_20m_baseline,ndvi_20m_delta,ndwi_crop_20m_delta,water_stress_score_20m,rain_mm_21d,et0_mm_21d,' +
    'joint_mask_20m_class,suspect_haze,scene,method';
  const rows = obs.map((o) => [
    `"${fieldName.replace(/"/g, '""')}"`, o.observed_at.slice(0, 10), o.quality, num(o.valid_pct, 0), num(o.ndvi_median), num(o.ndvi20_median),
    num(o.ndwi_crop_median), num(o.ndwi_water_median), num(o.ndvi_baseline), num(o.ndwi_baseline), num(o.ndvi_delta), num(o.ndwi_delta),
    num(o.water_stress_score, 2), num(o.rain_mm_21d, 0), num(o.et0_mm_21d, 0), classMeta(o.dominant_class).short, o.suspect ? 'yes' : 'no', o.scene_id, o.method_version,
  ].join(','));
  return [...head, cols, ...rows].join('\n');
}

function square(x0: number, y0: number, size: number, epsg: number): number[][] {
  return [[x0, y0], [x0 + size, y0], [x0 + size, y0 - size], [x0, y0 - size], [x0, y0]].map(([x, y]) => {
    const [la, lo] = fromUtm(x, y, epsg);
    return [Math.round(lo * 1e7) / 1e7, Math.round(la * 1e7) / 1e7];
  });
}

/**
 * GeoJSON of one date: 20 m squares for the joint mask and crop-water NDWI, 10 m squares
 * for NDVI and open-water NDWI. Every feature states its product and effective resolution.
 */
export function toGeoJson(grid: Grid, obs: Observation, fieldName: string): string {
  const meta = grid.resolution ?? obs.resolution ?? RESOLUTION;
  const features: unknown[] = [];
  const g20 = grid.grid20;
  for (let r = 0; r < g20.h; r++) {
    for (let c = 0; c < g20.w; c++) {
      const i = r * g20.w + c;
      if (g20.cls[i] === 255) continue;
      features.push({
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [square(g20.x0 + c * 20, g20.y0 - r * 20, g20.res, grid.epsg)] },
        properties: {
          layer: 'analysis_20m', cell_size_m: g20.res,
          joint_mask_class_code: g20.cls[i], joint_mask_class: classMeta(g20.cls[i]).short,
          joint_mask_effective_resolution_m: meta.products.JOINT_MASK.effective_resolution_m,
          ndwi_crop: g20.ndwi_crop[i] === null ? null : g20.ndwi_crop[i]! / 1000,
          ndwi_crop_effective_resolution_m: meta.products.NDWI_CROP.effective_resolution_m,
          ndvi_20m: g20.ndvi[i] === null ? null : g20.ndvi[i]! / 1000,
        },
      });
    }
  }
  const g10 = grid.grid10;
  for (let r = 0; r < g10.h; r++) {
    for (let c = 0; c < g10.w; c++) {
      const i = r * g10.w + c;
      if (!g10.inside[i]) continue;
      features.push({
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [square(g10.x0 + c * 10, g10.y0 - r * 10, g10.res, grid.epsg)] },
        properties: {
          layer: 'native_10m', cell_size_m: g10.res,
          ndvi: g10.ndvi[i] === null ? null : g10.ndvi[i]! / 1000,
          ndvi_effective_resolution_m: meta.products.NDVI.effective_resolution_m,
          ndwi_water: g10.ndwi_water[i] === null ? null : g10.ndwi_water[i]! / 1000,
          ndwi_water_effective_resolution_m: meta.products.NDWI_WATER.effective_resolution_m,
        },
      });
    }
  }
  return JSON.stringify({
    type: 'FeatureCollection',
    name: `${fieldName} ${obs.observed_at.slice(0, 10)}`,
    properties: { source: 'ESA Copernicus Sentinel-2 L2A via Earth Search', quality: obs.quality, resolution: meta },
    features,
  });
}
