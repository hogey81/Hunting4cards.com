import setInfo from "./set-info.json";

// Checks a card code read by the camera ("PFL DE 120/094") against the sets that
// exist. The "/094" is the most reliable part: it is plain digits, and only a
// few sets have exactly 94 cards. Among those, the set whose printed code is
// closest to the letters read wins, so a misread letter ("PEL", "DBF") is
// corrected, and letters read from a table or carpet don't match anything.

const SETS = setInfo as unknown as Record<string, [number, string[]]>;

export type ReadCode = { letters: string | null; language: string | null; number: string; total: number };

// "PFL DE 120/094", "PFL 120/094" or "120/094", with the language code optional.
// Letters and language code can run together ("SVIEN"): the language is in its own
// small box on the card, which the camera often reads without the space.
const CODE = /(?:\b([A-Z0-9]{2,6})\s+)?(?:(EN|DE|FR|IT|ES|PT|NL)\s+)?(\d{1,3})\s*\/\s*(\d{2,3})\b/;
const JOINED = /^([A-Z0-9]{2,4})(EN|DE|FR|IT|ES|PT|NL)$/;

export function readCode(text: string): ReadCode | null {
  const m = text.toUpperCase().match(CODE);
  if (!m) return null;
  let [, letters, language] = m;
  const [, , , number, total] = m;
  const joined = !language && letters?.match(JOINED);
  if (joined) [, letters, language] = joined;
  if (letters && letters.length > 4) letters = letters.slice(-4);
  return { letters: letters ?? null, language: language ?? null, number, total: Number(total) };
}

// A set code ("SVI") written in the text; codes shorter than 3 letters match too easily.
function inText(flat: string, code: string) {
  const c = code.replace(/[^A-Z0-9]/g, "");
  return c.length >= 3 && flat.includes(c);
}

// All sets with as many cards as the "/198" that was read, likeliest first: a set
// whose printed code appears anywhere in the text read ("G SVIEN 047/198"), then
// by how close its code is to the letters read.
export function setsForTotal(code: ReadCode, text: string): string[] {
  const flat = text.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const score = (codes: string[]) =>
    codes.some((c) => inText(flat, c))
      ? -1
      : code.letters
        ? Math.min(...codes.map((c) => distance(code.letters!, c)))
        : 0;
  return Object.entries(SETS)
    .filter(([, [count]]) => count === code.total)
    .map(([id, [, codes]]) => ({ id, s: score(codes) }))
    .sort((a, b) => a.s - b.s)
    .map((x) => x.id);
}

// Characters that text recognition mixes up count as half a difference.
const LOOKALIKE = new Set(["O0", "0O", "OD", "DO", "I1", "1I", "IL", "LI", "S5", "5S", "B8", "8B", "GC", "CG", "EF", "FE", "PR", "RP"]);

function distance(a: string, b: string) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const swap = a[i - 1] === b[j - 1] ? 0 : LOOKALIKE.has(a[i - 1] + b[j - 1]) ? 0.5 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + swap);
    }
  }
  return d[a.length][b.length];
}

// The set this code belongs to, or null when that isn't clear.
export function setForCode(code: ReadCode): string | null {
  return matchSet(code)?.id ?? null;
}

// Also tells whether the letters were read exactly as printed: then one read is
// enough to trust it.
export function matchSet(code: ReadCode, text = ""): { id: string; sure: boolean } | null {
  // The set code itself in the text read: that set, if it is the only one.
  const flat = text.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (flat) {
    const written = Object.entries(SETS).filter(
      ([, [count, codes]]) => count === code.total && codes.some((c) => inText(flat, c)),
    );
    if (written.length === 1) return { id: written[0][0], sure: true };
  }
  const sameSize = Object.entries(SETS).filter(([, [count]]) => count === code.total);
  if (!sameSize.length) return null;
  if (!code.letters) return sameSize.length === 1 ? { id: sameSize[0][0], sure: false } : null;
  const scored = sameSize
    .map(([id, [, codes]]) => ({ id, d: Math.min(...codes.map((c) => distance(code.letters!, c))) }))
    .sort((a, b) => a.d - b.d);
  const [best, next] = scored;
  // Close enough, and clearly closer than any other set of the same size.
  return best.d <= 1 && (!next || next.d > best.d) ? { id: best.id, sure: best.d === 0 } : null;
}

// Whether this set has that many cards after the slash. Unknown sets pass.
export function totalFits(setId: string, total: number) {
  const known = SETS[setId];
  return !known || known[0] === total;
}
