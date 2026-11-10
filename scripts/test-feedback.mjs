// Behaviour tests for lib/feedbackCore.ts ("Was this right?" photo sharing). Run via `npm test`.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { addToQueue, canUpload, feedbackRow, shrinkTo, storagePath, uuid4, QUEUE_MAX } from '../lib/feedbackCore.ts';

let n = 0;
const ok = (name, fn) => {
  fn();
  n++;
  console.log('PASS ' + name);
};
const item = (id, extra = {}) => ({
  id, file: `file:///q/${id}.jpg`, class_label: 'Maize___Common_rust', confidence: 0.91, uncertain: false,
  crop: 'Maize', answer: 'right', model: 'v5', app_version: '2.8.0', scanned_at: '2026-11-10T09:00:00.000Z', ...extra,
});
const WIFI = { type: 'WIFI', isConnected: true, isInternetReachable: true };

ok('consent a: nothing is sent without a yes', () => {
  assert.equal(canUpload(WIFI, null), false);
  assert.equal(canUpload(WIFI, 'no'), false);
  assert.equal(canUpload(WIFI, 'yes'), true);
});

ok('rule c: never on mobile data, never offline, never on Wi-Fi without internet', () => {
  assert.equal(canUpload({ type: 'CELLULAR', isConnected: true, isInternetReachable: true }, 'yes'), false);
  assert.equal(canUpload({ type: 'NONE', isConnected: false }, 'yes'), false);
  assert.equal(canUpload({ type: 'WIFI', isConnected: false }, 'yes'), false);
  assert.equal(canUpload({ type: 'WIFI', isConnected: true, isInternetReachable: false }, 'yes'), false);
  assert.equal(canUpload({ type: 'UNKNOWN', isConnected: true }, 'yes'), false);
});

ok('the queue keeps the newest and hands back the oldest to delete', () => {
  let q = [];
  for (let i = 0; i < QUEUE_MAX + 3; i++) q = addToQueue(q, item(`i${i}`)).queue;
  assert.equal(q.length, QUEUE_MAX);
  assert.equal(q[0].id, 'i3');
  const { queue, dropped } = addToQueue(q, item('new'));
  assert.equal(queue.at(-1).id, 'new');
  assert.deepEqual(dropped.map((d) => d.id), ['i3']);
});

ok('the same scan answered twice is kept once', () => {
  const q = addToQueue([item('a')], item('a', { answer: 'wrong' })).queue;
  assert.equal(q.length, 1);
  assert.equal(q[0].answer, 'wrong');
});

ok('rule e: every photo sits in the farmer\'s own folder', () => {
  assert.equal(storagePath('user-1', 'abc'), 'user-1/abc.jpg');
});

ok('rule d: the row carries the answer as a hint, never an agronomist label', () => {
  const row = feedbackRow(item('a', { confidence: 1.4, class_label: 'x'.repeat(120) }), 'u/a.jpg');
  assert.equal(row.confidence, 1);
  assert.equal(row.class_label.length, 80);
  assert.equal(row.answer, 'right');
  assert.equal('agronomist_label' in row, false);
  assert.equal('reviewed_at' in row, false);
  assert.equal('user_id' in row, false); // the server takes it from the session
});

ok('ids are version-4 UUIDs', () => {
  const re = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
  for (let i = 0; i < 50; i++) assert.match(uuid4(), re);
  assert.match(uuid4(() => 0.999999), re);
  assert.match(uuid4(() => 0), re);
});

ok('photos shrink to 1024 px on the long side and are never enlarged', () => {
  assert.deepEqual(shrinkTo(4000, 3000), { width: 1024 });
  assert.deepEqual(shrinkTo(3000, 4000), { height: 1024 });
  assert.equal(shrinkTo(800, 600), null);
});

ok('rule b: the shared copy is re-encoded, never the camera file itself', () => {
  const src = readFileSync(new URL('../lib/feedback.ts', import.meta.url), 'utf8');
  assert.match(src, /saveAsync\(\{ format: SaveFormat\.JPEG/);
  assert.doesNotMatch(src, /upload\([^)]*input\.uri/);
});

ok('rule e: the server SQL keeps the bucket private and every row to its owner', () => {
  const sql = readFileSync(new URL('../../cropguard-proxy/supabase/cropguard_v28_scan_feedback.sql', import.meta.url), 'utf8');
  assert.match(sql, /'training-photos',\s*'training-photos',\s*false/);
  assert.match(sql, /enable row level security/);
  assert.doesNotMatch(sql, /on public\.scan_feedback for update/i); // an answer cannot be edited
  assert.match(sql, /agronomist_label is null/);
});

console.log(`\n${n} feedback tests passed`);
