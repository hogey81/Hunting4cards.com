// One Piece Card Game from OPTCG API (https://optcgapi.com). Its prices are
// TCGplayer's in dollars, so the euro price comes from Cardmarket's daily files
// (game 18), matched on the card code in the product name: "Shanks (OP01-120)".
// Parallel and alternate-art prints ("OP01-120_p1") are their own cards.
import { cachedSetPrices, cardmarketPrices, cardmarketSearchUrl, codeInName } from "./cardmarket";
import { noPrice, type GameSet, type GameTile, type Provider } from "./types";

const BASE = "https://optcgapi.com/api";
const DAY = 24 * 3600;
const PROMO = "PROMO";

type RawCard = {
  card_name: string;
  set_name: string;
  card_set_id: string;
  card_image_id: string;
  card_image?: string;
  rarity?: string;
  card_type?: string;
  card_color?: string;
  card_cost?: string | number | null;
  card_power?: string | number | null;
  counter_amount?: string | number | null;
  life?: string | number | null;
  attribute?: string | null;
  sub_types?: string | null;
  card_text?: string | null;
  market_price?: number | null;
};

async function get<T>(path: string): Promise<T | null> {
  const res = await fetch(`${BASE}${path}`, { next: { revalidate: DAY } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`OPTCG API ${path} gaf status ${res.status}`);
  return (await res.json()) as T;
}

type SetInfo = { code: string; name: string; group: string; path: string };

async function setInfos(): Promise<SetInfo[]> {
  const [boosters, decks] = await Promise.all([
    get<{ set_name: string; set_id: string }[]>("/allSets/"),
    get<{ structure_deck_name: string; structure_deck_id: string }[]>("/allDecks/"),
  ]);
  // The lists come oldest first.
  return [
    ...(boosters ?? []).reverse().map((s) => ({ code: s.set_id, name: s.set_name, group: "Boosters", path: `/sets/${s.set_id}/` })),
    ...(decks ?? []).reverse().map((s) => ({ code: s.structure_deck_id, name: s.structure_deck_name, group: "Starter decks", path: `/decks/${s.structure_deck_id}/` })),
    { code: PROMO, name: "Promokaarten", group: "Promo's", path: "/allPromos/" },
  ];
}

const byId = (a: RawCard, b: RawCard) => a.card_image_id.localeCompare(b.card_image_id, undefined, { numeric: true });

async function cardsOf(info: SetInfo): Promise<RawCard[]> {
  const list = (await get<RawCard[]>(info.path)) ?? [];
  const seen = new Set<string>();
  return list.filter((c) => !seen.has(c.card_image_id) && seen.add(c.card_image_id)).sort(byId);
}

const findSet = async (code: string) => (await setInfos()).find((s) => s.code.toLowerCase() === code.toLowerCase()) ?? null;

const version = (c: RawCard) => {
  const m = c.card_image_id.match(/_p(\d+)$/i);
  return m ? `Parallel ${m[1]}` : null;
};
const toTile = (setCode: string, c: RawCard): GameTile => ({
  ref: `op:${setCode}/${c.card_image_id}`,
  name: c.card_name,
  image: c.card_image ?? null,
  code: c.card_set_id,
  sub: [c.rarity, version(c)].filter(Boolean).join(" · "),
});
const toSet = (s: SetInfo, total: number): GameSet => ({ code: s.code, name: s.name, total, date: null, image: null, group: s.group });

function setPrices(info: SetInfo, cards: RawCard[]) {
  return cachedSetPrices(`op:${info.code}`, () => cardmarketPrices(18, codeInName, cards.map((c) => c.card_set_id)));
}

export const onepiece: Provider = {
  prefix: "op",
  name: "One Piece Card Game",
  languages: ["EN", "FR", "JP"],
  searchHint: "Naam of code, bv. Shanks of OP01-120",
  foilLabel: null,
  async getSets() {
    const infos = await setInfos();
    const counts = await Promise.all(infos.map((s) => cardsOf(s).then((c) => c.length).catch(() => 0)));
    return infos.map((s, i) => toSet(s, counts[i]));
  },
  async getSet(code) {
    const info = await findSet(code);
    if (!info) return null;
    const cards = await cardsOf(info);
    return { set: toSet(info, cards.length), cards: cards.map((c) => toTile(info.code, c)) };
  },
  async getCard(ref) {
    const [setCode, id] = ref.slice(3).split("/");
    const info = await findSet(setCode ?? "");
    if (!info) return null;
    const list = await cardsOf(info);
    const at = list.findIndex((c) => c.card_image_id === id);
    if (at < 0) return null;
    const c = list[at];
    const cm = (await setPrices(info, list))[at] ?? null;
    const stat = (label: string, v: unknown) => (v != null && v !== "" && v !== "-" && v !== "NULL" ? `${label} ${v}` : null);
    return {
      set: toSet(info, list.length),
      prev: at > 0 ? toTile(info.code, list[at - 1]) : null,
      next: at < list.length - 1 ? toTile(info.code, list[at + 1]) : null,
      card: {
        ...toTile(info.code, c),
        bigImage: c.card_image ?? null,
        rarity: c.rarity ?? null,
        facts: [c.card_type, c.card_color, stat("Kosten", c.card_cost), stat("Kracht", c.card_power), stat("Counter", c.counter_amount), stat("Leven", c.life), c.sub_types].filter((f): f is string => !!f),
        text: c.card_text ?? null,
        normal: cm?.normal ?? noPrice,
        foil: null,
        otherPrice: !cm?.normal.trend && c.market_price ? { label: "Prijs (TCGplayer, in dollars)", value: `$ ${c.market_price.toFixed(2).replace(".", ",")}` } : null,
        priceNote: cm
          ? "Cardmarket-prijs uit de dagelijkse prijslijst, gekoppeld op de kaartcode. Bij parallelle en alternatieve versies kan de koppeling soms naast zitten."
          : "Geen Cardmarket-prijs gevonden voor deze kaart.",
        cardmarketUrl: cardmarketSearchUrl("OnePiece", c.card_set_id),
        others: [],
      },
    };
  },
  async search(q) {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    // OPTCG API has no name search; look through the sets (cached for a day).
    const infos = await setInfos();
    const lists = await Promise.all(infos.map((s) => cardsOf(s).catch(() => [] as RawCard[])));
    const found: GameTile[] = [];
    infos.forEach((info, i) => {
      for (const c of lists[i]) {
        if (c.card_name.toLowerCase().includes(needle) || c.card_set_id.toLowerCase() === needle) found.push({ ...toTile(info.code, c), sub: info.name });
      }
    });
    return found.slice(0, 60);
  },
};
