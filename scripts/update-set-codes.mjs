// Regenerates lib/set-codes.json (TCGdex set id -> official set code such as "PBL").
// Usage: node scripts/update-set-codes.mjs <path to a clone of github.com/tcgdex/cards-database>
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.argv[2];
if (!root) {
  console.error("Pass the path to a cards-database clone.");
  process.exit(1);
}

const data = join(root, "data");
const codes = {};
for (const serie of readdirSync(data)) {
  const dir = join(data, serie);
  if (!statSync(dir).isDirectory()) continue;
  for (const file of readdirSync(dir)) {
    if (!file.endsWith(".ts")) continue;
    const src = readFileSync(join(dir, file), "utf8");
    const id = src.match(/\bid:\s*["']([^"']+)["']/)?.[1];
    const code = src.match(/abbreviations:\s*\{[^}]*?official:\s*["']([^"']+)["']/s)?.[1];
    if (id && code) codes[id] = code;
  }
}

const sorted = Object.fromEntries(Object.entries(codes).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(new URL("../lib/set-codes.json", import.meta.url), JSON.stringify(sorted, null, 2) + "\n");
console.log(`Wrote ${Object.keys(sorted).length} set codes.`);
