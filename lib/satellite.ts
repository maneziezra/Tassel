// CropGuard AI — crop health from space (Sentinel-2 NDVI + NDWI).
//
// The satellite-health Edge Function reads free ESA Sentinel-2 images of the
// field (10 m pixels; the water reading uses the 20 m SWIR band), masks cloud,
// cloud shadow and haze, and compares each clear date with the field's own
// recent normal. This file loads those results (owner-only tables) and turns
// them into plain advice. The rule throughout: satellite readings show WHERE
// to look. They never diagnose; the farmer confirms on the ground.

import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { ensureSession } from './session';
import { tr } from './i18n';

export type Quality = 'excellent' | 'good' | 'limited' | 'unusable';

export type Observation = {
  id: number;
  farm_id: string;
  scene_id: string;
  observed_at: string;
  scene_cloud_pct: number | null;
  total_px: number;
  valid_px: number;
  haze_px: number;
  valid_pct: number;
  quality: Quality;
  suspect: boolean;
  ndvi_median: number | null;
  ndvi_p10: number | null;
  ndvi_p90: number | null;
  ndwi_crop_median: number | null;
  ndwi_crop_p10: number | null;
  ndwi_crop_p90: number | null;
  ndwi_water_median: number | null;
  crop_fraction: number | null;
  baseline_n: number;
  ndvi_baseline: number | null;
  ndwi_baseline: number | null;
  ndvi_spread: number | null;
  ndwi_spread: number | null;
  ndvi_delta: number | null;
  ndwi_delta: number | null;
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
};

export type Grid = {
  w: number;
  h: number;
  res: number;
  epsg: number;
  x0: number;
  y0: number;
  bounds: [[number, number], [number, number]];
  cls: number[]; // 255 = outside the field
  ndvi: (number | null)[]; // ×1000
  ndwi: (number | null)[]; // ×1000
};

export type ZoneStat = {
  observation_id: number;
  zone: string;
  pixels: number;
  valid_pct: number;
  ndvi: number | null;
  ndwi_crop: number | null;
  ndvi_delta: number | null;
  ndwi_delta: number | null;
  class_code: number;
  stressed_fraction: number | null;
  water_stress_score: number | null;
};

export type Condition =
  | 'healthy' | 'wilting_dry' | 'pests' | 'disease' | 'yellowing' | 'waterlogged' | 'weeds' | 'damaged' | 'harvested' | 'bare' | 'other';

export type Validation = {
  id: number;
  farm_id: string;
  observation_id: number | null;
  zone: string | null;
  predicted_class: number | null;
  observed_on: string;
  observed_condition: Condition;
  soil_moisture: 'dry' | 'moist' | 'wet' | null;
  irrigated: boolean | null;
  farmer_notes: string | null;
  follow_up_due: string | null;
  outcome: 'better' | 'same' | 'worse' | null;
  outcome_on: string | null;
  created_at: string;
};

// ------------------------------------------------------------------ classes

/** The joint crop-health and water-stress classes, with map colours in the Shamba palette. */
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

export const ZONE_NAMES: Record<string, string> = {
  ALL: 'the whole field', N: 'the north end', S: 'the south end', E: 'the east side', W: 'the west side', C: 'the centre',
  NE: 'the north-east corner', NW: 'the north-west corner', SE: 'the south-east corner', SW: 'the south-west corner',
};
export const zoneName = (z: string | null | undefined) => tr(ZONE_NAMES[z ?? 'ALL'] ?? 'the whole field');

export const QUALITY_META: Record<Quality, { label: string; color: string; note: string }> = {
  excellent: { label: 'Excellent', color: '#2E6A4F', note: 'Clear image of the whole field.' },
  good: { label: 'Good', color: '#2E6A4F', note: 'Clear image of most of the field.' },
  limited: { label: 'Limited', color: '#7A5A14', note: 'Cloud, haze or the small field size limit this image. No strong alerts.' },
  unusable: { label: 'Unusable', color: '#7A867F', note: 'Clouds covered the field. Nothing can be concluded from this date.' },
};

// ------------------------------------------------------------------ loading

