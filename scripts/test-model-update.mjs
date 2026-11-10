// Behaviour tests for lib/modelUpdateCore.ts (leaf model updates over Wi-Fi). Run via `npm test`.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { appUpdate, BUILTIN, CHECK_EVERY_MS, dueForCheck, hex, labelList, parseManifest, planModel, uncoveredLabels } from '../lib/modelUpdateCore.ts';

let n = 0;
const ok = (name, fn) => {
  fn();
  n++;
  console.log('PASS ' + name);
};
const H = 'a'.repeat(64);
const good = (extra = {}) => ({
  schema: 1,
  model: { version: 'v8a', file: 'v8a/cropguard.tflite', sha256: H, bytes: 18_000_000, labels_file: 'v8a/class_labels.json', labels_sha256: H, min_app_code: 10, pixels: 'minus_one_one', ...extra },
});

ok('rule 1: a well-formed manifest is accepted', () => {
  const m = parseManifest(good());
  assert.equal(m.model.version, 'v8a');
  assert.equal(m.model.bytes, 18_000_000);
});

ok('rule 1: anything off is refused, so nothing is downloaded', () => {
  assert.equal(parseManifest(null), null);
  assert.equal(parseManifest({ schema: 2 }), null);
  assert.equal(parseManifest(good({ sha256: 'xyz' })), null);
  assert.equal(parseManifest(good({ file: '../../etc/passwd' })), null);
  assert.equal(parseManifest(good({ file: 'https://evil.example/m.tflite' })), null);
  assert.equal(parseManifest(good({ bytes: 500 * 1024 * 1024 })), null);
  assert.equal(parseManifest(good({ bytes: 0 })), null);
  assert.equal(parseManifest(good({ version: 'v8a; drop' })), null);
  assert.equal(parseManifest({ schema: 1, app: { version: '2.8.1', code: 11, url: 'http://insecure' } }), null);
});

ok('the pixel contract must be stated, or the model is refused (a wrong scale gives confident nonsense)', () => {
  assert.equal(parseManifest(good({ pixels: undefined })), null);
  assert.equal(parseManifest(good({ pixels: 'zero_one' })), null);
  const src = readFileSync(new URL('../lib/classifier.ts', import.meta.url), 'utf8');
  assert.match(src, /PIXEL_SCALING: 'zero_one' \| 'minus_one_one' = 'minus_one_one'/);
});

ok('rule 2: Wi-Fi only, at most once a day, and a clock set back does not block checks', () => {
  const now = 1_800_000_000_000;
  assert.equal(dueForCheck(null, now, false), false);
  assert.equal(dueForCheck(null, now, true), true);
  assert.equal(dueForCheck(now - 1000, now, true), false);
  assert.equal(dueForCheck(now - CHECK_EVERY_MS, now, true), true);
  assert.equal(dueForCheck(now + 5 * CHECK_EVERY_MS, now, true), true);
});

ok('plan: same version does nothing; new version downloads; old app waits for its update', () => {
  const m = parseManifest(good()).model;
  assert.equal(planModel(m, { version: 'v8a' }, 10).kind, 'none');
  assert.equal(planModel(m, { version: BUILTIN }, 10).kind, 'download');
  assert.deepEqual(planModel(m, { version: BUILTIN }, 9), { kind: 'needs-app-update', version: 'v8a' });
  assert.equal(planModel(undefined, { version: BUILTIN }, 10).kind, 'none');
});

ok('rule 6: "builtin" rolls every phone back to the model inside the APK', () => {
  const m = parseManifest({ schema: 1, model: { version: 'builtin' } }).model;
  assert.equal(planModel(m, { version: 'v8a' }, 10).kind, 'rollback');
  assert.equal(planModel(m, { version: BUILTIN }, 10).kind, 'none');
});

ok('rule 4: a class without a treatment guide blocks the model (healthy classes need none)', () => {
  const guides = new Set(['Maize___Common_rust', 'Beans___Angular_leaf_spot']);
  const has = (l) => guides.has(l);
  assert.deepEqual(uncoveredLabels(['Maize___Common_rust', 'Maize___healthy', 'Kale___Black_rot'], has), ['Kale___Black_rot']);
  assert.deepEqual(uncoveredLabels(['Beans___Angular_leaf_spot', 'Beans___Healthy'], has), []);
});

ok('labels: index order kept; gaps or junk refused', () => {
  assert.deepEqual(labelList({ 1: 'b', 0: 'a', 2: 'c' }), ['a', 'b', 'c']);
  assert.deepEqual(labelList(['a', 'b']), ['a', 'b']);
  assert.equal(labelList({ 0: 'a', 2: 'c' }), null);
  assert.equal(labelList({ 0: 'a', 1: 7 }), null);
  assert.equal(labelList([]), null);
});

ok('rule 3: the checksum is the lower-case hex SHA-256 the publish script writes', () => {
  const bytes = new TextEncoder().encode('tassel');
  const node = createHash('sha256').update(bytes).digest('hex');
  const ab = createHash('sha256').update(bytes).digest();
  assert.equal(hex(ab.buffer.slice(ab.byteOffset, ab.byteOffset + ab.length)), node);
});

ok('the built-in labels pass the same checks the phone runs on a download', () => {
  const raw = JSON.parse(readFileSync(new URL('../assets/model/class_labels.json', import.meta.url), 'utf8'));
  assert.ok(labelList(raw)?.length > 100);
});

ok('app notice: only a newer build is announced', () => {
  const a = { version: '2.8.1', code: 11, url: 'https://x/t.apk' };
  assert.equal(appUpdate(a, 10), a);
  assert.equal(appUpdate(a, 11), null);
  assert.equal(appUpdate(undefined, 10), null);
});

ok('the scanner falls back to the built-in model if a download will not load', () => {
  const src = readFileSync(new URL('../lib/useDiseaseModel.ts', import.meta.url), 'utf8');
  assert.match(src, /catch \(e\)[\s\S]*setModelLabels\(null\)[\s\S]*Asset\.fromModule\(MODEL\)/);
});

console.log(`\n${n} model update tests passed`);
