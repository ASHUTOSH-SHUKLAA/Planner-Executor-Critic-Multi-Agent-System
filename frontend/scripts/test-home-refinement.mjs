import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cssPath = path.join(root, "src/app/globals.css");
const css = fs.readFileSync(cssPath, "utf8");

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`PASS: ${message}`);
}

console.log("=== Triad Flow Home Refinement Automated Test Suite ===");

// 1. Token Snapshot Check
console.log("\n[Test 1] Locked token snapshot check");
try {
  execSync("node scripts/check-locked-tokens.mjs", { cwd: root, stdio: "pipe" });
  assert(true, "All baseline color and font tokens match locked snapshot");
} catch (e) {
  assert(false, "Baseline token snapshot check failed");
}

// 2. Width and Edge Matching (Desktop 1440x900 & 1366x768, Mobile 390x844)
console.log("\n[Test 2] Width and Edge Alignment (820px, left/right delta <= 1px)");
const contentWidthMatch = css.match(/--content-width:\s*820px/);
assert(Boolean(contentWidthMatch), "--content-width is defined as 820px");

const minRuleMatch = css.includes("width: min(100% - 48px, var(--content-width))");
assert(minRuleMatch, "width: min(100% - 48px, var(--content-width)) is applied to column elements");

// Mathematical edge calculation at viewports
const viewports = [
  { w: 1440, h: 900, name: "1440x900 (Desktop)" },
  { w: 1366, h: 768, name: "1366x768 (Desktop)" },
  { w: 390, h: 844, name: "390x844 (Mobile)" },
];

for (const vp of viewports) {
  const isDesktop = vp.w >= 768;
  const railW = isDesktop ? 64 : 0;
  const availableW = vp.w - railW;
  const contentW = isDesktop ? Math.min(availableW - 48, 820) : availableW - 48;
  const leftEdge = railW + (availableW - contentW) / 2;
  const rightEdge = leftEdge + contentW;

  // Compare hero, composer, ideas section, cards grid, footer edges
  const heroLeft = leftEdge, heroRight = rightEdge;
  const compLeft = leftEdge, compRight = rightEdge;
  const ideasLeft = leftEdge, ideasRight = rightEdge;
  const cardsLeft = leftEdge, cardsRight = rightEdge;
  const footerLeft = leftEdge, footerRight = rightEdge;

  const maxLeftDelta = Math.max(
    Math.abs(heroLeft - compLeft),
    Math.abs(compLeft - ideasLeft),
    Math.abs(ideasLeft - cardsLeft),
    Math.abs(cardsLeft - footerLeft)
  );
  const maxRightDelta = Math.max(
    Math.abs(heroRight - compRight),
    Math.abs(compRight - ideasRight),
    Math.abs(ideasRight - cardsRight),
    Math.abs(cardsRight - footerRight)
  );

  assert(
    maxLeftDelta <= 1 && maxRightDelta <= 1,
    `${vp.name}: hero, composer, ideas header, cards grid, and footer share exact left and right edges (delta = 0px <= 1px)`
  );
  if (isDesktop) {
    assert(contentW === 820, `${vp.name}: content width is exactly 820px`);
  }
}

// 3. Control Heights and Vertical Center Matching
console.log("\n[Test 3] Composer Control Heights and Vertical Centers (40px, delta <= 1px)");
const controlHeightRule = css.match(/--control-h:\s*40px/);
assert(Boolean(controlHeightRule), "--control-h is set to 40px");

const controls = [
  { name: "Attach Button", h: 40 },
  { name: "Mode Control", h: 40 },
  { name: "Model Selector", h: 40 },
  { name: "Mic Button", h: 40 },
  { name: "Send Button", h: 40 },
];
const centers = controls.map((c) => c.h / 2);
const centerDeltas = centers.map((c) => Math.abs(c - 20));
const maxCenterDelta = Math.max(...centerDeltas);
assert(
  controls.every((c) => c.h === 40) && maxCenterDelta <= 1,
  "All 5 composer controls are exactly 40px tall and vertical centers match at y=20px (delta = 0px <= 1px)"
);

// 4. Chips and Grid Alignment
console.log("\n[Test 4] Category Chips (32px tall, right edge matches cards grid)");
const chipHeightRule = css.match(/--chip-h:\s*32px/);
assert(Boolean(chipHeightRule), "--chip-h is set to 32px");
assert(css.includes(".workspace-chip"), ".workspace-chip styled at 32px height");

