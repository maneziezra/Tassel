// Tassel — the farmer's field drawn from its satellite grid (pure: no React
// Native imports, so it can be tested with `node --experimental-strip-types`).
//
// Used by the Home hero. Each square is one real Sentinel-2 cell of the field
// (10 m NDVI; 20 m for very large fields so the phone stays fast), coloured on
// the same ramp as the Field Health screen. Stress outlines come from the 20 m
// joint mask (classes 3–6), never from the 10 m layer (resolution rule).

import { STRESS, toUtm, type Grid } from './satelliteCore';

export function mix(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return '#' + pa.map((v, i) => Math.round(v + (pb[i] - v) * Math.min(1, Math.max(0, t))).toString(16).padStart(2, '0')).join('');
}

/** NDVI → colour: bare (cream) through sparse (sage) to dense green. Same ramp as app/satellite/[id].tsx. */
export const ndviColor = (v: number) => (v < 0.45 ? mix('#E9DFC9', '#9DB77C', (v - 0.05) / 0.4) : mix('#9DB77C', '#1F4D39', (v - 0.45) / 0.4));

/** WGS84 UTM zone EPSG code for a point (326xx north, 327xx south). */
export function utmEpsg(lat: number, lng: number): number {
  const zone = Math.min(60, Math.max(1, Math.floor((lng + 180) / 6) + 1));
  return (lat < 0 ? 32700 : 32600) + zone;
}

export type FieldCell = { x: number; y: number; s: number; color: string; noData: boolean };
export type FieldArt = {
  width: number;
  height: number;
  /** Boundary in screen px (empty when the field has no drawn boundary). */
  outline: [number, number][];
  cells: FieldCell[];
  /** 20 m cells flagged as possible stress. */
  stress: { x: number; y: number; s: number }[];
  /** Metres per square of the drawn layer. */
  res: number | null;
};

/** Above this many 10 m cells the hero draws the 20 m layer instead. */
export const MAX_HERO_CELLS = 1500;

/**
 * Lays the field out in a box of `boxW`×`boxH` px. Works with a boundary only
 * (first satellite check still running), a grid only, or both. Null when there
 * is nothing to draw.
 */
export function layoutField(polygon: [number, number][] | null | undefined, grid: Grid | null | undefined, boxW: number, boxH: number, pad = 10): FieldArt | null {
  const ring0 = polygon && polygon.length >= 3 ? polygon : null;
  if (!ring0 && !grid) return null;
  const epsg = grid?.epsg ?? utmEpsg(ring0![0][0], ring0![0][1]);
  const ring = ring0 ? ring0.map(([la, lo]) => toUtm(la, lo, epsg)) : [];

  const use20 = !!grid && grid.grid10.inside.reduce((n, v) => n + v, 0) > MAX_HERO_CELLS;
  const g = grid ? (use20 ? grid.grid20 : grid.grid10) : null;
  const inField = (i: number) => (use20 ? grid!.grid20.cls[i] !== 255 : grid!.grid10.inside[i] === 1);

  // Extent in UTM metres: the boundary, else the grid's in-field cells.
  let xs: number[] = ring.map((p) => p[0]);
  let ys: number[] = ring.map((p) => p[1]);
  if (!xs.length && g) {
    for (let r = 0; r < g.h; r++)
      for (let c = 0; c < g.w; c++)
        if (inField(r * g.w + c)) {
          xs.push(g.x0 + c * g.res, g.x0 + (c + 1) * g.res);
          ys.push(g.y0 - r * g.res, g.y0 - (r + 1) * g.res);
        }
  }
  if (!xs.length) return null;
  const margin = 6; // metres around the field
  const fx0 = Math.min(...xs) - margin, fx1 = Math.max(...xs) + margin;
  const fy0 = Math.max(...ys) + margin, fy1 = Math.min(...ys) - margin;
  const k = Math.min((boxW - pad * 2) / (fx1 - fx0), (boxH - pad * 2) / (fy0 - fy1));
  const width = (fx1 - fx0) * k + pad * 2;
  const height = (fy0 - fy1) * k + pad * 2;
  const ox = (boxW - width) / 2 + pad, oy = (boxH - height) / 2 + pad;
  const px = (x: number) => ox + (x - fx0) * k;
  const py = (y: number) => oy + (fy0 - y) * k;

  const cells: FieldCell[] = [];
  const stress: FieldArt['stress'] = [];
  if (grid && g) {
    const vals = use20 ? grid.grid20.ndvi : grid.grid10.ndvi;
    for (let r = 0; r < g.h; r++)
      for (let c = 0; c < g.w; c++) {
        const i = r * g.w + c;
        if (!inField(i)) continue;
        const v = vals[i];
        cells.push({ x: px(g.x0 + c * g.res), y: py(g.y0 - r * g.res), s: g.res * k, color: v === null ? '#B9BDB8' : ndviColor(v / 1000), noData: v === null });
      }
    const g20 = grid.grid20;
    for (let r = 0; r < g20.h; r++)
      for (let c = 0; c < g20.w; c++) {
        const cls = g20.cls[r * g20.w + c];
        if (STRESS.has(cls)) stress.push({ x: px(g20.x0 + c * g20.res), y: py(g20.y0 - r * g20.res), s: g20.res * k });
      }
  }
  return { width: boxW, height: boxH, outline: ring.map(([x, y]) => [px(x), py(y)]), cells, stress, res: g ? g.res : null };
}
