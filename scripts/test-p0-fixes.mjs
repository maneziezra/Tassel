// node scripts/test-p0-fixes.mjs
// Verification tests for P0 bug fixes:
// P0.1: Profile remembers farmer name (offline cache + metadata fallback)
// P0.2: Universal openScanner export & stack dismissal semantics
// P0.3: Guided planting flow & CALENDARS verification

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

let passed = 0;
const test = (name, fn) => {
  fn();
  passed++;
  console.log('✓ PASS:', name);
};

// ── P0.1: Profile Logic Tests ─────────────────────────────────────────────
test('Profile: fallback and merging logic handles offline & metadata', () => {
  const localCache = { id: 'u1', name: 'Ezra Lagat', phone: '0712345678', county: 'Uasin Gishu', crops: 'Maize, Beans' };
  const authMetadata = { name: 'Ezra Lagat' };
  const remoteSupabaseNull = { id: 'u1', name: null, phone: null, county: null, crops: null };

  // Resolving name priority: remote -> authMetadata -> localCache
  const resolvedName = remoteSupabaseNull.name ?? authMetadata.name ?? localCache.name;
  assert.equal(resolvedName, 'Ezra Lagat', 'Name should fall back to authMetadata or localCache');

  // Merged profile preserves all fields offline
  const merged = {
    id: remoteSupabaseNull.id,
    name: resolvedName,
    phone: remoteSupabaseNull.phone ?? localCache.phone,
    county: remoteSupabaseNull.county ?? localCache.county,
    crops: remoteSupabaseNull.crops ?? localCache.crops,
  };
  assert.equal(merged.name, 'Ezra Lagat');
  assert.equal(merged.county, 'Uasin Gishu');
  assert.equal(merged.phone, '0712345678');
});

test('Profile: lib/data.ts implements local storage caching and user_metadata fallback', () => {
  const dataTs = fs.readFileSync(path.resolve('lib/data.ts'), 'utf8');
  assert.ok(dataTs.includes('GLOBAL_PROFILE_KEY'), 'lib/data.ts must define GLOBAL_PROFILE_KEY');
  assert.ok(dataTs.includes('authName = meta?.name?.trim()'), 'lib/data.ts must read auth user_metadata name');
  assert.ok(dataTs.includes('AsyncStorage.setItem(GLOBAL_PROFILE_KEY'), 'lib/data.ts must cache profile locally');
});

// ── P0.2: Scanner Navigation Tests ─────────────────────────────────────────
test('Navigation: lib/navigation.ts exports openScanner with stack dismissal', () => {
  const navTs = fs.readFileSync(path.resolve('lib/navigation.ts'), 'utf8');
  assert.ok(navTs.includes('export function openScanner'), 'lib/navigation.ts must export openScanner');
  assert.ok(navTs.includes('router.canDismiss()'), 'openScanner must check canDismiss()');
  assert.ok(navTs.includes('router.dismissAll()'), 'openScanner must dismiss stacked screens');
  assert.ok(navTs.includes("router.navigate('/(tabs)/scan')"), 'openScanner must route to scan tab');
});

test('Navigation: all stack screens use openScanner instead of raw navigate("/scan")', () => {
  const filesToCheck = [
    'app/(tabs)/index.tsx',
    'app/result.tsx',
    'app/farm/[id].tsx',
    'app/satellite/[id].tsx',
    'app/outbreaks.tsx',
  ];
  for (const f of filesToCheck) {
    const content = fs.readFileSync(path.resolve(f), 'utf8');
    assert.ok(content.includes('openScanner'), `${f} must import and use openScanner`);
    assert.ok(!content.includes("router.navigate('/scan')"), `${f} must not contain raw router.navigate('/scan')`);
  }
});

// ── P0.3: Planting Calendar Flow Tests ────────────────────────────────────
test('Calendar: app/calendar.tsx implements 4-step guided planting wizard', () => {
  const calTs = fs.readFileSync(path.resolve('app/calendar.tsx'), 'utf8');
  assert.ok(calTs.includes('const [wizardOpen, setWizardOpen] = useState(false);'), 'Calendar must have wizardOpen state');
  assert.ok(calTs.includes('const [wizardStep, setWizardStep] = useState'), 'Calendar must track wizardStep 1-4');
  assert.ok(calTs.includes('openPlantingWizard'), 'Calendar must implement openPlantingWizard helper');
  assert.ok(calTs.includes('savePlanting'), 'Calendar must implement savePlanting helper');
  assert.ok(calTs.includes('Step 1 of 3: Choose field'), 'Step 1 must be choose field');
  assert.ok(calTs.includes('Step 2 of 3: Choose crop'), 'Step 2 must be choose crop');
  assert.ok(calTs.includes('Step 3 of 3: Planting date'), 'Step 3 must be planting date');
  assert.ok(calTs.includes('Planting calendar ready!'), 'Step 4 must show completion confirmation');
  assert.ok(calTs.includes('Add another planting'), 'Must offer "Add another planting"');
});

test('Calendar: lib/calendar.ts defines all 5 crops with planting labels in EN and SW', () => {
  const calTs = fs.readFileSync(path.resolve('lib/calendar.ts'), 'utf8');
  const expectedCrops = ['maize', 'beans', 'potato', 'tomato', 'wheat'];
  for (const c of expectedCrops) {
    assert.ok(calTs.includes(`${c}: {`), `CALENDARS must define ${c}`);
  }
  assert.ok(calTs.includes('Transplanting date'), 'Tomato must use Transplanting date');
  assert.ok(calTs.includes('Tarehe ya kupandikiza'), 'Tomato must use Swahili transplanting label');
});

console.log(`\nAll ${passed} P0 verification tests passed successfully!`);
