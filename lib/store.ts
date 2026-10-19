// Tassel — small on-device storage helpers (AsyncStorage).

import AsyncStorage from '@react-native-async-storage/async-storage';

async function getJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function setJSON(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or unavailable — non-critical
  }
}

/** Ticked tasks of a treatment plan, kept per disease (and per saved scan if given). */
export function planKey(label: string, incidentId?: string) {
  return `plan:${label}:${incidentId ?? 'latest'}`;
}
export const loadPlanProgress = (key: string) => getJSON<string[]>(key, []);
export const savePlanProgress = (key: string, done: string[]) => setJSON(key, done);

/** Last weather fetch, so the Home screen still shows something offline. */
export const loadCached = <T,>(key: string) => getJSON<T | null>(`cache:${key}`, null);
export const saveCached = (key: string, value: unknown) => setJSON(`cache:${key}`, value);
