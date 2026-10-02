import type { Region } from "./tcgdex";
import { YGO_PREFIX, ygoCardHref, ygoSetHref } from "./ygo";

// A card reference is the TCGdex id, prefixed with "ja:" for Japanese cards
// ("me05-048" or "ja:M4-001"), or a Yu-Gi-Oh! print ("ygo:LOB-EN001~UR", see lib/ygo.ts).
// The collection stores these references.

export function parseRef(ref: string): { region: Region; id: string } {
  return ref.startsWith("ja:") ? { region: "ja", id: ref.slice(3) } : { region: "en", id: ref };
}

export function toRef(region: Region, id: string) {
  return region === "ja" ? `ja:${id}` : id;
}

export const isYgo = (ref: string) => ref.startsWith(YGO_PREFIX);

export function cardHref(ref: string) {
  if (isYgo(ref)) return ygoCardHref(ref);
  const { region, id } = parseRef(ref);
  return region === "ja" ? `/jp/kaart/${encodeURIComponent(id)}` : `/kaart/${encodeURIComponent(id)}`;
}

export function setHref(region: Region, setId: string) {
  return region === "ja" ? `/jp/sets/${encodeURIComponent(setId)}` : `/sets/${encodeURIComponent(setId)}`;
}

// The sets the collection has cards from, as references like "me05" or "ja:M4"
// (card references are "<set>-<number>").
export function mySetRefs(entries: { cardId: string }[]) {
  return [...new Set(entries.map((e) => e.cardId.slice(0, Math.max(0, e.cardId.lastIndexOf("-")))).filter(Boolean))];
}

// Link for a set reference from mySetRefs ("me05", "ja:M4" or "ygo:LOB").
export function setRefHref(ref: string) {
  if (isYgo(ref)) return ygoSetHref(ref.slice(YGO_PREFIX.length));
  const { region, id } = parseRef(ref);
  return setHref(region, id);
}
