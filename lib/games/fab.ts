// Flesh and Blood from The Fab Cube's open card data
// (https://github.com/the-fab-cube/flesh-and-blood-cards). The euro price comes
// from Cardmarket's daily files (game 16), matched on the name, which Cardmarket
// writes with the pitch colour when a card has several: "Head Shot (Blue)".
import { bigJson } from "./big-json";
import { cachedSetPrices, cardmarketPrices, cardmarketSearchUrl } from "./cardmarket";
import { noPrice, type GameSet, type GameTile, type Provider } from "./types";

const DATA = "https://raw.githubusercontent.com/the-fab-cube/flesh-and-blood-cards/develop/json/english";
const DAY_MS = 24 * 3600 * 1000;

type RawSet = { id: string; name: string; printings: { initial_release_date?: string | null; set_logo?: string | null }[] };
type RawPrinting = { id: string; set_id: string; foiling?: string; rarity?: string; image_url?: string | null };
type RawCard = {
  name: string;
  color?: string;
  pitch?: string;
  cost?: string;
  power?: string;
  defense?: string;
  health?: string;
  type_text?: string;
  functional_text_plain?: string;
  printings: RawPrinting[];
};

// One collectable print: a card number in a set. Rainbow and cold foils are its foil versions.
type Print = { card: RawCard; id: string; set: string; number: string; rarity: string; image: string | null; standard: boolean };

const RARITY: Record<string, string> = { C: "Common", R: "Rare", S: "Super Rare", M: "Majestic", L: "Legendary", F: "Fabled", T: "Token", V: "Marvel", P: "Promo" };

type Data = { sets: GameSet[]; prints: Map<string, Print[]>; setNames: Map<string, string> };
let data: { at: number; value: Promise<Data> } | null = null;

function load(): Promise<Data> {
  if (data && Date.now() - data.at < DAY_MS) return data.value;
  const value = Promise.all([bigJson<RawSet[]>(`${DATA}/set.json`, DAY_MS), bigJson<RawCard[]>(`${DATA}/card.json`, DAY_MS)]).then(([rawSets, cards]) => {
    if (!rawSets?.length || !cards?.length) throw new Error("Flesh and Blood-kaarten konden niet worden geladen");
    const byId = new Map<string, Print>();
    for (const card of cards) {
      for (const p of card.printings) {
        if (!p.id.startsWith(p.set_id)) continue;
        const have = byId.get(p.id);
        // Prefer the picture of the non-foil print ("S" is standard, "R" rainbow and "C" cold foil).
        const standard = p.foiling !== "R" && p.foiling !== "C";
        if (have && (have.standard || !standard)) continue;
        byId.set(p.id, { card, id: p.id, set: p.set_id, number: p.id.slice(p.set_id.length), rarity: RARITY[p.rarity ?? ""] ?? p.rarity ?? "", image: p.image_url ?? have?.image ?? null, standard });
      }
    }
    const prints = new Map<string, Print[]>();
    for (const p of byId.values()) {
      const set = p.set;
      prints.set(set, [...(prints.get(set) ?? []), p]);
    }
    for (const list of prints.values()) list.sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));
    const sets = rawSets
      .filter((s) => prints.has(s.id))
      .map((s) => {
        const dates = s.printings.map((p) => p.initial_release_date?.slice(0, 10)).filter((d): d is string => !!d).sort();
        return { code: s.id, name: s.name, total: prints.get(s.id)!.length, date: dates[0] ?? null, image: s.printings.find((p) => p.set_logo)?.set_logo ?? null };
      })
      .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
    return { sets, prints, setNames: new Map(rawSets.map((s) => [s.id, s.name])) };
  });
  data = { at: Date.now(), value };
  value.catch(() => (data = null));
  return value;
}

const fullName = (c: RawCard) => (c.color ? `${c.name} (${c.color})` : c.name);
const toTile = (set: string, p: Print): GameTile => ({ ref: `fab:${set}/${p.number}`, name: fullName(p.card), image: p.image, code: p.id, sub: p.rarity });

export const fab: Provider = {
  prefix: "fab",
  name: "Flesh and Blood",
  languages: ["EN", "DE", "FR", "IT", "ES", "JP"],
  searchHint: "Naam, bv. Command and Conquer",
  foilLabel: "Foil",
  async getSets() {
    return (await load()).sets;
  },
  async getSet(code) {
    const { sets, prints } = await load();
    const set = sets.find((s) => s.code.toLowerCase() === code.toLowerCase());
    if (!set) return null;
    return { set, cards: prints.get(set.code)!.map((p) => toTile(set.code, p)) };
  },
  async getCard(ref) {
    const [setCode, number] = ref.slice(4).split("/");
    const { sets, prints, setNames } = await load();
    const set = sets.find((s) => s.code === setCode);
    const list = set ? prints.get(set.code)! : [];
    const at = list.findIndex((p) => p.number === number);
    if (!set || at < 0) return null;
    const p = list[at];
    const c = p.card;
    // Cardmarket adds the colour only when a card comes in several colours.
    const keys = list.map((x) => (x.card.color ? [fullName(x.card), x.card.name] : [x.card.name]));
    const cm = (await cachedSetPrices(`fab:${set.code}`, () => cardmarketPrices(16, (name) => name, keys)))[at] ?? null;
    const stat = (label: string, v?: string) => (v ? `${label} ${v}` : null);
    const seen = new Set([p.id]);
    const others = c.printings.filter((x) => !seen.has(x.id) && seen.add(x.id));
    return {
      set,
      prev: at > 0 ? toTile(set.code, list[at - 1]) : null,
      next: at < list.length - 1 ? toTile(set.code, list[at + 1]) : null,
      card: {
        ...toTile(set.code, p),
        bigImage: p.image,
        rarity: p.rarity || null,
        facts: [c.type_text, c.color, stat("Kosten", c.cost), stat("Kracht", c.power), stat("Verdediging", c.defense), stat("Leven", c.health)].filter((f): f is string => !!f),
        text: c.functional_text_plain || null,
        normal: cm?.normal ?? noPrice,
        foil: cm?.foil ?? noPrice,
        otherPrice: null,
        priceNote: cm ? "Cardmarket-prijs uit de dagelijkse prijslijst, gekoppeld op naam en kleur." : "Geen Cardmarket-prijs gevonden voor deze kaart.",
        cardmarketUrl: cardmarketSearchUrl("FleshAndBlood", c.name),
        others: others.slice(0, 30).map((x) => ({ ref: `fab:${x.set_id}/${x.id.slice(x.set_id.length)}`, label: setNames.get(x.set_id) ?? x.set_id, sub: `${x.id} · ${RARITY[x.rarity ?? ""] ?? x.rarity ?? ""}` })),
      },
    };
  },
  async search(q) {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    const { prints, setNames } = await load();
    const found: GameTile[] = [];
    for (const [set, list] of prints) {
      for (const p of list) if (p.card.name.toLowerCase().includes(needle) || p.id.toLowerCase() === needle) found.push({ ...toTile(set, p), sub: setNames.get(set) ?? set });
    }
    return found.slice(0, 60);
  },
};
