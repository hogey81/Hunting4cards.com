// Disney Lorcana from Lorcast (https://lorcast.com/docs/api). Lorcast only has
// TCGplayer prices in dollars, so Lorcana cards don't count towards the collection
// value in euro; the card page shows the dollar price.
import { noPrice, type GameSet, type GameTile, type Provider } from "./types";

const BASE = "https://api.lorcast.com/v0";
const DAY = 24 * 3600;

type RawSet = { id: string; name: string; code: string; released_at?: string };
type RawCard = {
  id: string;
  name: string;
  version?: string | null;
  collector_number: string;
  rarity?: string;
  type?: string[];
  ink?: string | null;
  cost?: number;
  strength?: number | null;
  willpower?: number | null;
  lore?: number | null;
  text?: string | null;
  image_uris?: { digital?: { small?: string; normal?: string; large?: string } };
  set: { code: string; name: string };
  prices?: { usd?: string | null; usd_foil?: string | null };
};

async function get<T>(path: string, revalidate = DAY): Promise<T | null> {
  const res = await fetch(`${BASE}${path}`, { next: { revalidate } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Lorcast ${path} gaf status ${res.status}`);
  return (await res.json()) as T;
}

const fullName = (c: RawCard) => (c.version ? `${c.name} - ${c.version}` : c.name);
const rarity = (c: RawCard) => (c.rarity ?? "").replace(/_/g, " ");
const ref = (c: RawCard) => `lor:${c.set.code}/${c.collector_number}`;
const toTile = (c: RawCard): GameTile => ({
  ref: ref(c),
  name: fullName(c),
  image: c.image_uris?.digital?.small ?? null,
  code: `${c.set.code} ${c.collector_number}`,
  sub: rarity(c),
});
const byNumber = (a: RawCard, b: RawCard) => a.collector_number.localeCompare(b.collector_number, undefined, { numeric: true });
const usd = (v?: string | null) => (v && Number(v) > 0 ? `$ ${Number(v).toFixed(2).replace(".", ",")}` : null);

async function sets(): Promise<RawSet[]> {
  return (await get<{ results: RawSet[] }>("/sets"))?.results ?? [];
}

async function cardsOf(code: string): Promise<RawCard[]> {
  return ((await get<RawCard[]>(`/sets/${encodeURIComponent(code)}/cards`)) ?? []).sort(byNumber);
}

const toSet = (s: RawSet, total: number): GameSet => ({ code: s.code, name: s.name, total, date: s.released_at ?? null, image: null });

export const lorcana: Provider = {
  prefix: "lor",
  name: "Disney Lorcana",
  languages: ["EN", "DE", "FR", "IT"],
  searchHint: "Naam, bv. Elsa",
  foilLabel: "Foil",
  async getSets() {
    // Lorcast's set list has no card counts; there are few sets, so count their cards.
    const all = await sets();
    const counts = await Promise.all(all.map((s) => cardsOf(s.code).then((c) => c.length).catch(() => 0)));
    return all.map((s, i) => toSet(s, counts[i])).sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  },
  async getSet(code) {
    const set = (await sets()).find((s) => s.code.toLowerCase() === code.toLowerCase());
    if (!set) return null;
    const cards = await cardsOf(set.code);
    return { set: toSet(set, cards.length), cards: cards.map(toTile) };
  },
  async getCard(cardRef) {
    const [setCode, number] = cardRef.slice(4).split("/");
    const found = await this.getSet(setCode ?? "");
    if (!found) return null;
    const list = await cardsOf(found.set.code);
    const at = list.findIndex((c) => c.collector_number === number);
    if (at < 0) return null;
    const c = list[at];
    const stats = [c.cost != null ? `Kosten ${c.cost}` : null, c.strength != null ? `Kracht ${c.strength}` : null, c.willpower != null ? `Wilskracht ${c.willpower}` : null, c.lore != null ? `Lore ${c.lore}` : null];
    const price = usd(c.prices?.usd);
    const foil = usd(c.prices?.usd_foil);
    return {
      set: found.set,
      prev: at > 0 ? toTile(list[at - 1]) : null,
      next: at < list.length - 1 ? toTile(list[at + 1]) : null,
      card: {
        ...toTile(c),
        bigImage: c.image_uris?.digital?.normal ?? c.image_uris?.digital?.large ?? null,
        rarity: rarity(c),
        facts: [(c.type ?? []).join(" "), c.ink, ...stats].filter((f): f is string => !!f),
        text: c.text ?? null,
        normal: noPrice,
        foil: noPrice,
        otherPrice: price || foil ? { label: "Prijs (TCGplayer, in dollars)", value: [price, foil && `foil ${foil}`].filter(Boolean).join(" · ") } : null,
        priceNote: "Voor Lorcana is geen Cardmarket-prijs beschikbaar; dit is de Amerikaanse TCGplayer-prijs via Lorcast. Hij telt niet mee in je collectiewaarde.",
        cardmarketUrl: `https://www.cardmarket.com/en/Lorcana/Products/Search?searchString=${encodeURIComponent(c.name)}`,
        others: [],
      },
    };
  },
  async search(q) {
    const res = await get<{ results: RawCard[] }>(`/cards/search?q=${encodeURIComponent(q)}`, 3600);
    return (res?.results ?? []).slice(0, 60).map((c) => ({ ...toTile(c), sub: c.set.name }));
  },
};
