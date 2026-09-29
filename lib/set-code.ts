import codes from "./set-codes.json";

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

export function cardCode(cardId: string, localId?: string) {
  const setId = setIdFromCardId(cardId);
  const number = localId ?? cardId.slice(setId.length + 1);
  return `${setCode(setId)} ${number}`;
}

// Reverse lookup: "pbl" -> ["me05"]. A few codes are shared by more than one set.
export function setIdsForCode(code: string): string[] {
  const wanted = code.trim().toUpperCase();
  return Object.entries(SET_CODES)
    .filter(([, c]) => c.toUpperCase() === wanted)
    .map(([id]) => id);
}

// Parses queries like "PBL 048", "pbl48", "PBL-048" or "PBL 048/084".
// Returns null when the text doesn't start with a known set code.
export function parseCodeQuery(q: string): { setIds: string[]; number: string | null } | null {
  const text = q.trim();
  const onlyCode = setIdsForCode(text);
  if (onlyCode.length) return { setIds: onlyCode, number: null };
  const m = text.match(/^([A-Za-z0-9]+?)[\s-]*(\d+[A-Za-z]?)(?:\s*\/\s*\d+)?$/);
  if (!m) return null;
  const setIds = setIdsForCode(m[1]);
  return setIds.length ? { setIds, number: m[2] } : null;
}

// "048" and "48" are the same card number.
export function sameCardNumber(a: string, b: string) {
  const norm = (s: string) => s.trim().toUpperCase().replace(/^0+(?=.)/, "");
  return norm(a) === norm(b);
}
