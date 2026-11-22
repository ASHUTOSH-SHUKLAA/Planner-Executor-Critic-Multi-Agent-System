import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const css = fs.readFileSync(path.join(root, "src/app/globals.css"), "utf8");
const snapshotPath = path.join(root, "scripts/home-locked-tokens.json");

function declarations(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const block = css.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\n\\}`, "m"))?.[1];
  if (!block) throw new Error(`Could not find token block: ${selector}`);
  return Object.fromEntries(
    [...block.matchAll(/^\s*(--[\w-]+)\s*:\s*([^;]+);/gm)]
      .filter(([name]) => !/^--(?:radius|shadow|content-width|topbar-h|space-unit|r-|control-h|chip-h|border-hairline|surface-elevated|text-|font-)/.test(name))
      .map(([, name, value]) => [name, value.trim().replace(/\s+/g, " ")])
  );
}

const bodyFont = css.match(/(?:^|\n)body\s*\{[^}]*?font-family:\s*([^;]+);/s)?.[1]
  ?.trim().replace(/\s+/g, " ");
if (!bodyFont) throw new Error("Could not find the body font stack");

const current = {
  light: declarations(":root"),
  dark: declarations(".dark"),
  fontStack: bodyFont,
};

if (process.argv.includes("--update")) {
  fs.writeFileSync(snapshotPath, `${JSON.stringify(current, null, 2)}\n`);
  console.log("Updated locked color and font token snapshot.");
  process.exit(0);
}

const expected = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
if (JSON.stringify(current) !== JSON.stringify(expected)) {
  console.error("Locked colors or font stack changed. Review the change before updating the snapshot.");
  process.exit(1);
}
console.log("Locked colors and font stack match the baseline.");
