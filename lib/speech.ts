// CropGuard AI — read advice aloud with the phone's own text-to-speech
// (works offline once a voice is installed). Kiswahili uses a Swahili voice
// when the phone has one.

import * as Speech from 'expo-speech';
import { getLang, type Lang } from './i18n';

let swVoice: string | null | undefined; // undefined = not checked yet

async function findSwahiliVoice(): Promise<string | null> {
  if (swVoice !== undefined) return swVoice;
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    const v = voices.find((x) => x.language?.toLowerCase().startsWith('sw'));
    swVoice = v ? v.identifier : null;
  } catch {
    swVoice = null;
  }
  return swVoice;
}

export async function hasSwahiliVoice(): Promise<boolean> {
  return (await findSwahiliVoice()) !== null;
}

/** Strip characters TTS reads badly (bullets, arrows, emoji-like symbols). */
function clean(text: string): string {
  return text
    .replace(/[•·→←↑↓✓✔︎]/g, ' ')
    .replace(/\s+—\s+/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function speak(text: string, opts: { lang?: Lang; onDone?: () => void } = {}): Promise<void> {
  const lang = opts.lang ?? getLang();
  await Speech.stop();
  const voice = lang === 'sw' ? await findSwahiliVoice() : null;
  Speech.speak(clean(text), {
    language: lang === 'sw' ? 'sw-KE' : 'en-GB',
    voice: voice ?? undefined,
    rate: 0.92,
    onDone: opts.onDone,
    onStopped: opts.onDone,
    onError: opts.onDone,
  });
}

export function stopSpeaking(): void {
  Speech.stop();
}
