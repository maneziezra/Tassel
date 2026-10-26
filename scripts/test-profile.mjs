// node --experimental-strip-types scripts/test-profile.mjs
// P0.1: the farmer's name must survive a return visit, whichever store holds it.
import assert from 'node:assert/strict';
import { needsNameBackfill, resolveProfile } from '../lib/profileCore.ts';

let passed = 0;
const test = (name, fn) => {
  fn();
  passed++;
  console.log('PASS', name);
};

test('server row without a name falls back to the sign-up (auth metadata) name', () => {
  const p = resolveProfile('u1', { id: 'u1', name: null, county: 'Uasin Gishu' }, 'Ezra', null);
  assert.equal(p.name, 'Ezra');
  assert.equal(p.county, 'Uasin Gishu');
});

test('blank strings never hide a real value', () => {
  const p = resolveProfile('u1', { name: '   ', phone: '' }, null, { name: 'Ezra', phone: '0712000000' });
  assert.equal(p.name, 'Ezra');
  assert.equal(p.phone, '0712000000');
});

test('offline: no server row, the cached copy is used', () => {
  const p = resolveProfile('u1', null, null, { name: 'Ezra', county: 'Nandi', crops: 'Maize' });
  assert.deepEqual([p.name, p.county, p.crops], ['Ezra', 'Nandi', 'Maize']);
});

test('server value wins when present', () => {
  const p = resolveProfile('u1', { name: 'Ezra L.' }, 'Ezra', { name: 'Old' });
  assert.equal(p.name, 'Ezra L.');
});

test('names are trimmed', () => {
  assert.equal(resolveProfile('u1', { name: '  Ezra ' }, null, null).name, 'Ezra');
});

test('backfill only when the server is missing a name we know', () => {
  assert.equal(needsNameBackfill({ name: null }, resolveProfile('u1', { name: null }, 'Ezra', null)), true);
  assert.equal(needsNameBackfill({ name: 'Ezra' }, resolveProfile('u1', { name: 'Ezra' }, null, null)), false);
  assert.equal(needsNameBackfill(null, resolveProfile('u1', null, null, null)), false);
});

console.log(`\n${passed} profile tests passed`);