const OBS_COLS =
  'id, farm_id, scene_id, observed_at, scene_cloud_pct, total_px, valid_px, haze_px, valid_pct, quality, suspect, ' +
  'ndvi_median, ndvi_p10, ndvi_p90, ndwi_crop_median, ndwi_crop_p10, ndwi_crop_p90, ndwi_water_median, crop_fraction, ' +
  'baseline_n, ndvi_baseline, ndwi_baseline, ndvi_spread, ndwi_spread, ndvi_delta, ndwi_delta, ndvi_anomaly, ndwi_anomaly, ' +
  'rain_mm_21d, et0_mm_21d, rain_deficit, water_stress_score, dominant_class, stressed_fraction, class_fractions, method_version';

/** True when the v2.3 database update has not been applied yet. */
let ready = true;
export const satelliteReady = () => ready;
const missing = (e: { message: string; code?: string } | null) =>
  !!e && (/relation .* does not exist|schema cache|could not find/i.test(e.message) || ['42P01', 'PGRST205', 'PGRST202'].includes(e.code ?? ''));

export async function listObservations(farmId: string): Promise<Observation[]> {
  const { data, error } = await supabase.from('satellite_observations').select(OBS_COLS)
    .eq('farm_id', farmId).order('observed_at', { ascending: true });
  if (missing(error)) {
    ready = false;
    return [];
  }
  if (error) throw new Error(tr('Could not load satellite results.'));
  ready = true;
  return (data ?? []) as unknown as Observation[];
}

export async function getGrid(obsId: number): Promise<Grid | null> {
  const { data, error } = await supabase.from('satellite_observations').select('grid').eq('id', obsId).maybeSingle();
  if (error) return null;
  return (data?.grid ?? null) as Grid | null;
}

export async function listZones(obsId: number): Promise<ZoneStat[]> {
  const { data, error } = await supabase.from('satellite_zone_stats').select('*').eq('observation_id', obsId);
  if (error) return [];
  return (data ?? []) as ZoneStat[];
}

/** Latest usable result for each of the farmer's fields (for the home screen). */
export async function latestByFarm(): Promise<Record<string, Pick<Observation, 'farm_id' | 'observed_at' | 'quality' | 'dominant_class' | 'water_stress_score' | 'stressed_fraction' | 'baseline_n'>>> {
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data, error } = await supabase.from('satellite_observations')
    .select('farm_id, observed_at, quality, dominant_class, water_stress_score, stressed_fraction, baseline_n')
    .neq('quality', 'unusable').gte('observed_at', since).order('observed_at', { ascending: false }).limit(200);
  if (error || !data) return {};
  const out: Record<string, never> = {};
  for (const r of data as never[]) {
    const id = (r as { farm_id: string }).farm_id;
    if (!(id in out)) out[id] = r;
  }
  return out;
}

export type RefreshProgress = { done: number; total: number };

/**
 * Ask the server to look for new images and process them. Each call handles a few
 * images (the server has a short CPU limit), so we call again until none are left.
 */
export async function refreshSatellite(farmId: string, onProgress?: (p: RefreshProgress) => void): Promise<{ warning: string | null }> {
  try {
    await ensureSession();
  } catch {
    throw new Error(tr('No internet. Satellite checks need data or Wi-Fi.'));
  }
  let warning: string | null = null;
  for (let round = 0; round < 25; round++) {
    let res;
    try {
      res = await supabase.functions.invoke<{ remaining: number; total: number; processed: number; warning: string | null; error?: string }>(
        'satellite-health', { body: { action: 'refresh', farm_id: farmId } },
      );
    } catch {
      throw new Error(tr('No internet. Satellite checks need data or Wi-Fi.'));
    }
    if (res.error) {
      let message = '';
      let status = 0;
      let code = '';
      let vars: Record<string, string> | null = null;
      if (res.error instanceof FunctionsHttpError) {
        const ctx = res.error.context as Response;
        status = ctx.status;
        try {
          const b = await ctx.json();
          message = b?.error ?? '';
          code = b?.code ?? '';
          vars = b?.vars ?? null;
        } catch {
          // keep default
        }
      }
      if (status === 422 && code === 'size_mismatch' && vars) {
        throw new Error(tr('The drawn boundary is about {a} acres, but the field is saved as {b} acres. Redraw the boundary or fix the size.', vars));
      }
      if (status === 422 && message) throw new Error(tr(message));
      if (status === 404 && message === 'Field not found.') throw new Error(tr('Field not found.'));
      if (status === 429) throw new Error(tr('Too many satellite checks this hour. Try again later.'));
      if (status === 401) throw new Error(tr('Session expired. Restart the app and try again.'));
      throw new Error(tr('The satellite check is not available right now. Try again later.'));
    }
    const d = res.data!;
    warning = d.warning ?? warning;
    onProgress?.({ done: Math.max(0, d.total - d.remaining), total: d.total });
    if (!d.remaining) break;
    if (d.processed === 0 && round > 2) break; // nothing moving: stop rather than loop
  }
  return { warning };
}

