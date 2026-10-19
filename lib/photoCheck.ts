// Tassel — AI photo check client.
//
// For what the offline scanner cannot do (insect pests, nutrient deficiencies,
// crops outside its 38 classes, or an uncertain scan) the farmer can choose to
// send ONE photo to the `photo-check` Edge Function, which asks Claude (vision)
// and returns a structured first opinion. The photo is shrunk on the phone
// first (longest side 1024 px, JPEG) and is not stored on the server.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { supabase } from './supabase';
import { ensureSession } from './session';
import type { Lang } from './i18n';

export type ProblemType = 'disease' | 'pest' | 'nutrient_deficiency' | 'environmental' | 'other';
export type PhotoCheck = {
  is_plant_photo: boolean;
  photo_quality: 'good' | 'poor';
  crop: string | null;
  status: 'healthy' | 'problem' | 'unclear';
  problem_name: string | null;
  problem_type: ProblemType | null;
  confidence: 'low' | 'medium' | 'high';
  urgency: 'low' | 'medium' | 'high';
  signs: string[];
  check_to_confirm: string[];
  actions_now: string[];
  chemical_options: string[];
  alternatives: string[];
  see_expert: boolean;
  retake_tips: string[];
};

const MAX_SIDE = 1024;
const CONSENT_KEY = 'photoCheckConsent:v1';

const MSG = {
  read: { en: 'Could not read the photo.', sw: 'Imeshindwa kusoma picha.' },
  photo: { en: 'This photo could not be sent. Try a different photo.', sw: 'Picha hii haikuweza kutumwa. Jaribu picha nyingine.' },
  session: { en: 'Session expired. Restart the app and try again.', sw: 'Muda wa kuingia umeisha. Fungua programu upya ujaribu tena.' },
  limit: { en: 'You have used the AI a lot recently. Please try again in an hour.', sw: 'Umetumia AI mara nyingi hivi karibuni. Tafadhali jaribu tena baada ya saa moja.' },
  busy: { en: 'The AI photo check is busy. Please try again in a moment.', sw: 'Ukaguzi wa picha wa AI una shughuli nyingi. Tafadhali jaribu tena baada ya muda mfupi.' },
  offline: { en: 'No internet. The AI photo check needs data or Wi-Fi; the offline scanner still works.', sw: 'Hakuna intaneti. Ukaguzi wa picha wa AI unahitaji data au Wi-Fi; skana ya bila intaneti bado inafanya kazi.' },
};

export async function hasPhotoConsent(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(CONSENT_KEY)) === 'yes';
  } catch {
    return false;
  }
}

export async function givePhotoConsent(): Promise<void> {
  try {
    await AsyncStorage.setItem(CONSENT_KEY, 'yes');
  } catch {
    // non-critical: the farmer is asked again next time
  }
}

/** Shrink (never enlarge) to a JPEG whose longest side is at most 1024 px; strips EXIF/GPS. */
async function toJpegBase64(uri: string, lang: Lang): Promise<string> {
  const probe = await ImageManipulator.manipulate(uri).renderAsync();
  let img = probe;
  if (Math.max(probe.width, probe.height) > MAX_SIDE) {
    const ctx = ImageManipulator.manipulate(uri);
    ctx.resize(probe.width >= probe.height ? { width: MAX_SIDE } : { height: MAX_SIDE });
    img = await ctx.renderAsync();
  }
  const saved = await img.saveAsync({ format: SaveFormat.JPEG, compress: 0.75, base64: true });
  if (!saved.base64) throw new Error(MSG.read[lang]);
  return saved.base64;
}

export async function runPhotoCheck(opts: {
  uri: string;
  lang: Lang;
  crop?: string;
  note?: string;
  scan?: { label?: string; confidence?: number };
}): Promise<PhotoCheck> {
  const { lang } = opts;
  const image = await toJpegBase64(opts.uri, lang);
  try {
    await ensureSession();
  } catch {
    throw new Error(MSG.offline[lang]);
  }

  let res: Awaited<ReturnType<typeof supabase.functions.invoke<{ result?: PhotoCheck; error?: string }>>>;
  try {
    res = await supabase.functions.invoke<{ result?: PhotoCheck; error?: string }>('photo-check', {
      body: { image, lang, crop: opts.crop || undefined, note: opts.note?.trim() || undefined, scan: opts.scan },
    });
  } catch {
    throw new Error(MSG.offline[lang]);
  }

  const { data, error } = res;
  if (error) {
    const status = error instanceof FunctionsHttpError ? (error.context as Response).status : 0;
    if (status === 400) throw new Error(MSG.photo[lang]);
    if (status === 401) throw new Error(MSG.session[lang]);
    if (status === 429) throw new Error(MSG.limit[lang]);
    if (status >= 500) throw new Error(MSG.busy[lang]);
    throw new Error(MSG.offline[lang]);
  }
  if (!data?.result) throw new Error(MSG.busy[lang]);
  return data.result;
}