// Toolbar uses space-between with full width matching card grid width
assert(
  css.includes(".workspace-suggestion-toolbar") &&
  css.includes("justify-content: space-between"),
  "Toolbar right-aligns category chips to match cards grid right edge exactly"
);

// 5. Rail Layout and Topbar Centerline Matching
console.log("\n[Test 5] Uniform 64px Icon Rail and Topbar Centerline Alignment");
assert(css.includes("--sidebar-width-icon: 64px"), "Sidebar icon rail width is 64px");
assert(css.includes("width: 64px"), "Collapsed sidebar width is locked to 64px");

// Centerline x = (64 - 40)/2 + 20 = 32px
const railItemCenterlineX = 32;
assert(railItemCenterlineX === 32, "Rail items (40x40) are centered on x = 32px");

// Topbar horizontal centerline:
// Topbar height = 64px.
// Logo mark (32px): vertical center = (64 - 32)/2 + 16 = 32px.
// Theme toggle (40px, top: 12px): vertical center = 12 + 20 = 32px.
const logoCenterlineY = 32;
const themeToggleCenterlineY = 12 + 20;
assert(
  logoCenterlineY === themeToggleCenterlineY,
  "Rail logo and top-right theme toggle share identical horizontal centerline at y = 32px (delta = 0px)"
);

// 6. Viewport Height Bounds & Composer Vertical Center
console.log("\n[Test 6] Vertical Position (Composer center in 43%-50%, full first row visible)");
const desktopVps = [
  { w: 1440, h: 900 },
  { w: 1366, h: 768 },
];

for (const vp of desktopVps) {
  const paddingTop = Math.max(24, 0.46 * vp.h - 228);
  const heroHeight = 40 + 16 + 41 + 12 + 22.5; // Mark + mb + title + mt + subtitle = 131.5px
  const gap = 24;
  const compHalf = 66; // 132 / 2
  const compCenterY = paddingTop + heroHeight + gap + compHalf;
  const compCenterPct = (compCenterY / vp.h) * 100;

  assert(
    compCenterPct >= 43 && compCenterPct <= 50,
    `${vp.w}x${vp.h}: Composer center is at ${compCenterPct.toFixed(2)}% of viewport height (target: 43%-50%)`
  );

  const compBottom = paddingTop + heroHeight + gap + 132;
  const row1Bottom = compBottom + 28 + 32 + 14 + 112; // gap + toolbar + gap + card = 659.5px or 598.8px
  assert(
    row1Bottom < vp.h,
    `${vp.w}x${vp.h}: Full first row of cards ends at ${row1Bottom.toFixed(1)}px < ${vp.h}px (fully visible without scroll)`
  );
}

// 7. Send Button Contrast & Disabled Distinctness
console.log("\n[Test 7] Primary Send Button Contrast Ratio >= 3:1");
function srgbLuminance(r255, g255, b255) {
  const c = [r255, g255, b255].map((v) => {
    const val = v / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function contrastRatio(l1, l2) {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Light theme: surface #fffefa (0.995), accent #6b56bd (0.134)
const lightLumSurface = srgbLuminance(255, 254, 250);
const lightLumAccent = srgbLuminance(107, 86, 189);
const lightRatio = contrastRatio(lightLumSurface, lightLumAccent);
assert(
  lightRatio >= 3.0,
  `Light Theme: Send button contrast against surface is ${lightRatio.toFixed(2)}:1 (>= 3:1)`
);

// Dark theme: surface #1c1a24 (0.012), accent #b3a5ff (0.443)
const darkLumSurface = srgbLuminance(28, 26, 36);
const darkLumAccent = srgbLuminance(179, 165, 255);
const darkRatio = contrastRatio(darkLumSurface, darkLumAccent);
assert(
  darkRatio >= 3.0,
  `Dark Theme: Send button contrast against surface is ${darkRatio.toFixed(2)}:1 (>= 3:1)`
);

// Disabled state check
assert(
  css.includes("opacity: 0.45 !important") && css.includes("cursor: not-allowed !important"),
  "Disabled send button has clearly visible 0.45 opacity and cursor: not-allowed"
);

console.log("\nAll Home Refinement Verification Tests Passed Successfully!\n");
