import type { Region } from "./tcgdex";

// A card reference is the TCGdex id, prefixed with "ja:" for Japanese cards
// ("me05-048" or "ja:M4-001"). The collection stores these references.

export function parseRef(ref: string): { region: Region; id: string } {
  return ref.startsWith("ja:") ? { region: "ja", id: ref.slice(3) } : { region: "en", id: ref };
}

export function toRef(region: Region, id: string) {
  return region === "ja" ? `ja:${id}` : id;
}

export function cardHref(ref: string) {
  const { region, id } = parseRef(ref);
  return region === "ja" ? `/jp/kaart/${encodeURIComponent(id)}` : `/kaart/${encodeURIComponent(id)}`;
}

export function setHref(region: Region, setId: string) {
  return region === "ja" ? `/jp/sets/${encodeURIComponent(setId)}` : `/sets/${encodeURIComponent(setId)}`;
}
