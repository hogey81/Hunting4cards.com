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
