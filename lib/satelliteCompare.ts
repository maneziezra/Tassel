// Tassel — "then and now": two satellite dates side by side, and field-change alerts.
// The rules only (no phone APIs; tested in Node).
//
// Both comparisons use the 20 m analysis scale (ndvi20_median, ndwi_crop_median), the same scale
// as the chart and the stress mask (resolution rule). A difference only counts as a change when it
// passes the thresholds interpret() already uses for a real drop (lib/satellite.ts): 0.08 for green
// cover, 0.10 for leaf water. Smaller differences are "about the same": image-to-image noise.
// These are starting values that field checks will calibrate. A change is a reason to look,
// never a diagnosis.

import type { Observation } from './satelliteCore';

export const GREEN_MIN = 0.08;
export const WATER_MIN = 0.1;

export type Change = 'up' | 'down' | 'same' | 'unknown';

export function change(earlier: number | null | undefined, later: number | null | undefined, min: number): Change {
  if (earlier === null || earlier === undefined || later === null || later === undefined) return 'unknown';
  const d = later - earlier;
  return d >= min ? 'up' : d <= -min ? 'down' : 'same';
}

type Dated = Pick<Observation, 'observed_at' | 'ndvi20_median' | 'ndwi_crop_median'>;

export function compareDates(earlier: Dated, later: Dated): { green: Change; water: Change; days: number } {
  return {
    green: change(earlier.ndvi20_median, later.ndvi20_median, GREEN_MIN),
    water: change(earlier.ndwi_crop_median, later.ndwi_crop_median, WATER_MIN),
    days: Math.round((Date.parse(later.observed_at) - Date.parse(earlier.observed_at)) / 86400000),
  };
}

type Pickable = Pick<Observation, 'id' | 'observed_at' | 'quality' | 'suspect'>;

/** Clear dates before the chosen one (cloudy and hazy dates cannot be compared). */
export function earlierClear<T extends Pickable>(obs: T[], sel: Pickable): T[] {
  return obs.filter((o) => o.quality !== 'unusable' && !o.suspect && o.observed_at < sel.observed_at);
}

/** The clear date closest to `targetDays` before the chosen one (about three weeks: enough for a crop to change). */
export function pickEarlier<T extends Pickable>(obs: T[], sel: Pickable, targetDays = 21): T | null {
  const want = Date.parse(sel.observed_at) - targetDays * 86400000;
  let best: T | null = null;
  for (const o of earlierClear(obs, sel)) {
    if (!best || Math.abs(Date.parse(o.observed_at) - want) < Math.abs(Date.parse(best.observed_at) - want)) best = o;
  }
  return best;
}

// ------------------------------------------------------------------ change alerts

export const FIELD_CHECK_EVERY_MS = 20 * 3600 * 1000; // at most about once a day
export const MAX_FIELDS_PER_CHECK = 6;

export function dueFieldCheck(last: number | null, now: number): boolean {
  return last === null || now - last >= FIELD_CHECK_EVERY_MS || now < last;
}

export type AlertReading = { tone: string; canAlert: boolean; headline: string; action: string | null; latestId: number | null };

/**
 * One notification per satellite image, and only for the strongest reading: a clear, recent image
 * ("canAlert") whose tone is "act". "Watch" readings stay on the Home screen: no crying wolf.
 */
export function fieldAlert(farmId: string, farmName: string, r: AlertReading): { key: string; title: string; body: string } | null {
  if (!r.canAlert || r.tone !== 'act' || r.latestId === null) return null;
  return { key: `sat:${farmId}:${r.latestId}`, title: `${farmName}: ${r.headline}`, body: r.action ?? '' };
}
