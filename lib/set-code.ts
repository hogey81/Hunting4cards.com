import codes from "./set-codes.json";
import jpSets from "./jp-sets.json";
import { parseRef } from "./card-ref";
import { gameCardCode, gameOf } from "./games/refs";

const SET_CODES: Record<string, string> = codes;

type SetLike = { id: string; tcgOnline?: string; abbreviation?: { official?: string } };

// The official set code printed on cards (e.g. "PBL" for Pitch Black).
// Falls back to the API's own fields, then to the TCGdex id.
export function setCode(set: string | SetLike): string {
  const id = typeof set === "string" ? set : set.id;
  const fromApi = typeof set === "string" ? undefined : set.abbreviation?.official ?? set.tcgOnline;
  return SET_CODES[id] ?? fromApi ?? id.toUpperCase();
}

// TCGdex card ids are "<set id>-<number>", e.g. "me05-048".
export function setIdFromCardId(cardId: string) {
  const i = cardId.lastIndexOf("-");
  return i > 0 ? cardId.slice(0, i) : cardId;
}

// Takes a card reference ("me05-048" or "ja:M4-001"). Japanese cards print their set id.
export function cardCode(ref: string, localId?: string) {
  // Other games carry their code in the reference ("ygo:LOB-EN001~UR" -> "LOB-EN001").
  if (gameOf(ref)) return gameCardCode(ref);
  const { region, id } = parseRef(ref);
  const setId = setIdFromCardId(id);
  const number = localId ?? id.slice(setId.length + 1);
  return `${region === "ja" ? setId : setCode(setId)} ${number}`;
}

// Case-insensitive match against the Japanese set ids, e.g. "m4" -> "M4".
export function japaneseSetId(code: string): string | null {
  const wanted = code.trim().toUpperCase();
  return (jpSets as string[]).find((id) => id.toUpperCase() === wanted) ?? null;
}

// Reverse lookup: "pbl" -> ["me05"]. A few codes are shared by more than one set.
export function setIdsForCode(code: string): string[] {
  const wanted = code.trim().toUpperCase();
  return Object.entries(SET_CODES)
    .filter(([, c]) => c.toUpperCase() === wanted)
    .map(([id]) => id);
}

export type CodeQuery = { setIds: string[]; jpSetId: string | null; number: string | null };

// Parses queries like "PBL 048", "pbl48", "PBL-048", "PBL 048/084" or the Japanese "M4 001".
// Returns null when the text doesn't start with a known set code.
export function parseCodeQuery(q: string): CodeQuery | null {
  const text = q.trim();
  const whole = { setIds: setIdsForCode(text), jpSetId: japaneseSetId(text) };
  if (whole.setIds.length || whole.jpSetId) return { ...whole, number: null };
  const m = text.match(/^([A-Za-z0-9.-]+?)[\s-]*(\d+[A-Za-z]?)(?:\s*\/\s*\d+)?$/);
  if (!m) return null;
  const setIds = setIdsForCode(m[1]);
  const jpSetId = japaneseSetId(m[1]);
  return setIds.length || jpSetId ? { setIds, jpSetId, number: m[2] } : null;
}

// "048" and "48" are the same card number.
export function sameCardNumber(a: string, b: string) {
  const norm = (s: string) => s.trim().toUpperCase().replace(/^0+(?=.)/, "");
  return norm(a) === norm(b);
}
