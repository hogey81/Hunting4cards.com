import { getPrint, getSet, getSets, searchCards, ygoCardmarketUrl, ygoImage, ygoPrice, ygoSetImage, type YgoCard, type YgoPrint, type YgoSet } from "../ygo";
import { type GameSet, type GameTile, type Provider } from "./types";

const toSet = (s: YgoSet): GameSet => ({ code: s.code, name: s.name, total: s.total, date: s.date, image: ygoSetImage(s.code) });
const toTile = (card: YgoCard, print: YgoPrint): GameTile => ({
  ref: print.ref,
  name: card.name,
  image: ygoImage(card.imageId),
  code: print.code,
  sub: print.rarityCode,
});

export const yugioh: Provider = {
  prefix: "ygo",
  name: "Yu-Gi-Oh!",
  // Yu-Gi-Oh! has no Dutch edition.
  languages: ["EN", "DE", "FR", "IT", "ES", "PT"],
  searchHint: "Naam, bv. Dark Magician",
  foilLabel: null,
  async getSets() {
    return (await getSets()).map(toSet);
  },
  async getSet(code) {
    const set = await getSet(code);
    return set && { set: toSet(set), cards: set.cards.map((c) => toTile(c.card, c.print)) };
  },
  async getCard(ref) {
    const found = await getPrint(ref);
    if (!found) return null;
    const { set, card, print, prev, next } = found;
    const facts = [card.type, card.attribute, card.race, card.level ? `Level ${card.level}` : null, card.atk != null ? `ATK ${card.atk}` : null, card.def != null ? `DEF ${card.def}` : null].filter((f): f is string => !!f);
    return {
      set: toSet(set),
      prev: prev && toTile(prev.card, prev.print),
      next: next && toTile(next.card, next.print),
      card: {
        ...toTile(card, print),
        bigImage: ygoImage(card.imageId, "big"),
        rarity: print.rarity,
        facts,
        text: card.desc,
        normal: ygoPrice(card),
        foil: null,
        otherPrice: null,
        priceNote: "Cardmarket-prijs via YGOPRODeck, dagelijks bijgewerkt. Dit is één prijs voor alle drukken van deze kaart samen; zeldzame drukken kunnen meer waard zijn.",
        cardmarketUrl: ygoCardmarketUrl(card.name),
        others: card.prints.filter((p) => p.ref !== print.ref).map((p) => ({ ref: p.ref, label: p.setName, sub: `${p.code} · ${p.rarity}` })),
      },
    };
  },
  async search(q) {
    // Open the oldest print first; the card page lists the others.
    return (await searchCards(q)).map((c) => {
      const first = c.prints[c.prints.length - 1];
      return { ...toTile(c, first), sub: `${c.prints.length} ${c.prints.length === 1 ? "druk" : "drukken"}` };
    });
  },
};
