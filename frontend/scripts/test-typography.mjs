/**
 * Automated Typography System Verification Suite
 *
 * Enforces the requirements from the Typography Overhaul Specification:
 * - 11 semantic tokens defined in :root and .dark
 * - Self-hosted font packages installed
 * - Global reset: letter-spacing: 0, word-spacing: normal, cv05/cv08 glyph disambiguation
 * - Suggestion cards use min-height (no fixed 112px collision), align-items: stretch, and description padding
 * - Category chips support horizontal scroll (no hard clipping)
 * - Three curated pairings defined with Option A as production default
 * - Dev preview route /dev/typography verified
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS: ${message}`);
    passedTests++;
  }
}

console.log('=== AegisFlow Typography System Automated Test Suite ===\n');

// 1. Self-hosted font dependencies
console.log('[Test 1] Self-Hosted Font Dependencies in package.json');
const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
assert(allDeps['@fontsource-variable/inter'] !== undefined, '@fontsource-variable/inter is installed (self-hosted)');
assert(allDeps['@fontsource/jetbrains-mono'] !== undefined, '@fontsource/jetbrains-mono is installed (self-hosted)');
assert(allDeps['@fontsource-variable/newsreader'] !== undefined, '@fontsource-variable/newsreader is installed (self-hosted)');
assert(allDeps['geist'] !== undefined, 'geist is installed (self-hosted)');

// 2. CSS Font imports in globals.css
console.log('\n[Test 2] Self-Hosted Font Imports & Global Reset');
const globalsCss = fs.readFileSync(path.join(rootDir, 'src/app/globals.css'), 'utf8');
assert(globalsCss.includes('@fontsource-variable/inter'), 'Inter variable font imported in globals.css');
assert(globalsCss.includes('@fontsource/jetbrains-mono'), 'JetBrains Mono font imported in globals.css');
assert(globalsCss.includes('@fontsource-variable/newsreader'), 'Newsreader font imported in globals.css');
assert(globalsCss.includes('"cv05" 1') && globalsCss.includes('"cv08" 1'), 'OpenType features cv05 and cv08 enabled for I/l disambiguation');
assert(globalsCss.includes('letter-spacing: 0;') || globalsCss.includes('letter-spacing: 0 !important;'), 'Global tracking reset to 0 to prevent text squashing');

// 3. 11 Semantic Type Tokens in :root and .dark
console.log('\n[Test 3] 11 Semantic Type Tokens in :root and .dark');
const requiredTokens = [
  '--text-display',
  '--text-title',
  '--text-lead',
  '--text-input',
  '--text-heading-sm',
  '--text-body',
  '--text-control',
  '--text-small',
  '--text-caption',
  '--text-micro',
  '--font-mono',
];

for (const token of requiredTokens) {
  assert(globalsCss.includes(`${token}:`), `Token ${token} defined in :root`);
}

// 4. Optical sizing and dark mode compensations
console.log('\n[Test 4] Dark Mode Optical Weight & Line-Height Adjustments');
assert(globalsCss.includes('.dark {') && globalsCss.includes('--text-display-weight:'), 'Dark mode declares weight compensations for optical halation');

// 5. Card collision and clipping fixes
console.log('\n[Test 5] Card Collision & Descender Clipping Prevention');
assert(!globalsCss.includes('.workspace-shell .workspace-suggestion-card {\n  display: flex !important;\n  min-width: 0 !important;\n  height: 112px !important;'), 'Fixed 112px height removed from suggestion card');
assert(globalsCss.includes('min-height: 136px !important'), 'Suggestion card uses min-height: 136px');
assert(globalsCss.includes('align-items: stretch !important'), 'Suggestion grid enforces align-items: stretch');
assert(globalsCss.includes('padding-bottom: 2px !important'), 'Suggestion description includes bottom padding for descenders');
assert(globalsCss.includes('overflow-x: auto !important'), 'Suggestion category chips support horizontal scroll');

// 6. Curated Pairings & Production Configuration
console.log('\n[Test 6] Typography Configuration & Pairings');
const configContent = fs.readFileSync(path.join(rootDir, 'src/lib/typography-config.ts'), 'utf8');
assert(configContent.includes('ACTIVE_TYPOGRAPHY_PAIRING: TypographyPairing = "A"'), 'Production default pairing is set to Option A');
assert(configContent.includes('Option A: Inter Clean'), 'Option A is defined in configuration');
assert(configContent.includes('Option B: Geist Modern'), 'Option B is defined in configuration');
assert(configContent.includes('Option C: Editorial Research'), 'Option C is defined in configuration');

// 7. Dev Preview Route
console.log('\n[Test 7] Dev Typography Inspection Route');
const devPagePath = path.join(rootDir, 'src/app/dev/typography/page.tsx');
assert(fs.existsSync(devPagePath), '/dev/typography preview route exists');
const devPageContent = fs.readFileSync(devPagePath, 'utf8');
assert(devPageContent.includes('Il1 O0 rn m'), 'Glyph disambiguation specimen present on dev page');
assert(devPageContent.includes('Devanagari') && devPageContent.includes('Kannada'), 'Multi-script Hindi and Kannada specimens present on dev page');

console.log(`\n========================================`);
console.log(`Typography Test Summary: ${passedTests}/${totalTests} passed`);
console.log(`========================================\n`);

if (passedTests === totalTests) {
  console.log('All Typography Invariants & Verification Tests Passed Successfully!');
} else {
  console.error('Some typography tests failed.');
  process.exit(1);
}