// ------------------------------------------------------------------ field checks

export async function listValidations(farmId: string): Promise<Validation[]> {
  const { data, error } = await supabase.from('field_validations').select('*').eq('farm_id', farmId).order('created_at', { ascending: false });
  if (error) return [];
  return (data ?? []) as Validation[];
}

export async function saveValidation(v: {
  farm_id: string;
  observation_id: number | null;
  zone: string | null;
  predicted_class: number | null;
  observed_condition: Condition;
  soil_moisture: 'dry' | 'moist' | 'wet' | null;
  irrigated: boolean | null;
  farmer_notes: string | null;
}): Promise<void> {
  const due = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);
  const { error } = await supabase.from('field_validations').insert({
    ...v,
    farmer_notes: v.farmer_notes?.trim().slice(0, 500) || null,
    follow_up_due: v.observed_condition === 'healthy' ? null : due,
  });
  if (error) throw new Error(tr('Could not save the field check.'));
}

export async function setOutcome(id: number, outcome: 'better' | 'same' | 'worse'): Promise<void> {
  const { error } = await supabase.from('field_validations').update({ outcome, outcome_on: new Date().toISOString().slice(0, 10) }).eq('id', id);
  if (error) throw new Error(tr('Could not save'));
}

// ------------------------------------------------------------------ interpretation

export type Tone = 'normal' | 'watch' | 'act' | 'none';

export type Reading = {
  tone: Tone;
  headline: string;
  body: string;
  action: string | null;
  zone: string | null; // where to look
  latest: Observation | null; // latest usable observation
  lastImage: Observation | null; // latest image of any quality
  canAlert: boolean;
};

const DAY = 86400000;
const daysBetween = (a: string, b: string | number) => Math.round((Date.parse(a) - (typeof b === 'number' ? b : Date.parse(b))) / DAY);

/** Days from planting to harvest, used only to recognise natural drying near harvest. */
function seasonDays(crop: string | null): number {
  const c = (crop ?? '').toLowerCase();
  if (/bean|maharag/.test(c)) return 85;
  if (/potato|viazi/.test(c)) return 110;
  if (/kale|sukuma/.test(c)) return 150;
  if (/cabbage|kabichi/.test(c)) return 100;
  if (/maize|corn|mahindi/.test(c)) return 130;
  return 120;
}

/** Worst zone of an observation (highest water-stress score among stressed zones). */
export function worstZone(zones: ZoneStat[]): ZoneStat | null {
  const z = zones.filter((x) => STRESS.has(x.class_code) || (x.stressed_fraction ?? 0) >= 0.3);
  if (!z.length) return null;
  return [...z].sort((a, b) => (b.water_stress_score ?? 0) - (a.water_stress_score ?? 0) || (b.stressed_fraction ?? 0) - (a.stressed_fraction ?? 0))[0];
}

/**
 * Turn the latest results into one plain-language reading. Follows the decision rules:
 *  - NDVI and crop NDWI both down → possible water stress
 *  - NDWI down, NDVI steady       → early sign of water stress
 *  - NDVI down, NDWI steady       → possible pest, disease, nutrient or physical damage
 *  - both up after stress         → recovering
 *  - poor imagery                 → no conclusion
 * Always "possible", "risk" or "inspect"; never certain.
 */
