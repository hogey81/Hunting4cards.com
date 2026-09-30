import setInfo from "./set-info.json";

// Checks a card code read by the camera ("PFL DE 120/094") against the sets that
// exist. The "/094" is the most reliable part: it is plain digits, and only a
// few sets have exactly 94 cards. Among those, the set whose printed code is
// closest to the letters read wins, so a misread letter ("PEL", "DBF") is
// corrected, and letters read from a table or carpet don't match anything.

const SETS = setInfo as unknown as Record<string, [number, string[]]>;

export type ReadCode = { letters: string | null; language: string | null; number: string; total: number };

// "PFL DE 120/094", "PFL 120/094" or "120/094", with the language code optional.
const CODE = /(?:\b([A-Z0-9]{2,4})\s+)?(?:(EN|DE|FR|IT|ES|PT|NL)\s+)?(\d{1,3})\s*\/\s*(\d{2,3})\b/;

export function readCode(text: string): ReadCode | null {
  const m = text.toUpperCase().match(CODE);
  if (!m) return null;
  const [, letters, language, number, total] = m;
  return { letters: letters ?? null, language: language ?? null, number, total: Number(total) };
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
  const sameSize = Object.entries(SETS).filter(([, [count]]) => count === code.total);
  if (!sameSize.length) return null;
  if (!code.letters) return sameSize.length === 1 ? sameSize[0][0] : null;
  const scored = sameSize
    .map(([id, [, codes]]) => ({ id, d: Math.min(...codes.map((c) => distance(code.letters!, c))) }))
    .sort((a, b) => a.d - b.d);
  const [best, next] = scored;
  // Close enough, and clearly closer than any other set of the same size.
  return best.d <= 1 && (!next || next.d > best.d) ? best.id : null;
}

// Whether this set has that many cards after the slash. Unknown sets pass.
export function totalFits(setId: string, total: number) {
  const known = SETS[setId];
  return !known || known[0] === total;
}
