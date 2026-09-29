// All card data comes from TCGdex (https://tcgdex.dev). Keep every call to it in
// this file so the source can be swapped later (e.g. the Cardmarket price guide).

const BASE = "https://api.tcgdex.net/v2";

// "en" holds the international cards, "ja" the Japanese ones (their own sets and numbers).
export type Region = "en" | "ja";

// Upstream prices refresh once a day; re-checking hourly keeps us close behind.
const REVALIDATE_SECONDS = 3600;

export type CardmarketPricing = {
  updated?: number | string;
  unit?: string;
  avg?: number;
  low?: number;
  trend?: number;
  avg1?: number;
  avg7?: number;
  avg30?: number;
  "avg-holo"?: number;
  "low-holo"?: number;
  "trend-holo"?: number;
  "avg1-holo"?: number;
  "avg7-holo"?: number;
  "avg30-holo"?: number;
};

export type CardResume = {
  id: string;
  localId: string;
  name: string;
  image?: string;
};

export type SetResume = {
  id: string;
  name: string;
  logo?: string;
  symbol?: string;
  cardCount: { total: number; official: number };
};

export type Card = CardResume & {
  rarity?: string;
  category?: string;
  illustrator?: string;
  hp?: number;
  types?: string[];
  variants?: {
    normal?: boolean;
    reverse?: boolean;
    holo?: boolean;
    firstEdition?: boolean;
  };
  set: SetResume;
  dexId?: number[];
  pricing?: { cardmarket?: CardmarketPricing | null };
};

export type CardSet = SetResume & {
  releaseDate?: string;
  serie: { id: string; name: string };
  cards: CardResume[];
};

export type Serie = {
  id: string;
  name: string;
  logo?: string;
  sets: SetResume[];
};

async function get<T>(region: Region, path: string): Promise<T | null> {
  const res = await fetch(`${BASE}/${region}${path}`, {
    next: { revalidate: REVALIDATE_SECONDS },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`TCGdex ${region}${path} gaf status ${res.status}`);
  return (await res.json()) as T;
}

export function getCard(id: string, region: Region = "en") {
  return get<Card>(region, `/cards/${encodeURIComponent(id)}`);
}

export function getSet(id: string, region: Region = "en") {
  return get<CardSet>(region, `/sets/${encodeURIComponent(id)}`);
}

export function getSerie(id: string, region: Region = "en") {
  return get<Serie>(region, `/series/${encodeURIComponent(id)}`);
}

export async function getSeries(region: Region = "en") {
  return (await get<{ id: string; name: string; logo?: string }[]>(region, "/series")) ?? [];
}

export async function searchCards(name: string, region: Region = "en") {
  const q = encodeURIComponent(`like:${name}`);
  return (await get<CardResume[]>(region, `/cards?name=${q}&pagination:itemsPerPage=60`)) ?? [];
}

// TCGdex serves images without an extension; the quality and format are appended.
export function cardImage(image: string | undefined, quality: "low" | "high" = "low") {
  return image ? `${image}/${quality}.webp` : null;
}

export function assetImage(base: string | undefined) {
  return base ? `${base}.webp` : null;
}
