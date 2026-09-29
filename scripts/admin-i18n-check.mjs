// Lists dashboard strings that have no Arabic translation in src/admin/ar.ts.
// Usage: node scripts/admin-i18n-check.mjs [--json]
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx?|mjs)$/.test(name) && !p.endsWith("ar.ts")) out.push(p);
  }
  return out;
}

const found = new Set();
const lit = String.raw`"((?:[^"\\]|\\.)*)"`;
const patterns = [
  new RegExp(String.raw`\bt\(\s*` + lit, "g"),
  new RegExp(String.raw`\btranslate\([^,]+,\s*` + lit, "g"),
  new RegExp(String.raw`\b(?:label|title|empty|group|reason)\s*:\s*` + lit, "g"),
];
for (const file of walk("src/admin")) {
  const src = readFileSync(file, "utf8");
  for (const re of patterns) for (const m of src.matchAll(re)) found.add(JSON.parse(`"${m[1]}"`));
  // String arrays of plain sentences (e.g. CANCEL_REASONS, WEEKDAYS_EN).
  for (const m of src.matchAll(/(?:REASONS|WEEKDAYS_EN)\s*=\s*\[([\s\S]*?)\]/g)) {
    for (const s of m[1].matchAll(new RegExp(lit, "g"))) found.add(JSON.parse(`"${s[1]}"`));
  }
}
const arSrc = readFileSync("src/admin/ar.ts", "utf8");
const have = new Set([...arSrc.matchAll(new RegExp(lit + String.raw`\s*:`, "g"))].map((m) => JSON.parse(`"${m[1]}"`)));
const missing = [...found].filter((s) => /[A-Za-z]/.test(s) && !have.has(s)).sort();
if (process.argv.includes("--json")) console.log(JSON.stringify(missing, null, 0));
else {
  console.log(`${found.size} strings, ${missing.length} without Arabic`);
  for (const s of missing) console.log("  " + s);
}
