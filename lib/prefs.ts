// Personal touches a farmer can set on their phone: how they appear (avatar
// crop and tone), the name of their farm, and whether they think in acres or
// hectares. Kept on this phone (AsyncStorage) — nothing here identifies them.

import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { tr } from './i18n';

export type Units = 'acres' | 'hectares';
export type Prefs = {
  avatarCrop: string | null; // a crop illustration instead of initials
  avatarTone: string; // disc colour behind the avatar
  farmName: string;
  units: Units;
};

/** Avatar discs: soft, earthy, same lightness — none shouts. */
export const AVATAR_TONES = ['#E3EDE6', '#F1EEE6', '#F3E7D3', '#E8E4F0', '#E4ECEF', '#F4E3DE'];

const KEY = 'prefs:v1';
const DEFAULTS: Prefs = { avatarCrop: null, avatarTone: AVATAR_TONES[0], farmName: '', units: 'acres' };

let current: Prefs = DEFAULTS;
let loaded = false;
const listeners = new Set<(p: Prefs) => void>();

export async function loadPrefs(): Promise<Prefs> {
  if (loaded) return current;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) current = { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Prefs>) };
  } catch {
    // first run or storage unavailable
  }
  loaded = true;
  listeners.forEach((l) => l(current));
  return current;
}

export async function setPrefs(patch: Partial<Prefs>): Promise<void> {
  current = { ...current, ...patch };
  listeners.forEach((l) => l(current));
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    // non-critical
  }
}

export function usePrefs(): Prefs {
  const [p, setP] = useState<Prefs>(current);
  useEffect(() => {
    listeners.add(setP);
    loadPrefs().then(setP);
    return () => {
      listeners.delete(setP);
    };
  }, []);
  return p;
}

const HA_PER_ACRE = 0.404686;

/** Area in the farmer's unit, e.g. "1.2 acres" or "0.49 ha". */
export function fmtArea(acres: number, units: Units, digits = 2): string {
  const v = units === 'hectares' ? acres * HA_PER_ACRE : acres;
  const n = Number(v.toFixed(digits));
  if (units === 'hectares') return tr('{n} ha', { n });
  return n === 1 ? tr('1 acre') : tr('{n} acres', { n }); // "1 acres" showed on the fertiliser list
}

export const toAcres = (v: number, units: Units) => (units === 'hectares' ? v / HA_PER_ACRE : v);
export const fromAcres = (acres: number, units: Units) => (units === 'hectares' ? acres * HA_PER_ACRE : acres);
