// Digimon Card Game from digimoncard.io (https://documenter.getpostman.com/view/14059948/TzecB4fH).
// The euro price comes from Cardmarket's daily files (game 17), matched on the
// card number in the product name: "Omnimon (BT1-084)". Sets follow the number
// (BT2-043 is in BT2), the way the cards are printed.
import { bigJson } from "./big-json";
import { cachedSetPrices, cardmarketPrices, cardmarketSearchUrl, codeInName } from "./cardmarket";
import { noPrice, type GameSet, type GameTile, type Provider } from "./types";

const ALL = "https://digimoncard.io/api-public/search?series=Digimon%20Card%20Game";
const DAY_MS = 24 * 3600 * 1000;

type RawCard = {
  name: string;
  id: string;
  type?: string;
  level?: number | null;
  play_cost?: number | null;
  color?: string | null;
  color2?: string | null;
  digi_type?: string | null;
  form?: string | null;
  dp?: number | null;
  attribute?: string | null;
  rarity?: string | null;
  stage?: string | null;
  main_effect?: string | null;
  source_effect?: string | null;
  set_name?: string[] | null;
};

const GROUPS: [string, string][] = [
  ["BT", "Boosters"],
  ["EX", "Extra boosters"],
  ["RB", "Extra boosters"],
  ["ST", "Starter decks"],
  ["LM", "Limited packs"],
  ["AD", "Limited packs"],
  ["P", "Promo's"],
];

const setOf = (id: string) => id.slice(0, id.lastIndexOf("-"));
// "BT-02: Booster Ultimate Power" -> "BT2"
const packCode = (pack: string) => pack.split(":")[0].replace(/-0*/, "").trim().toUpperCase();
const byNumber = (a: RawCard, b: RawCard) => a.id.localeCompare(b.id, undefined, { numeric: true });

type Data = { sets: GameSet[]; cards: Map<string, RawCard[]> };
let data: { at: number; value: Promise<Data> } | null = null;

function load(): Promise<Data> {
  if (data && Date.now() - data.at < DAY_MS) return data.value;
  const value = bigJson<RawCard[]>(ALL, DAY_MS).then((all) => {
    if (!all?.length) throw new Error("digimoncard.io gaf geen kaarten");
    const cards = new Map<string, RawCard[]>();
    const names = new Map<string, string>();
    for (const c of all) {
      const set = setOf(c.id);
      if (!set) continue;
      cards.set(set, [...(cards.get(set) ?? []), c]);
      for (const pack of c.set_name ?? []) {
        const code = packCode(pack);
        if (code === set && pack.includes(":") && !names.has(set)) names.set(set, pack.split(":").slice(1).join(":").trim());
      }
    }
    for (const list of cards.values()) list.sort(byNumber);
    const prefix = (code: string) => code.match(/^[A-Z]+/)?.[0] ?? code;
    const order = (code: string) => {
      const at = GROUPS.findIndex(([p]) => p === prefix(code));
      return at < 0 ? GROUPS.length : at;
    };
    const sets = [...cards.keys()]
      .sort((a, b) => order(a) - order(b) || b.localeCompare(a, undefined, { numeric: true }))
      .map((code) => ({
        code,
        name: code === "P" ? "Promokaarten" : names.get(code) ?? code,
        total: cards.get(code)!.length,
        date: null,
        image: null,
        group: GROUPS.find(([p]) => p === prefix(code))?.[1] ?? "Overig",
      }));
    return { sets, cards };
  });
  data = { at: Date.now(), value };
  value.catch(() => (data = null));
  return value;
}

const image = (id: string) => `https://images.digimoncard.io/images/cards/${encodeURIComponent(id)}.jpg`;
const rarity = (c: RawCard) => (c.rarity ?? "").toUpperCase();
const toTile = (c: RawCard): GameTile => ({ ref: `dgm:${c.id}`, name: c.name, image: image(c.id), code: c.id, sub: rarity(c) });

export const digimon: Provider = {
  prefix: "dgm",
  name: "Digimon Card Game",
  languages: ["EN", "JP"],
  searchHint: "Naam of nummer, bv. Agumon of BT1-084",
  foilLabel: null,
  async getSets() {
    return (await load()).sets;
  },
  async getSet(code) {
    const { sets, cards } = await load();
    const set = sets.find((s) => s.code.toLowerCase() === code.toLowerCase());
    if (!set) return null;
    return { set, cards: cards.get(set.code)!.map(toTile) };
  },
  async getCard(ref) {
    const id = ref.slice(4);
    const { sets, cards } = await load();
    const set = sets.find((s) => s.code === setOf(id));
    const list = set ? cards.get(set.code)! : [];
    const at = list.findIndex((c) => c.id === id);
    if (!set || at < 0) return null;
    const c = list[at];
    const prices = await cachedSetPrices(`dgm:${set.code}`, () => cardmarketPrices(17, codeInName, list.map((x) => x.id)));
    const cm = prices[at] ?? null;
    const stat = (label: string, v: unknown) => (v != null && v !== "" ? `${label} ${v}` : null);
    return {
      set,
      prev: at > 0 ? toTile(list[at - 1]) : null,
      next: at < list.length - 1 ? toTile(list[at + 1]) : null,
      card: {
        ...toTile(c),
        bigImage: image(c.id),
        rarity: rarity(c) || null,
        facts: [c.type, [c.color, c.color2].filter(Boolean).join("/"), c.level ? `Level ${c.level}` : null, stat("Kosten", c.play_cost), stat("DP", c.dp), c.form, c.attribute, c.digi_type].filter((f): f is string => !!f),
        text: [c.main_effect, c.source_effect && `Erfelijk effect: ${c.source_effect}`].filter(Boolean).join("\n\n") || null,
        normal: cm?.normal ?? noPrice,
        foil: null,
        otherPrice: null,
        priceNote: cm ? "Cardmarket-prijs van de gewone versie, uit de dagelijkse prijslijst." : "Geen Cardmarket-prijs gevonden voor deze kaart.",
        cardmarketUrl: cardmarketSearchUrl("Digimon", c.id),
        others: [],
      },
    };
  },
  async search(q) {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    const { sets, cards } = await load();
    const names = new Map(sets.map((s) => [s.code, s.name]));
    return [...cards.values()]
      .flat()
      .filter((c) => c.name.toLowerCase().includes(needle) || c.id.toLowerCase() === needle)
      .slice(0, 60)
      .map((c) => ({ ...toTile(c), sub: names.get(setOf(c.id)) ?? "" }));
  },
};
