import { NextResponse } from "next/server";
import { cardImage, getCard } from "@/lib/tcgdex";
import { toPricedCard, type PricedCard } from "@/lib/prices";
import { isOtherGame, parseRef } from "@/lib/card-ref";
import { BY_PREFIX } from "@/lib/games";
import { gameOf } from "@/lib/games/refs";
import { noPrice } from "@/lib/games/types";

const MAX_IDS = 500;
const BATCH = 20;

// Returns the latest Cardmarket prices for the given card references ("me05-048", "ja:M4-001"). The app calls
// this every time it opens, so the collection always shows today's prices.
export async function GET(request: Request) {
  const ids = [
    ...new Set(
      (new URL(request.url).searchParams.get("ids") ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ].slice(0, MAX_IDS);

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

  return NextResponse.json(
    { cards, failed, fetchedAt: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
