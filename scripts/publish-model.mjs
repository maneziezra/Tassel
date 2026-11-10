// Prepares (and optionally uploads) a leaf model for over-the-air delivery.
//
//   node scripts/publish-model.mjs <folder with cropguard.tflite + class_labels.json> <version> [--min-app <code>] [--upload]
//   node scripts/publish-model.mjs --rollback [--upload]        (every phone goes back to the built-in model)
//
// Writes dist/models/manifest.json and dist/models/<version>/… . Upload them to the public "models"
// bucket in the Supabase dashboard, or pass --upload with SUPABASE_SERVICE_ROLE_KEY set in this window
// (never put the service key in .env or in the app).
//
// Ship rule (PLAN A5): publish only a model that beats v5 on test_phone and on Kenyan photos.
// This script refuses a model whose classes have no treatment guide in lib/diseases.ts.

import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : undefined);
const out = path.join(root, 'dist', 'models');
mkdirSync(out, { recursive: true });

const sha = (f) => createHash('sha256').update(readFileSync(f)).digest('hex');
const app = JSON.parse(readFileSync(path.join(root, 'app.json'), 'utf8')).expo;

let manifest;
if (flag('--rollback')) {
  manifest = { schema: 1, model: { version: 'builtin' } };
} else {
  const [dir, version] = args.filter((a) => !a.startsWith('--') && a !== opt('--min-app'));
  if (!dir || !version || !/^[A-Za-z0-9._-]{1,20}$/.test(version) || version === 'builtin') {
    console.error('Usage: node scripts/publish-model.mjs <folder> <version> [--min-app <code>] [--upload]');
    process.exit(1);
  }
  const tflite = path.join(dir, 'cropguard.tflite');
  const labelsPath = path.join(dir, 'class_labels.json');
  if (!existsSync(tflite) || !existsSync(labelsPath)) throw new Error(`${dir} needs cropguard.tflite and class_labels.json`);

  // Every class needs an English guide in this app (lib/diseases*.ts, not the .sw files), healthy classes excepted.
  const raw = JSON.parse(readFileSync(labelsPath, 'utf8'));
  const labels = Array.isArray(raw) ? raw : Object.keys(raw).sort((a, b) => a - b).map((k) => raw[k]);
  const guides = readdirSync(path.join(root, 'lib'))
    .filter((f) => /^diseases(\.[a-z0-9]+)?\.ts$/.test(f) && !/\.sw\.ts$/.test(f))
    .map((f) => readFileSync(path.join(root, 'lib', f), 'utf8'))
    .join('\n');
  const missing = labels.filter((l) => !/___healthy$/i.test(l) && !guides.includes(`'${l}'`) && !guides.includes(`"${l}"`));
  if (missing.length) {
    console.error(`Refused: ${missing.length} classes have no treatment guide in lib/diseases*.ts:\n  ${missing.join('\n  ')}`);
    console.error('Add the guides (English and Kiswahili), ship that app version, then publish with --min-app <its versionCode>.');
    process.exit(2);
  }

  mkdirSync(path.join(out, version), { recursive: true });
  copyFileSync(tflite, path.join(out, version, 'cropguard.tflite'));
  copyFileSync(labelsPath, path.join(out, version, 'class_labels.json'));
  manifest = {
    schema: 1,
    model: {
      version,
      file: `${version}/cropguard.tflite`,
      sha256: sha(tflite),
      bytes: statSync(tflite).size,
      labels_file: `${version}/class_labels.json`,
      labels_sha256: sha(labelsPath),
      min_app_code: Number(opt('--min-app') ?? app.android.versionCode),
      pixels: 'minus_one_one',
    },
  };
  console.log(`${version}: ${labels.length} classes, ${(manifest.model.bytes / 1048576).toFixed(1)} MB, every class has a guide.`);
}

// Keep the app entry from the last manifest, if any (edit dist/models/manifest.json to announce an APK).
const prevPath = path.join(out, 'manifest.json');
if (existsSync(prevPath)) {
  const prev = JSON.parse(readFileSync(prevPath, 'utf8'));
  if (prev.app) manifest.app = prev.app;
}
writeFileSync(prevPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(`Wrote ${prevPath}`);

if (flag('--upload')) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const env = readFileSync(path.join(root, '.env'), 'utf8');
  const base = /EXPO_PUBLIC_SUPABASE_URL=(\S+)/.exec(env)?.[1];
  if (!key || !base) throw new Error('Set SUPABASE_SERVICE_ROLE_KEY in this window to upload.');
  const put = async (rel, type) => {
    const res = await fetch(`${base}/storage/v1/object/models/${rel}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': type, 'x-upsert': 'true', 'Cache-Control': 'max-age=60' },
      body: readFileSync(path.join(out, rel)),
    });
    if (!res.ok) throw new Error(`${rel}: ${res.status} ${await res.text()}`);
    console.log(`uploaded ${rel}`);
  };
  if (manifest.model?.file) {
    await put(manifest.model.file, 'application/octet-stream');
    await put(manifest.model.labels_file, 'application/json');
  }
  await put('manifest.json', 'application/json'); // last: phones only see a model once its files are there
}
