// Tassel — the real aerial picture under a field's satellite squares (no phone APIs; tested in Node).
//
// The squares are Sentinel-2 readings (10 m or 20 m): they show health, not what the field looks like.
// Under them we draw the same aerial imagery the field map uses (Esri World Imagery), so a farmer
// recognises their own shamba: the path, the trees, the neighbour's roof.
//
// Honesty: the aerial picture can be several years old. It is a backdrop, never a reading.
// The frame is the UTM box the squares are drawn in. Kenya lies on the equator, where UTM grid
// north and true north differ by well under one degree, so the box is treated as north-up.

export const AERIAL = {
  maxZoom: 18, // the same native zoom the field map uses
  minZoom: 12,
  credit: 'Imagery © Esri, Maxar, Earthstar Geographics',
  url: (z: number, x: number, y: number) => `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`,
};

export type LatLng = { lat: number; lng: number };
export type Tile = { key: string; uri: string; left: number; top: number; width: number; height: number };

/** Web Mercator tile coordinates (fractional) at zoom z. */
export const mercX = (lng: number, z: number) => ((lng + 180) / 360) * 2 ** z;
export const mercY = (lat: number, z: number) => {
  const r = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z;
};

/**
 * The tiles that cover a north-up box (nw to se), placed in a W x H screen frame.
 * Picks the sharpest zoom that needs at most maxTiles images (a farmer's data matters).
 */
export function aerialTiles(nw: LatLng, se: LatLng, W: number, H: number, maxTiles = 9): { z: number; tiles: Tile[] } | null {
  if (!(W > 0 && H > 0) || !(se.lng > nw.lng) || !(nw.lat > se.lat)) return null;
  if (Math.abs(nw.lat) > 85 || Math.abs(se.lat) > 85) return null;
  for (let z = AERIAL.maxZoom; z >= AERIAL.minZoom; z--) {
    const x0 = mercX(nw.lng, z), x1 = mercX(se.lng, z), y0 = mercY(nw.lat, z), y1 = mercY(se.lat, z);
    const tx0 = Math.floor(x0), tx1 = Math.floor(x1), ty0 = Math.floor(y0), ty1 = Math.floor(y1);
    if ((tx1 - tx0 + 1) * (ty1 - ty0 + 1) > maxTiles) continue;
    const sx = W / (x1 - x0), sy = H / (y1 - y0); // screen px per tile
    const tiles: Tile[] = [];
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        tiles.push({ key: `${z}/${tx}/${ty}`, uri: AERIAL.url(z, tx, ty), left: (tx - x0) * sx, top: (ty - y0) * sy, width: sx, height: sy });
      }
    }
    return { z, tiles };
  }
  return null;
}
