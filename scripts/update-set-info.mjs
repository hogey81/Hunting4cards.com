// Regenerates lib/set-info.json, used by the scanner to check a code it read:
// per international set, the number of cards printed after the slash ("/197")
// and every set code printed on its cards (French cards print their own codes,
// e.g. "FLO" for Obsidian Flames). A misread code letter is corrected with it,
// and a code whose "/197" doesn't match the set is not trusted.
// Usage: node scripts/update-set-info.mjs <path to a clone of github.com/tcgdex/cards-database>
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.argv[2];
if (!root) {
  console.error("Pass the path to a cards-database clone.");
  process.exit(1);
}
const codes = JSON.parse(readFileSync("lib/set-codes.json", "utf8"));
const data = join(root, "data");
const info = {}; // set id -> [official count, codes]

for (const serie of readdirSync(data)) {
  const serieDir = join(data, serie);
  if (!statSync(serieDir).isDirectory()) continue;
  for (const file of readdirSync(serieDir)) {
    if (!file.endsWith(".ts")) continue;
    const src = readFileSync(join(serieDir, file), "utf8");
    const id = src.match(/\bid:\s*["']([^"']+)["']/)?.[1];
    const official = Number(src.match(/official:\s*(\d+)/)?.[1]);
    if (!id || !official) continue;
    const abbr = src.match(/abbreviations:\s*\{([^}]*)\}/)?.[1] ?? "";
    const printed = [...abbr.matchAll(/:\s*["']([^"']+)["']/g)].map((m) => m[1].toUpperCase());
    const all = [...new Set([codes[id], ...printed].filter(Boolean))];
    if (all.length) info[id] = [official, all];
  }
}

writeFileSync("lib/set-info.json", JSON.stringify(info));
console.log(`${Object.keys(info).length} sets`);