export function interpret(obs: Observation[], zones: ZoneStat[], crop: string | null, plantingDate: string | null | undefined): Reading {
  const lastImage = obs.length ? obs[obs.length - 1] : null;
  const usable = obs.filter((o) => o.quality !== 'unusable' && !o.suspect);
  const latest = usable.length ? usable[usable.length - 1] : null;
  const base: Omit<Reading, 'tone' | 'headline' | 'body' | 'action'> = { zone: null, latest, lastImage, canAlert: false };

  if (!lastImage) {
    return { ...base, tone: 'none', headline: tr('No satellite images yet'), body: tr('Tap "Check now" to read the last 90 days of Sentinel-2 images of this field.'), action: null };
  }
  if (!latest) {
    return { ...base, tone: 'none', headline: tr('No clear image yet'), body: tr('Clouds covered the field in every image so far. Sentinel-2 passes every 2–3 days, so try again soon.'), action: null };
  }
  const age = daysBetween(new Date().toISOString(), latest.observed_at);
  const ok = latest.quality === 'good' || latest.quality === 'excellent';
  const stale = age > 20;
  const out = { ...base, canAlert: ok && !stale };
  const today = Date.now();
  const sincePlanting = plantingDate ? Math.round((today - Date.parse(plantingDate)) / DAY) : null;
  const wz = worstZone(zones);
  const where = wz ? zoneName(wz.zone) : null;

  if ((latest.crop_fraction ?? 0) < 0.3) {
    if (sincePlanting !== null && sincePlanting >= 0 && sincePlanting < 35) {
      return { ...out, tone: 'normal', headline: tr('Crop not visible from space yet'), body: tr('This is normal for the first 3–5 weeks after planting. Readings start once the leaves cover the soil.'), action: null };
    }
    return {
      ...out, tone: ok ? 'watch' : 'none', headline: tr('Mostly bare soil'),
      body: tr('The satellite sees little green cover in this field.'),
      action: ok ? tr('If a crop is planted, walk the field and check how many seeds came up.') : null,
    };
  }
  if (latest.baseline_n < 3 || latest.ndvi_delta === null || latest.ndwi_delta === null) {
    return {
      ...out, tone: 'none', headline: tr('Crop visible. Learning this field'),
      body: tr('CropGuard compares each image with this field\'s own normal. It needs 3 clear images of the crop first; {n} so far.', { n: Math.min(2, latest.baseline_n + 1) }),
      action: null,
    };
  }

  const dv = latest.ndvi_delta, dw = latest.ndwi_delta;
  const nearHarvest = sincePlanting !== null && sincePlanting > 0.8 * seasonDays(crop);
  const quality = ok ? '' : ` ${tr('Clouds or haze covered part of the field, so treat this as a hint and check the next clear image.')}`;
  const staleNote = stale ? ` ${tr('The last clear image is {n} days old.', { n: age })}` : '';
  const zoneOrField = where ?? zoneName('ALL');

  if (latest.dominant_class === 8 || (dv >= 0.05 && dw >= 0 && obs.slice(-6).some((o) => STRESS.has(o.dominant_class)))) {
    return { ...out, tone: 'normal', zone: null, headline: tr('Recovering'), body: tr('Crop vigour and water content are rising again after a drop.') + staleNote, action: null };
  }
  if (dv < -0.08 && nearHarvest) {
    return { ...out, tone: 'normal', headline: tr('Drying before harvest'), body: tr('Green cover is falling, which is expected this late in the season.') + staleNote, action: null };
  }
  if (dv < -0.08 && dw < -0.1) {
    const severe = (latest.water_stress_score ?? 0) >= 0.5;
    return {
      ...out, tone: ok && !stale ? 'act' : 'watch', zone: wz?.zone ?? 'ALL',
      headline: severe ? tr('Possible water stress') : tr('Possible mild water stress'),
      body: tr('Crop vigour and leaf water both dropped compared with this field\'s normal.') + quality + staleNote,
      action: tr('Inspect {zone} within 24–48 hours: check soil moisture at root depth and look for wilting or rolled leaves.', { zone: zoneOrField }),
    };
  }
  if (dw < -0.1) {
    return {
      ...out, tone: 'watch', zone: wz?.zone ?? 'ALL', headline: tr('Early sign of water stress'),
      body: tr('Leaf water dropped while green cover is still normal. This often comes before visible wilting.') + quality + staleNote,
      action: tr('Check soil moisture in {zone}. If it is dry, plan watering or mulching.', { zone: zoneOrField }),
    };
  }
  if (dv < -0.08) {
    return {
      ...out, tone: ok && !stale ? 'act' : 'watch', zone: wz?.zone ?? 'ALL', headline: tr('Possible pest, disease or nutrient problem'),
      body: tr('Green cover dropped but leaf water looks normal, so dryness is less likely.') + quality + staleNote,
      action: tr('Walk {zone}. Look under leaves for pests and scan any spotted or yellow leaves.', { zone: zoneOrField }),
    };
  }
  if (wz && (latest.stressed_fraction ?? 0) >= 0.2) {
    return {
      ...out, tone: 'watch', zone: wz.zone, headline: tr('Most of the field looks normal'),
      body: tr('{zone} differs from the rest of the field.', { zone: zoneName(wz.zone).replace(/^./, (c) => c.toUpperCase()) }) + quality + staleNote,
      action: tr('Inspect {zone} when you next visit the field.', { zone: zoneName(wz.zone) }),
    };
  }
  return {
    ...out, tone: 'normal', headline: tr('Looks normal'),
    body: tr('Crop vigour and leaf water match this field\'s last {n} clear images.', { n: latest.baseline_n }) + staleNote,
    action: null,
  };
}

