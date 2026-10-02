// Star Wars: Unlimited from SWU-DB (https://www.swu-db.com/api). Its prices are
// TCGplayer's in dollars, so the euro price comes from Cardmarket's daily files
// (game 21), matched on the full card name: "Luke Skywalker, Faithful Friend".
// Hyperspace and Showcase versions are their own cards; foil is the second version.
import { cachedSetPrices, cardmarketPrices, cardmarketSearchUrl } from "./cardmarket";
import { noPrice, type GameSet, type GameTile, type Provider } from "./types";

const BASE = "https://api.swu-db.com";
const DAY = 24 * 3600;

type RawSet = { setId: string; fullName: string; releaseDate?: string; parentSetId?: string; numberCards: number };
type RawCard = {
  Set: string;
  Number: string;
  Name: string;
  Subtitle?: string;
  Type?: string;
  Aspects?: string[];
  Traits?: string[];
  Arenas?: string[];
  Cost?: string;
  Power?: string;
  HP?: string;
  FrontText?: string;
  BackText?: string;
  EpicAction?: string;
  Rarity?: string;
  VariantType?: string;
  MarketPrice?: string;
  FoilPrice?: string;
  FrontArt?: string;
};

async function get<T>(path: string, revalidate = DAY): Promise<T | null> {
  const res = await fetch(`${BASE}${path}`, { next: { revalidate } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`SWU-DB ${path} gaf status ${res.status}`);
  return (await res.json()) as T;
}

// "3/8/24" -> "2024-03-08"
function isoDate(d?: string) {
  const m = d?.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  return m ? `20${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}` : null;
}

const toSet = (s: RawSet, total = s.numberCards): GameSet => {
  const date = isoDate(s.releaseDate);
  return { code: s.setId, name: s.fullName, total, date, image: null, group: date && s.numberCards >= 80 ? undefined : "Promo's en events" };
};

async function sets(): Promise<RawSet[]> {
  return (await get<RawSet[]>("/sets")) ?? [];
}

const byNumber = (a: RawCard, b: RawCard) => a.Number.localeCompare(b.Number, undefined, { numeric: true });

// Foil versions are listed as cards of their own ("051F"); here they are the foil of "051".
async function cardsOf(code: string): Promise<RawCard[]> {
  const res = await get<{ data: RawCard[] }>(`/cards/${encodeURIComponent(code.toLowerCase())}`);
  return (res?.data ?? []).filter((c) => !(c.VariantType ?? "").includes("Foil")).sort(byNumber);
}

const fullName = (c: RawCard) => (c.Subtitle ? `${c.Name}, ${c.Subtitle}` : c.Name);
const variant = (c: RawCard) => (c.VariantType && c.VariantType !== "Normal" ? c.VariantType : null);
const toTile = (c: RawCard): GameTile => ({
  ref: `swu:${c.Set}/${c.Number}`,
  name: fullName(c),
  image: c.FrontArt ?? null,
  code: `${c.Set} ${c.Number}`,
  sub: [c.Rarity, variant(c)].filter(Boolean).join(" · "),
});
const usd = (v?: string) => (v && Number(v) > 0 ? `$ ${Number(v).toFixed(2).replace(".", ",")}` : null);

export const starwars: Provider = {
  prefix: "swu",
  name: "Star Wars: Unlimited",
  languages: ["EN", "DE", "FR", "IT", "ES"],
  searchHint: "Naam, bv. Luke Skywalker",
  foilLabel: "Foil",
  async getSets() {
    // Sets without a date (promos) go after the dated ones.
    return (await sets()).map((s) => toSet(s)).sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  },
  async getSet(code) {
    const raw = (await sets()).find((s) => s.setId.toLowerCase() === code.toLowerCase());
    if (!raw) return null;
    const cards = await cardsOf(raw.setId);
    return { set: toSet(raw, cards.length), cards: cards.map(toTile) };
  },
  async getCard(ref) {
    const [setCode, number] = ref.slice(4).split("/");
    const raw = (await sets()).find((s) => s.setId.toLowerCase() === (setCode ?? "").toLowerCase());
    if (!raw) return null;
    const list = await cardsOf(raw.setId);
    const at = list.findIndex((c) => c.Number === number);
    if (at < 0) return null;
    const c = list[at];
    const cm = (await cachedSetPrices(`swu:${raw.setId}`, () => cardmarketPrices(21, (name) => name, list.map(fullName))))[at] ?? null;
    const stat = (label: string, v?: string) => (v ? `${label} ${v}` : null);
    const dollars = [usd(c.MarketPrice), usd(c.FoilPrice) && `foil ${usd(c.FoilPrice)}`].filter(Boolean).join(" · ");
    return {
      set: toSet(raw, list.length),
      prev: at > 0 ? toTile(list[at - 1]) : null,
      next: at < list.length - 1 ? toTile(list[at + 1]) : null,
      card: {
        ...toTile(c),
        bigImage: c.FrontArt ?? null,
        rarity: c.Rarity ?? null,
        facts: [c.Type, (c.Aspects ?? []).join(", "), (c.Arenas ?? []).join(", "), stat("Kosten", c.Cost), stat("Kracht", c.Power), stat("HP", c.HP), (c.Traits ?? []).join(", ")].filter((f): f is string => !!f),
        text: [c.FrontText, c.EpicAction, c.BackText].filter(Boolean).join("\n\n") || null,
        normal: cm?.normal ?? noPrice,
        foil: cm?.foil ?? noPrice,
        otherPrice: !cm?.normal.trend && dollars ? { label: "Prijs (TCGplayer, in dollars)", value: dollars } : null,
        priceNote: cm
          ? "Cardmarket-prijs uit de dagelijkse prijslijst, gekoppeld op de naam. Bij Hyperspace- en Showcase-versies kan de koppeling soms naast zitten."
          : "Geen Cardmarket-prijs gevonden voor deze kaart.",
        cardmarketUrl: cardmarketSearchUrl("StarWarsUnlimited", fullName(c)),
        others: [],
      },
    };
  },
  async search(q) {
    const res = await get<{ data: RawCard[] }>(`/cards/search?q=${encodeURIComponent(q.includes(" ") ? `name:"${q}"` : `name:${q}`)}`, 3600).catch(() => null);
    const names = new Map((await sets().catch(() => [] as RawSet[])).map((s) => [s.setId, s.fullName]));
    return (res?.data ?? [])
      .filter((c) => !(c.VariantType ?? "").includes("Foil"))
      .slice(0, 60)
      .map((c) => ({ ...toTile(c), sub: names.get(c.Set) ?? c.Set }));
  },
};
