// Regenerates lib/jp-sets.json: the ids of Japanese sets in TCGdex ("M4", "SV2a", ...).
// Japanese cards print this id as their set code, so it doubles as the searchable code.
// Usage: node scripts/update-jp-sets.mjs <path to a clone of github.com/tcgdex/cards-database>
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.argv[2];
if (!root) {
  console.error("Pass the path to a cards-database clone.");
  process.exit(1);
}

const data = join(root, "data-asia");
const ids = [];
for (const serie of readdirSync(data)) {
  const dir = join(data, serie);
  if (!statSync(dir).isDirectory()) continue;
  for (const file of readdirSync(dir)) {
    if (!file.endsWith(".ts")) continue;
    const src = readFileSync(join(dir, file), "utf8");
    const id = src.match(/\bid:\s*["']([^"']+)["']/)?.[1];
    // Only sets with a Japanese name; data-asia also holds Chinese-only sets.
    if (id && /\bja:\s*["']/.test(src)) ids.push(id);
  }
}

ids.sort((a, b) => a.localeCompare(b));
writeFileSync(new URL("../lib/jp-sets.json", import.meta.url), JSON.stringify(ids, null, 2) + "\n");
console.log(`Wrote ${ids.length} Japanese set ids.`);
