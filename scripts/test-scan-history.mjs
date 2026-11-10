// Behaviour tests for lib/scanHistory.ts. Run via `npm test`.
import assert from 'node:assert/strict';
import { groupByMonth, summarise } from '../lib/scanHistory.ts';

let n = 0;
const ok = (name, fn) => {
  fn();
  n++;
  console.log('PASS ' + name);
};
const NOW = Date.parse('2026-11-07T12:00:00');
const ago = (days) => new Date(NOW - days * 86400000).toISOString();
const scan = (days, disease = 'Late blight', confidence = 0.9, label = disease) => ({
  id: `${days}-${label}`, class_label: label, disease, confidence, uncertain: confidence < 0.75, created_at: ago(days),
});

ok('no scans gives an empty summary', () => assert.equal(summarise([], NOW).kind, 'empty'));
ok('rule 3: only unclear scans never name a disease', () => {
  assert.deepEqual(summarise([scan(1, 'Late blight', 0.6), scan(2, 'Rust', 0.7)], NOW), { kind: 'unclear' });
});
ok('rule 3: an unclear guess does not override the last sure scan', () => {
  assert.equal(summarise([scan(1, 'Late blight', 0.6), scan(5, 'Healthy')], NOW).kind, 'healthy');
});
ok('a flagged-uncertain scan does not count even at high confidence', () => {
  assert.equal(summarise([{ ...scan(1), uncertain: true }], NOW).kind, 'unclear');
});
ok('one sure disease is a finding', () => {
  const s = summarise([scan(3)], NOW);
  assert.equal(s.kind, 'finding');
  assert.equal(s.disease, 'Late blight');
});
ok('the same disease again is a repeat, whatever the input order', () => {
  const s = summarise([scan(30), scan(3), scan(10)], NOW);
  assert.equal(s.kind, 'repeat');
  assert.equal(s.count, 3);
  assert.equal(s.at, ago(3));
});
ok('a healthy scan in between resets the repeat count', () => {
  assert.equal(summarise([scan(3), scan(10, 'Healthy'), scan(20)], NOW).kind, 'finding');
});
ok('scans older than the window do not count as a repeat', () => {
  assert.equal(summarise([scan(3), scan(90)], NOW).kind, 'finding');
});
ok('the newest healthy scan wins over older disease', () => {
  assert.equal(summarise([scan(1, 'Healthy'), scan(4), scan(6)], NOW).kind, 'healthy');
});
ok('months are newest first, scans newest first inside each', () => {
  const months = groupByMonth([
    { ...scan(0), created_at: '2026-09-15T12:00:00', id: 'sep' },
    { ...scan(0), created_at: '2026-11-02T12:00:00', id: 'nov-old' },
    { ...scan(0), created_at: '2026-11-05T12:00:00', id: 'nov-new' },
  ]);
  assert.deepEqual(months.map((m) => m.month), [10, 8]);
  assert.deepEqual(months[0].scans.map((s) => s.id), ['nov-new', 'nov-old']);
});
console.log(`${n} scan history tests passed`);