// ------------------------------------------------------------------ geometry for drawing and export

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

export function toCsv(obs: Observation[], fieldName: string): string {
  const head = 'field,date,quality,valid_pct,ndvi_median,ndwi_crop_median,ndwi_water_median,ndvi_baseline,ndwi_baseline,ndvi_delta,ndwi_delta,water_stress_score,rain_mm_21d,et0_mm_21d,class,suspect_haze,scene,method';
  const rows = obs.map((o) => [
    `"${fieldName.replace(/"/g, '""')}"`, o.observed_at.slice(0, 10), o.quality, num(o.valid_pct, 0), num(o.ndvi_median), num(o.ndwi_crop_median), num(o.ndwi_water_median),
    num(o.ndvi_baseline), num(o.ndwi_baseline), num(o.ndvi_delta), num(o.ndwi_delta), num(o.water_stress_score, 2), num(o.rain_mm_21d, 0), num(o.et0_mm_21d, 0),
    classMeta(o.dominant_class).short, o.suspect ? 'yes' : 'no', o.scene_id, o.method_version,
  ].join(','));
  return [head, ...rows].join('\n');
}

/** Pixel squares of one date as GeoJSON (class, NDVI, NDWI per 10 m pixel). */
export function toGeoJson(grid: Grid, obs: Observation, fieldName: string): string {
  const features = [];
  for (let r = 0; r < grid.h; r++) {
    for (let c = 0; c < grid.w; c++) {
      const i = r * grid.w + c;
      if (grid.cls[i] === 255) continue;
      const x0 = grid.x0 + c * grid.res, y0 = grid.y0 - r * grid.res;
      const ring = [[x0, y0], [x0 + grid.res, y0], [x0 + grid.res, y0 - grid.res], [x0, y0 - grid.res], [x0, y0]]
        .map(([x, y]) => {
          const [la, lo] = fromUtm(x, y, grid.epsg);
          return [Math.round(lo * 1e7) / 1e7, Math.round(la * 1e7) / 1e7];
        });
      features.push({
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [ring] },
        properties: {
          class_code: grid.cls[i], class: classMeta(grid.cls[i]).short,
          ndvi: grid.ndvi[i] === null ? null : grid.ndvi[i]! / 1000, ndwi_crop: grid.ndwi[i] === null ? null : grid.ndwi[i]! / 1000,
        },
      });
    }
  }
  return JSON.stringify({
    type: 'FeatureCollection',
    name: `${fieldName} ${obs.observed_at.slice(0, 10)}`,
    properties: { source: 'ESA Copernicus Sentinel-2 L2A via Earth Search', method: obs.method_version, quality: obs.quality, note: 'NDWI uses the 20 m SWIR band resampled to 10 m.' },
    features,
  });
}
