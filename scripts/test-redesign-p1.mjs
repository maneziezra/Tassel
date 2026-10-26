// Automated verification script for Tassel P1 Redesign & P0 bugfixes.
// Run with: node scripts/test-redesign-p1.mjs

import fs from 'fs';
import path from 'path';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`\x1b[32m✔ PASS:\x1b[0m ${message}`);
    passed++;
  } else {
    console.error(`\x1b[31m✖ FAIL:\x1b[0m ${message}`);
    failed++;
  }
}

console.log('\n--- 1. Testing P0 Fixes ---');
const dataTs = fs.readFileSync('lib/data.ts', 'utf-8');
assert(dataTs.includes('GLOBAL_PROFILE_KEY') && dataTs.includes('AsyncStorage'), 'P0.1: lib/data.ts caches profile locally via AsyncStorage');
assert(dataTs.includes('user_metadata') && dataTs.includes('authName'), 'P0.1: lib/data.ts falls back to Supabase auth user_metadata name');

const navTs = fs.readFileSync('lib/navigation.ts', 'utf-8');
assert(navTs.includes('export function openScanner'), 'P0.2: lib/navigation.ts exports openScanner()');
assert(navTs.includes('dismissAll'), 'P0.2: openScanner() dismisses modals before navigating to /(tabs)/scan');

const calTs = fs.readFileSync('app/calendar.tsx', 'utf-8');
assert(calTs.includes('AddPlantingWizard') || calTs.includes('wizardStep'), 'P0.3: app/calendar.tsx has guided planting wizard');

console.log('\n--- 2. Testing P1 Home Redesign (Direction A: Field-First Editorial) ---');
const homeTs = fs.readFileSync('app/(tabs)/index.tsx', 'utf-8');
assert(homeTs.includes('MiniFieldBoundary'), 'Home has MiniFieldBoundary SVG component');
assert(homeTs.includes('fieldHeroCard') && homeTs.includes('fieldVerdict'), 'Home renders dominant Field-First hero card with satellite verdict');
assert(homeTs.includes('scanBar') && homeTs.includes('openScanner'), 'Home has giant thumb-reachable Scan bar calling openScanner()');
assert(homeTs.includes('todaySpray?.window') && homeTs.includes('Safe to spray until'), 'Home integrates weather into spray window advice');
assert(homeTs.includes('SatellitePassArt'), 'Home has first-run empty state with SatellitePassArt');
assert(homeTs.includes('fieldPill'), 'Home has horizontal field switcher pills for multi-field farmers');

console.log('\n--- 3. Testing P1 Add Field Slide Wizard ---');
const addFarmTs = fs.readFileSync('app/add-farm.tsx', 'utf-8');
assert(addFarmTs.includes('totalSteps = 5') || addFarmTs.includes('progress'), 'Add-farm has multi-step progress bar');
assert(addFarmTs.includes('SatellitePassArt') && addFarmTs.includes('Draw your field from space'), 'Slide 0/1 offers satellite drawing');
assert(addFarmTs.includes('SUGGESTED_NAMES') && addFarmTs.includes('sugChip'), 'Slide 1/2 offers smart suggested names');
assert(addFarmTs.includes('cropGrid') && addFarmTs.includes('CropIcon'), 'Slide 2/3 offers visual CropIcon grid with no typing');
assert(addFarmTs.includes('DATE_SHORTCUTS'), 'Slide 3/4 offers quick planting date shortcuts');
assert(addFarmTs.includes('refreshSatellite'), 'Slide 5/6 triggers immediate background satellite pass');

console.log('\n--- 4. Testing P1 Field Health Dominance & PCPB Products ---');
const satTs = fs.readFileSync('app/satellite/[id].tsx', 'utf-8');
assert(satTs.includes('Header dark'), 'Satellite screen uses dark brand forest header');
assert(satTs.includes('openScanner'), 'Satellite screen offers direct leaf scan button for flagged zones');

const pcpbTs = fs.readFileSync('lib/pcpb.ts', 'utf-8');
const pcpbCatalogueSection = pcpbTs.split('export const PCPB_CATALOGUE')[1] || '';
assert(pcpbTs.includes('PCPB_CATALOGUE') && pcpbTs.includes('PCPB_DISCLAIMER'), 'lib/pcpb.ts defines official PCPB catalogue and disclaimer');
assert(pcpbTs.includes('Ridomil Gold MZ 68WG') && pcpbTs.includes('PCPB(CR) 0244'), 'lib/pcpb.ts includes authentic PCPB registration numbers');
assert(!pcpbCatalogueSection.toLowerCase().includes('chlorothalonil'), 'lib/pcpb.ts strictly excludes withdrawn chlorothalonil from products');

const resultTs = fs.readFileSync('app/result.tsx', 'utf-8');
assert(resultTs.includes('getRegisteredProducts') && resultTs.includes('pcpbCard'), 'app/result.tsx displays registered PCPB commercial products');

console.log('\n--- 5. Testing Zero Invented Numbers Compliance ---');
const allAppCode = [homeTs, satTs, resultTs, addFarmTs].join('\n');
assert(!allAppCode.includes('86% vs 40%'), 'Rule 1: No "86% vs 40%" fabricated claim in redesigned screens');
assert(!allAppCode.includes('43/50'), 'Rule 1: No "43/50" fabricated claim in redesigned screens');
assert(!allAppCode.includes('4.4/5') && !allAppCode.includes('4.8/5'), 'Rule 1: No fake 4.4/5 or 4.8/5 usability survey ratings');

console.log(`\n========================================`);
console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log(`========================================\n`);

if (failed > 0) process.exit(1);
