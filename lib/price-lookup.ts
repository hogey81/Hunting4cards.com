import { cardImage, getCard } from "./tcgdex";
import { toPricedCard, type PricedCard } from "./prices";
import { isOtherGame, parseRef } from "./card-ref";
import { BY_PREFIX } from "./games";
import { gameOf } from "./games/refs";
import { noPrice } from "./games/types";

const BATCH = 20;

// The latest Cardmarket prices for card references ("me05-048", "ja:M4-001", "ygo:LOB-EN001~UR").
export async function lookupPrices(ids: string[]) {
  const cards: PricedCard[] = [];
  const failed: string[] = [];

  // Cards of the other games (Yu-Gi-Oh!, Magic, Lorcana), a few at a time: cards of
  // one set share the cached set data.
  const others = ids.filter(isOtherGame);
  for (let i = 0; i < others.length; i += 10) {
    const batch = others.slice(i, i + 10);
    const results = await Promise.allSettled(batch.map((ref) => BY_PREFIX[gameOf(ref)!].getCard(ref)));
    results.forEach((r, j) => {
      const found = r.status === "fulfilled" ? r.value : null;
      if (!found) return void failed.push(batch[j]);
      const { card, set } = found;
      cards.push({
        id: batch[j],
        name: card.name,
        image: card.image,
        setId: set.code,
        setName: set.name,
        localId: card.code,
        rarity: card.rarity,
        normal: card.normal,
        reverse: card.foil ?? noPrice,
      });
    });
  }

  const tcgdexIds = ids.filter((id) => !isOtherGame(id));
  for (let i = 0; i < tcgdexIds.length; i += BATCH) {
    const batch = tcgdexIds.slice(i, i + BATCH);
    const refs = batch.map(parseRef);
    const results = await Promise.allSettled(refs.map(({ id, region }) => getCard(id, region)));
    results.forEach((r, j) => {
      if (r.status === "fulfilled" && r.value) cards.push(toPricedCard(r.value, cardImage(r.value.image), refs[j].region));
      else failed.push(batch[j]);
    });
  }

  return { cards, failed };
}
