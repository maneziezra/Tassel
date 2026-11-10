// Tassel — over-the-air model updates: the rules, with no phone APIs (tested in Node).
//
// Why (10 Nov 2026): the APK is 85 MB and goes round on Telegram. A better leaf model should
// reach farmers as a ~5–20 MB download on Wi-Fi, without a reinstall.
//
// Safety, in order:
//  1. The manifest must be well formed, or nothing happens.
//  2. Wi-Fi only, at most one check a day (a farmer's data bundle is never touched).
//  3. Both files are checked against the SHA-256 in the manifest before use.
//  4. Every class the new model can name must have a treatment guide in this app version
//     (rule 3: never name a disease the app cannot explain); otherwise the app needs an update first.
//  5. The model is test-run on the phone; its output size must equal the number of labels.
//  6. Anything fails → keep the model already in use. The built-in model is never deleted, and
//     a manifest with version "builtin" rolls every phone back to it.
// Publishing a model is still a human decision (PLAN A5: beats v5 on test_phone and Kenyan photos).

export const BUILTIN = 'builtin';
export const CHECK_EVERY_MS = 24 * 3600 * 1000;
export const MAX_MODEL_BYTES = 40 * 1024 * 1024;

export type ModelEntry = {
  version: string; // "v8a", or "builtin" to roll back
  file?: string; // path in the public models bucket, e.g. "v8a/cropguard.tflite"
  sha256?: string;
  bytes?: number;
  labels_file?: string;
  labels_sha256?: string;
  min_app_code?: number; // the oldest app build whose guides cover this model
  pixels?: 'minus_one_one'; // the app's input contract (lib/classifier.ts PIXEL_SCALING); anything else is refused
};
export type AppEntry = { version: string; code: number; url: string; bytes?: number; notes?: { en?: string; sw?: string } };
export type Manifest = { schema: 1; model?: ModelEntry; app?: AppEntry };

export type Active = { version: string; tflite?: string; labels?: string; installed_at?: string };

const HEX64 = /^[0-9a-f]{64}$/;
const SAFE_PATH = /^[A-Za-z0-9._-]+(\/[A-Za-z0-9._-]+)*$/;
const VERSION = /^[A-Za-z0-9._-]{1,20}$/;

/** Rule 1: returns a clean manifest, or null if anything is off. */
export function parseManifest(raw: unknown): Manifest | null {
  if (!raw || typeof raw !== 'object') return null;
  const m = raw as Record<string, unknown>;
  if (m.schema !== 1) return null;
  const out: Manifest = { schema: 1 };

  if (m.model !== undefined) {
    const e = m.model as Record<string, unknown>;
    if (!e || typeof e.version !== 'string' || !VERSION.test(e.version)) return null;
    if (e.version === BUILTIN) out.model = { version: BUILTIN };
    else {
      const ok =
        typeof e.file === 'string' && SAFE_PATH.test(e.file) && !e.file.includes('..') &&
        typeof e.labels_file === 'string' && SAFE_PATH.test(e.labels_file) && !e.labels_file.includes('..') &&
        typeof e.sha256 === 'string' && HEX64.test(e.sha256) &&
        typeof e.labels_sha256 === 'string' && HEX64.test(e.labels_sha256) &&
        typeof e.bytes === 'number' && e.bytes > 0 && e.bytes <= MAX_MODEL_BYTES &&
        e.pixels === 'minus_one_one' &&
        (e.min_app_code === undefined || (typeof e.min_app_code === 'number' && e.min_app_code >= 0));
      if (!ok) return null;
      out.model = {
        version: e.version, file: e.file as string, sha256: e.sha256 as string, bytes: e.bytes as number,
        labels_file: e.labels_file as string, labels_sha256: e.labels_sha256 as string, min_app_code: e.min_app_code as number | undefined,
        pixels: 'minus_one_one',
      };
    }
  }

  if (m.app !== undefined) {
    const a = m.app as Record<string, unknown>;
    const ok = a && typeof a.version === 'string' && typeof a.code === 'number' && a.code > 0 &&
      typeof a.url === 'string' && /^https:\/\//.test(a.url);
    if (!ok) return null;
    const notes = a.notes && typeof a.notes === 'object' ? (a.notes as AppEntry['notes']) : undefined;
    out.app = { version: a.version as string, code: a.code as number, url: a.url as string, bytes: typeof a.bytes === 'number' ? a.bytes : undefined, notes };
  }
  return out;
}

/** Rule 2. */
export function dueForCheck(lastCheck: number | null, now: number, onWifi: boolean): boolean {
  if (!onWifi) return false;
  return lastCheck === null || now - lastCheck >= CHECK_EVERY_MS || now < lastCheck;
}

export type Plan =
  | { kind: 'none' }
  | { kind: 'rollback' }
  | { kind: 'download'; model: Required<Pick<ModelEntry, 'version' | 'file' | 'sha256' | 'bytes' | 'labels_file' | 'labels_sha256'>> }
  | { kind: 'needs-app-update'; version: string };

/** What to do with the model entry, given what is installed and this app build. */
export function planModel(m: ModelEntry | undefined, active: Active, appCode: number): Plan {
  if (!m) return { kind: 'none' };
  if (m.version === BUILTIN) return active.version === BUILTIN ? { kind: 'none' } : { kind: 'rollback' };
  if (m.version === active.version) return { kind: 'none' };
  if (m.min_app_code !== undefined && appCode < m.min_app_code) return { kind: 'needs-app-update', version: m.version };
  return { kind: 'download', model: m as never };
}

/** Rule 4: labels that no guide in this app version covers (healthy classes need none). */
export function uncoveredLabels(labels: string[], hasGuide: (label: string) => boolean): string[] {
  return labels.filter((l) => !/___healthy$/i.test(l) && !hasGuide(l));
}

/** class_labels.json is {"0": "Maize___Common_rust", ...} or a plain list; returns them in index order. */
export function labelList(raw: unknown): string[] | null {
  if (Array.isArray(raw)) return raw.every((x) => typeof x === 'string') && raw.length ? (raw as string[]) : null;
  if (!raw || typeof raw !== 'object') return null;
  const entries = Object.entries(raw as Record<string, unknown>);
  if (!entries.length) return null;
  const sorted = entries.map(([k, v]) => [Number(k), v] as const).sort((a, b) => a[0] - b[0]);
  if (sorted.some(([k, v], i) => k !== i || typeof v !== 'string')) return null;
  return sorted.map(([, v]) => v as string);
}

/** Rule 3: lower-case hex of a digest. */
export function hex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** A newer app build exists. */
export function appUpdate(app: AppEntry | undefined, appCode: number): AppEntry | null {
  return app && app.code > appCode ? app : null;
}
