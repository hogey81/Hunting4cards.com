// Regenerates lib/card-index.json, used by the scanner: the card name, attack
// names and ability names of every card in each printed language, each pointing
// to the cards that print them. The language whose words match also tells which
// language the scanned card is in. Text recognition often reads an attack name when the title is
// blurry, and together with the card number that finds the exact card.
// Usage: node scripts/update-card-index.mjs <path to a clone of github.com/tcgdex/cards-database>
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

const root = process.argv[2];
if (!root) {
  console.error("Pass the path to a cards-database clone.");
  process.exit(1);
}

export const normalize = (s) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const data = join(root, "data");
const sets = []; // [set id]
const dates = []; // release date per set, so newer printings can come first
const cards = []; // [set index, local id]
const LANGS = ["en", "de", "fr", "it", "es", "pt"];
const phrases = Object.fromEntries(LANGS.map((l) => [l, {}])); // language -> phrase -> [card index]

const namesIn = (block, lang) =>
  [...block.matchAll(new RegExp(`name:\\s*\\{[^}]*?[\\s{,]${lang}:\\s*"((?:[^"\\\\]|\\\\.)*)"`, "gs"))].map((m) => m[1]);

for (const serie of readdirSync(data)) {
  const serieDir = join(data, serie);
  if (!statSync(serieDir).isDirectory()) continue;
  for (const file of readdirSync(serieDir)) {
    if (!file.endsWith(".ts")) continue;
    const setDir = join(serieDir, basename(file, ".ts"));
    const setSrc = readFileSync(join(serieDir, file), "utf8");
    const setId = setSrc.match(/\bid:\s*["']([^"']+)["']/)?.[1];
    if (!setId || !statSync(setDir, { throwIfNoEntry: false })?.isDirectory()) continue;
    const setIndex = sets.push(setId) - 1;
    dates.push(setSrc.match(/releaseDate:\s*["']([^"']+)["']/)?.[1] ?? "");
    for (const cardFile of readdirSync(setDir)) {
      if (!cardFile.endsWith(".ts")) continue;
      const src = readFileSync(join(setDir, cardFile), "utf8");
      const nameBlock = src.match(/^\tname:\s*\{[^}]*\}/m)?.[0] ?? "";
      if (!namesIn(nameBlock, "en").length) continue; // no English version, so not on TCGdex /en
      const cardIndex = cards.push([setIndex, basename(cardFile, ".ts")]) - 1;
      const moveBlocks = [...src.matchAll(/^\t(?:attacks|abilities):\s*\[(.*?)^\t\]/gms)].map((m) => m[1]);
      for (const lang of LANGS) {
        const words = [...namesIn(nameBlock, lang), ...moveBlocks.flatMap((b) => namesIn(b, lang))];
        for (const phrase of new Set(words.map(normalize))) {
          if (phrase.length < 4) continue;
          (phrases[lang][phrase] ??= []).push(cardIndex);
        }
      }
    }
  }
}

writeFileSync(new URL("../lib/card-index.json", import.meta.url), JSON.stringify({ sets, dates, cards, phrases }));
console.log(`Indexed ${cards.length} cards; phrases per language: ${LANGS.map((l) => `${l} ${Object.keys(phrases[l]).length}`).join(", ")}.`);
