// Tassel — location, field geometry and nearby agro-dealers.

import * as Location from 'expo-location';
import type { LatLng } from './data';

export type Coords = { lat: number; lng: number };

/** Returns the phone's position, or null if refused/unavailable.
 * With ask=false it never shows the permission prompt (for screens that load automatically). */
export async function getPosition(ask = true): Promise<Coords | null> {
  const { status } = ask ? await Location.requestForegroundPermissionsAsync() : await Location.getForegroundPermissionsAsync();
  if (status !== 'granted') return null;
  try {
    const last = await Location.getLastKnownPositionAsync({ maxAge: 10 * 60 * 1000 });
    if (last) return { lat: last.coords.latitude, lng: last.coords.longitude };
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    return null;
  }
}

const R = 6378137; // WGS84 radius, metres
const rad = (d: number) => (d * Math.PI) / 180;

/** Area of a lat/lng polygon in square metres (spherical excess method, as used by Leaflet/Turf). */
export function polygonAreaM2(points: LatLng[]): number {
  if (points.length < 3) return 0;
  let total = 0;
  for (let i = 0; i < points.length; i++) {
    const [lat1, lng1] = points[i];
    const [lat2, lng2] = points[(i + 1) % points.length];
    total += rad(lng2 - lng1) * (2 + Math.sin(rad(lat1)) + Math.sin(rad(lat2)));
  }
  return Math.abs((total * R * R) / 2);
}

export const M2_PER_ACRE = 4046.8564224;
export function polygonAcres(points: LatLng[]): number {
  return polygonAreaM2(points) / M2_PER_ACRE;
}

export function centroid(points: LatLng[]): Coords | null {
  if (!points.length) return null;
  const lat = points.reduce((s, p) => s + p[0], 0) / points.length;
  const lng = points.reduce((s, p) => s + p[1], 0) / points.length;
  return { lat, lng };
}

export function distanceKm(a: Coords, b: Coords): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return (2 * R * Math.asin(Math.sqrt(h))) / 1000;
}

export type Agrovet = { id: string; name: string; lat: number; lng: number; distanceKm: number; phone?: string; address?: string };

/** Agro-dealers mapped on OpenStreetMap near a point (no API key). */
export async function findAgrovets(at: Coords, radiusKm = 15): Promise<Agrovet[]> {
  const r = Math.round(radiusKm * 1000);
  const around = `(around:${r},${at.lat},${at.lng})`;
  const query =
    `[out:json][timeout:20];(` +
    `node["shop"="agrarian"]${around};way["shop"="agrarian"]${around};` +
    `node["name"~"agrovet|agro vet|agro-vet|farm inputs|agrochemical",i]${around};` +
    `way["name"~"agrovet|agro vet|agro-vet",i]${around};` +
    `);out center 40;`;
  let places: Agrovet[] = [];
  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Tassel/2.4 (KSEF 2027 student project)' },
      body: 'data=' + encodeURIComponent(query),
    });
    if (res.ok) {
      const j = (await res.json()) as { elements: { id: number; type: string; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }[] };
      places = j.elements
        .map((e) => {
          const lat = e.lat ?? e.center?.lat;
          const lng = e.lon ?? e.center?.lon;
          if (lat == null || lng == null) return null;
          const t = e.tags ?? {};
          return {
            id: `${e.type}-${e.id}`,
            name: t.name || 'Agro-dealer',
            lat,
            lng,
            distanceKm: distanceKm(at, { lat, lng }),
            phone: t.phone || t['contact:phone'],
            address: [t['addr:street'], t['addr:city'] || t['addr:place']].filter(Boolean).join(', ') || undefined,
          } as Agrovet;
        })
        .filter((p): p is Agrovet => p !== null);
    }
  } catch {
    // fall through to Nominatim
  }
  if (!places.length) {
    const d = radiusKm / 111;
    const url =
      'https://nominatim.openstreetmap.org/search?q=agrovet&format=json&limit=8&countrycodes=ke&bounded=1' +
      `&viewbox=${at.lng - d},${at.lat + d},${at.lng + d},${at.lat - d}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Tassel/2.4 (KSEF 2027 student project)' } });
    if (res.ok) {
      const j = (await res.json()) as { place_id: number; name?: string; display_name: string; lat: string; lon: string }[];
      places = j.map((p) => ({
        id: String(p.place_id),
        name: p.name || p.display_name.split(',')[0],
        lat: Number(p.lat),
        lng: Number(p.lon),
        distanceKm: distanceKm(at, { lat: Number(p.lat), lng: Number(p.lon) }),
        address: p.display_name.split(',').slice(1, 3).join(',').trim(),
      }));
    }
  }
  const seen = new Set<string>();
  return places
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .filter((p) => {
      const key = `${p.name.toLowerCase()}|${p.lat.toFixed(3)}|${p.lng.toFixed(3)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 8);
}

export function mapsUrl(lat: number, lng: number, name: string): string {
  return `geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(name)})`;
}
