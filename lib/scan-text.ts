import { parseCodeQuery } from "./set-code";

// Turns the text read from a card photo into lookups the scan API can try.
// Modern cards print "PAL EN 123/193" at the bottom, older ones only "123/193";
// the name sits at the top, so it helps when the set code can't be read.

export type ScanMatch = { ref: string; name: string; code: string; image: string | null };

export type ScanHints = {
  codes: string[]; // "PAL 123", best guess first
  number: string | null; // "123"
  names: string[]; // words that could be the card name
};

const STOP_WORDS = new Set([
  "basic", "stage", "evolves", "from", "pokemon", "pokémon", "trainer", "item", "supporter", "stadium",
  "energy", "tool", "weakness", "resistance", "retreat", "illus", "nintendo", "creatures", "game", "freak",
  "ability", "attack", "damage", "your", "opponent", "active", "bench", "this", "that", "each", "card",
  "cards", "turn", "when", "then", "does", "more", "coin", "flip", "heads", "tails", "rule", "the", "and",
]);

export function hintsFromText(raw: string): ScanHints {
  const text = raw.replace(/[|]/g, "/").replace(/[“”"']/g, " ");
  const codes: string[] = [];
  let number: string | null = null;

  // "123/193", with the set code (and a language code) in front on newer cards.
  const numberRe = /(?:([A-Za-z0-9]{2,6})\s+)?(?:(?:EN|NL|DE|FR|IT|ES|PT)\s+)?([A-Z]{0,3}\d{1,3}[a-z]?)\s*\/\s*([A-Z]{0,3}\d{2,3})/g;
  for (const m of text.matchAll(numberRe)) {
    const [, code, num] = m;
    number ??= num;
    if (code && parseCodeQuery(`${code} ${num}`)?.number) codes.push(`${code.toUpperCase()} ${num}`);
  }

  // Set code and number printed without the "/total", e.g. promos "SVP EN 085".
  for (const m of text.matchAll(/\b([A-Z]{2,4})\s+(?:EN|NL|DE|FR|IT|ES|PT)\s+(\d{1,3})\b/g)) {
    if (parseCodeQuery(`${m[1]} ${m[2]}`)?.number) codes.push(`${m[1]} ${m[2]}`);
    number ??= m[2];
  }

  const names = [
    ...new Set(
      (text
        .replace(/evolves\s+from\s+\S+/gi, " ") // the previous stage, not this card
        .replace(/illus(?:trator)?\.?\s+[^\n]*/gi, " ") // the artist's name
        .match(/[A-Z][a-zé]{3,}/g) ?? []).filter((w) => !STOP_WORDS.has(w.toLowerCase())),
    ),
  ].slice(0, 4);

  return { codes: [...new Set(codes)], number, names };
}
