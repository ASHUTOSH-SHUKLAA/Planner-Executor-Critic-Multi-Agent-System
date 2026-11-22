import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = path.join(root, "src");

const fontSizes = {};
const fontWeights = {};
const lineHeights = {};
const letterSpacings = {};
const wordSpacings = {};

function addCount(obj, val) {
  if (!val) return;
  const clean = val.trim();
  obj[clean] = (obj[clean] || 0) + 1;
}

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");

  // CSS rules
  const cssFontSize = [...content.matchAll(/font-size:\s*([^;!}\n]+)/g)];
  for (const [, m] of cssFontSize) addCount(fontSizes, m);

  const cssFontWeight = [...content.matchAll(/font-weight:\s*([^;!}\n]+)/g)];
  for (const [, m] of cssFontWeight) addCount(fontWeights, m);

  const cssLineHeight = [...content.matchAll(/line-height:\s*([^;!}\n]+)/g)];
  for (const [, m] of cssLineHeight) addCount(lineHeights, m);

  const cssLetterSpacing = [...content.matchAll(/letter-spacing:\s*([^;!}\n]+)/g)];
  for (const [, m] of cssLetterSpacing) addCount(letterSpacings, m);

  const cssWordSpacing = [...content.matchAll(/word-spacing:\s*([^;!}\n]+)/g)];
  for (const [, m] of cssWordSpacing) addCount(wordSpacings, m);

  // Short font property: font: 600 12px/1 ... or font: 700 10px/1 ...
  const cssShortFont = [...content.matchAll(/font:\s*(\d+)\s+([\d.]+px)(?:\/([\d.]+))?\s+([^;!}\n]+)/g)];
  for (const [, w, s, lh] of cssShortFont) {
    addCount(fontWeights, w);
    addCount(fontSizes, s);
    if (lh) addCount(lineHeights, lh);
  }

  // Tailwind class matches
  const tailwindTextSize = [...content.matchAll(/\btext-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|\[[^\]]+\])\b/g)];
  for (const [, m] of tailwindTextSize) {
    if (!["left", "right", "center", "justify", "start", "end"].includes(m) && !m.includes("color") && !m.includes("#") && !m.includes("rgb") && !m.includes("var(")) {
      addCount(fontSizes, `tailwind: text-${m}`);
    }
  }

  const tailwindFontWeight = [...content.matchAll(/\bfont-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)\b/g)];
  for (const [, m] of tailwindFontWeight) addCount(fontWeights, `tailwind: font-${m}`);

  const tailwindLeading = [...content.matchAll(/\bleading-(none|tight|snug|normal|relaxed|loose|\[[^\]]+\]|\d+)\b/g)];
  for (const [, m] of tailwindLeading) addCount(lineHeights, `tailwind: leading-${m}`);

  const tailwindTracking = [...content.matchAll(/\btracking-(tighter|tight|normal|wide|wider|widest|\[[^\]]+\])\b/g)];
  for (const [, m] of tailwindTracking) addCount(letterSpacings, `tailwind: tracking-${m}`);
}

function traverse(dir) {
  for (const file of fs.readdirSync(dir)) {
    const full = path.join(dir, file);
    if (fs.statSync(full).isDirectory()) {
      traverse(full);
    } else if (/\.(css|tsx|ts|jsx|js)$/.test(file)) {
      scanFile(full);
    }
  }
}

traverse(srcDir);

function printSorted(title, obj) {
  console.log(`\n### ${title} (${Object.keys(obj).length} distinct values)`);
  const sorted = Object.entries(obj).sort((a, b) => b[1] - a[1]);
  for (const [k, v] of sorted) {
    console.log(`- \`${k}\`: ${v}`);
  }
}

console.log("=== TYPOGRAPHY AUDIT SUMMARY ===");
printSorted("Font Sizes", fontSizes);
printSorted("Font Weights", fontWeights);
printSorted("Line Heights", lineHeights);
printSorted("Letter Spacings", letterSpacings);
printSorted("Word Spacings", wordSpacings);

fs.writeFileSync(path.join(root, "scripts/audit-data.json"), JSON.stringify({
  fontSizes, fontWeights, lineHeights, letterSpacings, wordSpacings
}, null, 2));
