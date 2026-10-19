// Tassel — English / Kiswahili.
//
// Strings are written in English in the code and looked up in the Kiswahili
// dictionary (lib/sw.ts). Anything missing falls back to English, so a new
// screen never shows a blank. The chosen language is kept on the phone.
// Placeholders use {name}: tr('{n} fields', { n: 3 }).

import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SW } from './sw';

export type Lang = 'en' | 'sw';
const KEY = 'lang';

let current: Lang = 'en';
const listeners = new Set<(l: Lang) => void>();

function fill(text: string, vars?: Record<string, string | number>): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

/** Translate outside React (alerts, notifications, helpers). */
export function tr(text: string, vars?: Record<string, string | number>, lang: Lang = current): string {
  if (lang === 'sw') {
    // Own keys only: a farmer's text such as "constructor" must not hit Object.prototype.
    const own = (k: string) => (Object.prototype.hasOwnProperty.call(SW, k) ? SW[k] : undefined);
    const hit = own(text);
    if (hit !== undefined) return fill(hit, vars);
    // Keep surrounding spaces of JSX fragments like "Hello " → "Habari "
    const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(text);
    const inner = m && m[2] !== text ? own(m[2]) : undefined;
    if (m && inner !== undefined) return m[1] + fill(inner, vars) + m[3];
  }
  return fill(text, vars);
}

export function getLang(): Lang {
  return current;
}

export async function setLang(l: Lang): Promise<void> {
  current = l;
  listeners.forEach((f) => f(l));
  try {
    await AsyncStorage.setItem(KEY, l);
  } catch {
    // non-critical
  }
}

/** Load the saved language; on first run, follow the phone's language. */
export async function loadLang(): Promise<Lang> {
  try {
    const saved = await AsyncStorage.getItem(KEY);
    if (saved === 'en' || saved === 'sw') {
      current = saved;
      return current;
    }
  } catch {
    // ignore
  }
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale ?? '';
    if (locale.toLowerCase().startsWith('sw')) current = 'sw';
  } catch {
    // Intl unavailable — stay on English
  }
  return current;
}

/** React hook: current language, a translate function bound to it, and a setter. */
export function useLang() {
  const [lang, setState] = useState<Lang>(current);
  useEffect(() => {
    const f = (l: Lang) => setState(l);
    listeners.add(f);
    setState(current);
    return () => {
      listeners.delete(f);
    };
  }, []);
  const t = useCallback((text: string, vars?: Record<string, string | number>) => tr(text, vars, lang), [lang]);
  return { lang, t, setLang };
}

/** Locale for dates and numbers. */
export function locale(lang: Lang = current): string {
  return lang === 'sw' ? 'sw-KE' : 'en-KE';
}
