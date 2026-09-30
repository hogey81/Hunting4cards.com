import codes from "./set-codes.json";
import type { Card, CardSet } from "./tcgdex";

const SET_CODES: Record<string, string> = codes;

// Cardmarket product pages look like
//   /en/Pokemon/Products/Singles/Obsidian-Flames/Charizard-ex-V4-OBF228
// set name, card name, "-V<n>" when the set has more cards with that name
// (numbered in card order), then the set code with the number as printed.
function slug(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’.,:!?()&]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// The oldest sets (Base Set to Gym) follow other rules on Cardmarket, e.g. "Bill-V1-BS91".
const IRREGULAR_SERIES = new Set(["base", "gym"]);

const byNumber = (a: { localId: string }, b: { localId: string }) =>
  a.localId.localeCompare(b.localId, undefined, { numeric: true });

// Returns null when we can't build it reliably; the caller then links to Cardmarket's search.
export function cardmarketProductUrl(card: Card, set: Pick<CardSet, "cards" | "serie"> | null): string | null {
  const code = SET_CODES[card.set.id];
  if (!code || !set || IRREGULAR_SERIES.has(set.serie?.id)) return null;
  const sameName = set.cards.filter((c) => c.name === card.name).sort(byNumber);
  const index = sameName.findIndex((c) => c.id === card.id);
  const version = sameName.length > 1 && index >= 0 ? `-V${index + 1}` : "";
  return `https://www.cardmarket.com/en/Pokemon/Products/Singles/${slug(card.set.name)}/${slug(card.name)}${version}-${code}${card.localId}`;
}
