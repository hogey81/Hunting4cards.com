import pokemon from "pokemon";
import { parseCodeQuery } from "./set-code";

// Turns the text read from a card photo into lookups the scan API can try.
// Modern cards print "PAL EN 123/193" at the bottom, older ones only "123/193";
// the name sits at the top. Runs on the server (the Pokémon name list is large).

export type ScanMatch = { ref: string; name: string; code: string; image: string | null };

export type ScanHints = {
  codes: string[]; // "PAL 123", best guess first
  number: string | null; // "123"
  total: number | null; // "193" in "123/193": the size of the set
  pokemon: string[]; // Pokémon names found in the text, in reading order
  words: string[]; // other capitalised words (trainer cards), only used together with the number
};

const STOP_WORDS = new Set([
  "basic", "stage", "evolves", "from", "pokemon", "pokémon", "trainer", "item", "supporter", "stadium",
  "energy", "tool", "weakness", "resistance", "retreat", "illus", "nintendo", "creatures", "game", "freak",
  "ability", "attack", "damage", "your", "opponent", "opponents", "active", "bench", "benched", "this", "that",
  "each", "card", "cards", "turn", "when", "then", "does", "more", "coin", "flip", "heads", "tails", "rule",
  "the", "and", "share", "save", "price", "info", "during", "discard", "deck", "hand", "search", "shuffle",
]);

// Letters that text recognition often mixes up in set codes.
const LOOKALIKES: Record<string, string> = { O: "0", "0": "O", I: "1", "1": "I", S: "5", "5": "S", B: "8", "8": "B", G: "C", C: "G" };

function codeVariants(code: string): string[] {
  const up = code.toUpperCase();
  const out = new Set([up]);
  for (let i = 0; i < up.length; i++) {
    const swap = LOOKALIKES[up[i]];
    if (swap) out.add(up.slice(0, i) + swap + up.slice(i + 1));
  }
  return [...out];
}

// Pokémon names (lowercase, letters only) mapped to their proper spelling.
let NAMES: Map<string, string> | null = null;
function names() {
  NAMES ??= new Map(
    pokemon
      .all("en")
      .map((n): [string, string] => [n.toLowerCase().replace(/[^a-z]/g, ""), n])
      .filter(([key]) => key.length >= 4),
  );
  return NAMES;
}

// Allows one wrong, missing or extra letter, so "Yvelta1" still finds Yveltal.
function oneEditApart(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else { i++; j++; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

function findPokemon(text: string): string[] {
  const tokens = text.toLowerCase().split(/[^a-z0-9]+/).map((t) => t.replace(/[0-9]/g, (d) => ({ "1": "l", "0": "o", "5": "s" })[d] ?? d));
  const found: string[] = [];
  const all = names();
  tokens.forEach((token, i) => {
    // Two-word names such as "Mr Mime" or "Tapu Koko" are joined in the list.
    for (const candidate of [token, token + (tokens[i + 1] ?? "")]) {
      if (candidate.length < 4) continue;
      const exact = all.get(candidate);
      if (exact) { found.push(exact); return; }
    }
    if (token.length >= 5) {
      for (const [key, name] of all) {
        if (key[0] === token[0] && oneEditApart(key, token)) { found.push(name); return; }
      }
    }
  });
  return [...new Set(found)];
}

export function hintsFromText(raw: string): ScanHints {
  const text = raw.replace(/[|]/g, "/").replace(/[“”"']/g, " ");
  const codes: string[] = [];
  let number: string | null = null;
  let total: number | null = null;

  const addCode = (code: string, num: string) => {
    for (const variant of codeVariants(code)) {
      if (parseCodeQuery(`${variant} ${num}`)?.number) { codes.push(`${variant} ${num}`); return; }
    }
  };

  // "123/193", with the set code (and a language code) in front on newer cards.
  const numberRe = /(?:([A-Za-z0-9]{2,6})\s+)?(?:(?:EN|NL|DE|FR|IT|ES|PT)\s+)?([A-Z]{0,3}\d{1,3}[a-z]?)\s*\/\s*([A-Z]{0,3}\d{2,3})/g;
  for (const m of text.matchAll(numberRe)) {
    const [, code, num, of] = m;
    if (!number) {
      number = num;
      total = /^\d+$/.test(of) ? Number(of) : null;
    }
    if (code) addCode(code, num);
  }

  // Set code and number printed without the "/total", e.g. promos "SVP EN 085".
  for (const m of text.matchAll(/\b([A-Z0-9]{2,4})\s+(?:EN|NL|DE|FR|IT|ES|PT)\s+(\d{1,3})\b/g)) {
    addCode(m[1], m[2]);
    number ??= m[2];
  }

  const cleaned = text
    .replace(/evolves\s+from\s+\S+/gi, " ") // the previous stage, not this card
    .replace(/illus(?:trator)?\.?\s+[^\n]*/gi, " "); // the artist's name
  const found = findPokemon(cleaned);
  const words = [
    ...new Set((cleaned.match(/\b[A-Z][a-zé]{3,}\b/g) ?? []).filter((w) => !STOP_WORDS.has(w.toLowerCase()))),
  ].slice(0, 4);

  return { codes: [...new Set(codes)], number, total, pokemon: found.slice(0, 4), words };
}

export function describeHints(h: ScanHints) {
  if (h.codes.length) return h.codes[0];
  const name = h.pokemon[0] ?? (h.number ? h.words[0] : undefined);
  const num = h.number ? (h.total ? `${h.number}/${h.total}` : h.number) : null;
  return [name, num].filter(Boolean).join(" ") || "niets leesbaars";
}
