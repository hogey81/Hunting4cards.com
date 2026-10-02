// Yu-Gi-Oh! card data comes from YGOPRODeck (https://ygoprodeck.com/api-guide/).
// Keep every call to it in this file so the source can be swapped later.
//
// One card (e.g. Blue-Eyes White Dragon) is printed in many sets and rarities. A
// collector owns a print, so the app works with prints: "LOB-EN001" in Ultra Rare.
// Their reference in the collection is "ygo:<print code>~<rarity>", e.g.
// "ygo:LOB-EN001~UR", so the set reference ("ygo:LOB") is everything before the last "-".

import type { PriceInfo } from "./prices";

const BASE = "https://db.ygoprodeck.com/api/v7";
// YGOPRODeck updates its data and prices once a day.
const REVALIDATE_SECONDS = 24 * 3600;

export const YGO_PREFIX = "ygo:";

export type YgoSet = {
  name: string;
  code: string;
  total: number;
  date: string | null;
  image: string | null;
};

export type YgoPrint = {
  ref: string;
  code: string;
  rarity: string;
  rarityCode: string;
  setName: string;
};

export type YgoCard = {
  id: number;
  name: string;
  type: string;
  desc: string;
  atk?: number;
  def?: number;
  level?: number;
  race?: string;
  attribute?: string;
  imageId: number;
  // Cardmarket price as YGOPRODeck passes it on: one price for the card over all its prints.
  cardmarket: number | null;
  prints: YgoPrint[];
};

type RawSet = { set_name: string; set_code: string; num_of_cards: number; tcg_date?: string; set_image?: string };
type RawCard = {
  id: number;
  name: string;
  type: string;
  desc: string;
  atk?: number;
  def?: number;
  level?: number;
  race?: string;
  attribute?: string;
  card_sets?: { set_name: string; set_code: string; set_rarity: string; set_rarity_code?: string }[];
  card_images?: { id: number }[];
  card_prices?: { cardmarket_price?: string }[];
};

async function get<T>(path: string, revalidate = REVALIDATE_SECONDS): Promise<T | null> {
  const res = await fetch(`${BASE}${path}`, { next: { revalidate } });
  // YGOPRODeck answers 400 when nothing matches.
  if (res.status === 400 || res.status === 404) return null;
  if (!res.ok) throw new Error(`YGOPRODeck ${path} gaf status ${res.status}`);
  return (await res.json()) as T;
}

// "(UR)" -> "UR"; when the code is missing, the rarity's initials ("Ultra Rare" -> "UR").
function rarityCode(rarity: string, code?: string) {
  const fromCode = (code ?? "").replace(/[()]/g, "").trim();
  return fromCode || rarity.split(/\s+/).map((w) => w[0]).join("").toUpperCase() || "C";
}

export const printRef = (code: string, rarityCode: string) => `${YGO_PREFIX}${code}~${rarityCode}`;

export function parsePrintRef(ref: string): { code: string; rarityCode: string; setCode: string } | null {
  if (!ref.startsWith(YGO_PREFIX)) return null;
  const [code, rarityCode = ""] = ref.slice(YGO_PREFIX.length).split("~");
  const i = code.lastIndexOf("-");
  return { code, rarityCode, setCode: i > 0 ? code.slice(0, i) : code };
}

function toCard(raw: RawCard): YgoCard {
  const price = Number(raw.card_prices?.[0]?.cardmarket_price);
  return {
    id: raw.id,
    name: raw.name,
    type: raw.type,
    desc: raw.desc,
    atk: raw.atk,
    def: raw.def,
    level: raw.level,
    race: raw.race,
    attribute: raw.attribute,
    imageId: raw.card_images?.[0]?.id ?? raw.id,
    cardmarket: Number.isFinite(price) && price > 0 ? price : null,
    prints: (raw.card_sets ?? []).map((s) => {
      const rc = rarityCode(s.set_rarity, s.set_rarity_code);
      return { ref: printRef(s.set_code, rc), code: s.set_code, rarity: s.set_rarity, rarityCode: rc, setName: s.set_name };
    }),
  };
}

// All English (TCG) sets, newest first.
export async function getSets(): Promise<YgoSet[]> {
  const raw = (await get<RawSet[]>("/cardsets.php")) ?? [];
  return raw
    .map((s) => ({ name: s.set_name, code: s.set_code, total: s.num_of_cards, date: s.tcg_date ?? null, image: s.set_image ?? null }))
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}

export type YgoSetDetail = YgoSet & { cards: { card: YgoCard; print: YgoPrint }[] };

const byPrintCode = (a: { print: YgoPrint }, b: { print: YgoPrint }) =>
  a.print.code.localeCompare(b.print.code, undefined, { numeric: true }) || a.print.rarityCode.localeCompare(b.print.rarityCode);

// A set with every print in it, in card-number order. A few sets share a code
// (e.g. a set and its special edition); their cards are shown together.
export async function getSet(code: string): Promise<YgoSetDetail | null> {
  const wanted = code.toUpperCase();
  const sets = (await getSets()).filter((s) => s.code.toUpperCase() === wanted);
  if (!sets.length) return null;
  const lists = await Promise.all(
    sets.map((s) => get<{ data: RawCard[] }>(`/cardinfo.php?cardset=${encodeURIComponent(s.name)}`).catch(() => null)),
  );
  const names = new Set(sets.map((s) => s.name));
  const seen = new Set<string>();
  const cards: YgoSetDetail["cards"] = [];
  for (const raw of lists.flatMap((l) => l?.data ?? [])) {
    const card = toCard(raw);
    for (const print of card.prints) {
      if (!names.has(print.setName) || seen.has(print.ref)) continue;
      seen.add(print.ref);
      cards.push({ card, print });
    }
  }
  cards.sort(byPrintCode);
  const main = [...sets].sort((a, b) => b.total - a.total)[0];
  return { ...main, total: Math.max(main.total, cards.length), cards };
}

// One print with its card, plus the prints before and after it in the set.
export async function getPrint(ref: string) {
  const parsed = parsePrintRef(ref);
  if (!parsed) return null;
  const set = await getSet(parsed.setCode);
  if (!set) return null;
  const at = set.cards.findIndex((c) => c.print.ref === ref);
  if (at < 0) return null;
  return { set, ...set.cards[at], prev: set.cards[at - 1] ?? null, next: set.cards[at + 1] ?? null };
}

// Search by (part of) the card name. Returns cards, each with all their prints.
export async function searchCards(name: string): Promise<YgoCard[]> {
  const res = await get<{ data: RawCard[] }>(`/cardinfo.php?fname=${encodeURIComponent(name)}&num=60&offset=0`, 3600);
  return (res?.data ?? []).map(toCard).filter((c) => c.prints.length > 0);
}

// Card pictures go through our own route, which caches them: YGOPRODeck asks
// apps not to load their pictures straight from their server.
export function ygoImage(imageId: number, size: "small" | "big" = "small") {
  return `/api/ygo-img/${size}/${imageId}`;
}

export function ygoSetImage(code: string) {
  return `/api/ygo-img/set/${encodeURIComponent(code)}`;
}

export function ygoPrice(card: YgoCard): PriceInfo {
  return { trend: card.cardmarket, low: null, avg1: null, avg7: null, avg30: null, updated: null };
}

export function ygoCardmarketUrl(name: string) {
  return `https://www.cardmarket.com/en/YuGiOh/Products/Search?searchString=${encodeURIComponent(name)}`;
}
