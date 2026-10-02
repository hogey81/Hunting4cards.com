// Magic: The Gathering from Scryfall (https://scryfall.com/docs/api). Scryfall's
// euro prices are Cardmarket's, per print and for the foil print separately.
import { euroPrice, type GameSet, type GameTile, type Provider } from "./types";

const BASE = "https://api.scryfall.com";
const DAY = 24 * 3600;
// Scryfall asks every app to identify itself.
const HEADERS = { "User-Agent": "Hunting4Cards/1.0 (+https://www.hunting4cards.com)", Accept: "application/json" };

type RawSet = { code: string; name: string; released_at?: string; card_count: number; digital: boolean; set_type: string; icon_svg_uri?: string };
type Face = { name: string; type_line?: string; oracle_text?: string; image_uris?: Record<string, string> };
type RawCard = {
  id: string;
  oracle_id?: string;
  name: string;
  set: string;
  set_name: string;
  collector_number: string;
  rarity: string;
  type_line?: string;
  oracle_text?: string;
  mana_cost?: string;
  power?: string;
  toughness?: string;
  image_uris?: Record<string, string>;
  card_faces?: Face[];
  finishes?: string[];
  prices?: { eur?: string | null; eur_foil?: string | null };
  purchase_uris?: { cardmarket?: string };
};
type List<T> = { data: T[]; has_more?: boolean; next_page?: string };

async function get<T>(url: string, revalidate = DAY): Promise<T | null> {
  const res = await fetch(url.startsWith("http") ? url : `${BASE}${url}`, { headers: HEADERS, next: { revalidate } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Scryfall ${url} gaf status ${res.status}`);
  return (await res.json()) as T;
}

// A search with all its pages (Scryfall gives 175 cards per page).
async function searchAll(q: string, extra = "", maxPages = 12): Promise<RawCard[]> {
  const cards: RawCard[] = [];
  let url: string | undefined = `/cards/search?q=${encodeURIComponent(q)}${extra}`;
  for (let page = 0; url && page < maxPages; page++) {
    const res: List<RawCard> | null = await get<List<RawCard>>(url);
    if (!res) break;
    cards.push(...res.data);
    url = res.has_more ? res.next_page : undefined;
  }
  return cards;
}

// Sets you can collect on paper; no online-only, token or memorabilia sets.
const SKIP_TYPES = new Set(["token", "memorabilia", "alchemy", "minigame", "treasure_chest"]);

const RARITY: Record<string, string> = { common: "Common", uncommon: "Uncommon", rare: "Rare", mythic: "Mythic", special: "Special", bonus: "Bonus" };

const image = (c: RawCard, size: "small" | "normal") => c.image_uris?.[size] ?? c.card_faces?.[0]?.image_uris?.[size] ?? null;
const ref = (c: RawCard) => `mtg:${c.set}/${c.collector_number}`;
const code = (c: RawCard) => `${c.set.toUpperCase()} ${c.collector_number}`;

const toTile = (c: RawCard): GameTile => ({ ref: ref(c), name: c.name, image: image(c, "small"), code: code(c), sub: RARITY[c.rarity] ?? c.rarity });
const toSet = (s: RawSet): GameSet => ({ code: s.code, name: s.name, total: s.card_count, date: s.released_at ?? null, image: s.icon_svg_uri ?? null });

const byNumber = (a: RawCard, b: RawCard) => a.collector_number.localeCompare(b.collector_number, undefined, { numeric: true });

async function setCards(code: string) {
  return (await searchAll(`e:${code}`, "&unique=prints&order=set&include_extras=true&include_variations=true")).sort(byNumber);
}

export const magic: Provider = {
  prefix: "mtg",
  name: "Magic: The Gathering",
  languages: ["EN", "DE", "FR", "IT", "ES", "PT", "JP"],
  searchHint: "Naam, bv. Lightning Bolt",
  foilLabel: "Foil",
  async getSets() {
    const res = await get<List<RawSet>>("/sets");
    return (res?.data ?? [])
      .filter((s) => !s.digital && s.card_count > 0 && !SKIP_TYPES.has(s.set_type))
      .map(toSet)
      .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  },
  async getSet(code) {
    const raw = await get<RawSet>(`/sets/${encodeURIComponent(code.toLowerCase())}`);
    if (!raw) return null;
    const cards = await setCards(raw.code);
    return { set: { ...toSet(raw), total: Math.max(raw.card_count, cards.length) }, cards: cards.map(toTile) };
  },
  async getCard(cardRef) {
    const [setCode, number] = cardRef.slice(4).split("/");
    if (!setCode || !number) return null;
    const c = await get<RawCard>(`/cards/${encodeURIComponent(setCode)}/${encodeURIComponent(number)}`);
    if (!c) return null;
    const [setInfo, list, prints] = await Promise.all([
      get<RawSet>(`/sets/${encodeURIComponent(c.set)}`).catch(() => null),
      setCards(c.set).catch(() => [] as RawCard[]),
      c.oracle_id ? searchAll(`oracleid:${c.oracle_id}`, "&unique=prints&order=released", 1).catch(() => [] as RawCard[]) : Promise.resolve([] as RawCard[]),
    ]);
    const at = list.findIndex((x) => x.id === c.id);
    const face = c.card_faces?.[0];
    const facts = [c.type_line ?? face?.type_line, c.mana_cost, c.power != null ? `${c.power}/${c.toughness}` : null].filter((f): f is string => !!f);
    const hasFoil = c.finishes ? c.finishes.some((f) => f !== "nonfoil") : true;
    return {
      set: setInfo ? toSet(setInfo) : { code: c.set, name: c.set_name, total: list.length, date: null, image: null },
      prev: at > 0 ? toTile(list[at - 1]) : null,
      next: at >= 0 && at < list.length - 1 ? toTile(list[at + 1]) : null,
      card: {
        ...toTile(c),
        bigImage: image(c, "normal"),
        rarity: RARITY[c.rarity] ?? c.rarity,
        facts,
        text: c.oracle_text ?? c.card_faces?.map((f) => f.oracle_text).filter(Boolean).join("\n\n") ?? null,
        normal: euroPrice(c.prices?.eur),
        foil: hasFoil ? euroPrice(c.prices?.eur_foil) : null,
        otherPrice: null,
        priceNote: "Cardmarket-prijs van deze druk, via Scryfall en dagelijks bijgewerkt.",
        cardmarketUrl: c.purchase_uris?.cardmarket ?? `https://www.cardmarket.com/en/Magic/Products/Search?searchString=${encodeURIComponent(c.name)}`,
        others: prints.filter((p) => p.id !== c.id).slice(0, 30).map((p) => ({ ref: ref(p), label: p.set_name, sub: `${code(p)} · ${RARITY[p.rarity] ?? p.rarity}` })),
      },
    };
  },
  async search(q) {
    return (await searchAll(q, "&unique=cards&order=name", 1)).slice(0, 60).map((c) => ({ ...toTile(c), sub: c.set_name }));
  },
};
