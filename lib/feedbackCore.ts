// Tassel — "Was this right?" photo sharing: the rules, with no phone APIs (tested in Node).
// Decided by Ezra, 10 Nov 2026: collect farmers' scan photos, only with consent, to measure
// Tassel's real accuracy on Kenyan farms and to train later models.
// Engineering rules (PLAN_v8_and_features.md, review point 4):
//   a. plain consent, English and Kiswahili, asked once, off until the farmer says yes;
//   b. the photo is re-encoded on the phone, which drops GPS and other metadata;
//   c. uploads wait for Wi-Fi and stay queued offline;
//   d. the farmer's answer is a hint, not a label: only agronomist-checked photos are test data;
//   e. a private bucket with row-level security, and the farmer can delete everything.

export type Answer = 'right' | 'wrong' | 'unsure';
export type Consent = 'yes' | 'no' | null;

/** The model that made the guess. Bump with the model file. */
export const FEEDBACK_MODEL = 'v5';
export const QUEUE_MAX = 20;
export const BUCKET = 'training-photos';
export const MAX_SIDE = 1024;

export type QueueItem = {
  id: string;
  file: string; // the re-encoded JPEG on the phone
  class_label: string;
  confidence: number;
  uncertain: boolean;
  crop: string | null;
  answer: Answer;
  model: string;
  app_version: string | null;
  scanned_at: string;
};

export type Net = { type?: string | null; isConnected?: boolean | null; isInternetReachable?: boolean | null };

/** Only with consent, only on Wi-Fi, and not when the phone says the Wi-Fi has no internet. */
export function canUpload(net: Net, consent: Consent): boolean {
  if (consent !== 'yes') return false;
  if (net.type !== 'WIFI') return false;
  if (net.isConnected === false) return false;
  if (net.isInternetReachable === false) return false;
  return true;
}

/** Adds the newest item; past the cap the oldest go (their files must be deleted by the caller). */
export function addToQueue(queue: QueueItem[], item: QueueItem, max = QUEUE_MAX): { queue: QueueItem[]; dropped: QueueItem[] } {
  const all = [...queue.filter((q) => q.id !== item.id), item];
  const over = Math.max(0, all.length - max);
  return { queue: all.slice(over), dropped: all.slice(0, over) };
}

/** Every photo lives under the farmer's own folder: the storage rules check the first part. */
export function storagePath(userId: string, id: string): string {
  return `${userId}/${id}.jpg`;
}

/** The database row for one queued photo (the server fills user_id from the session). */
export function feedbackRow(item: QueueItem, photoPath: string) {
  return {
    id: item.id,
    photo_path: photoPath,
    class_label: item.class_label.slice(0, 80),
    confidence: Math.min(1, Math.max(0, item.confidence)),
    uncertain: item.uncertain,
    crop: item.crop ? item.crop.slice(0, 40) : null,
    answer: item.answer,
    model: item.model,
    app_version: item.app_version,
    scanned_at: item.scanned_at,
  };
}

/** A random version-4 UUID (the row id and the file name). */
export function uuid4(rand: () => number = Math.random): string {
  const h = Array.from({ length: 32 }, () => Math.floor(rand() * 16));
  h[12] = 4;
  h[16] = (h[16] & 0x3) | 0x8;
  const s = h.map((x) => x.toString(16)).join('');
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}

/** Shrink, never enlarge: the size to resize to, or null to keep the photo's size. */
export function shrinkTo(width: number, height: number, max = MAX_SIDE): { width: number } | { height: number } | null {
  if (Math.max(width, height) <= max) return null;
  return width >= height ? { width: max } : { height: max };
}
