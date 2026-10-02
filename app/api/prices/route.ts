import { NextResponse } from "next/server";
import { cardImage, getCard } from "@/lib/tcgdex";
import { toPricedCard, type PricedCard } from "@/lib/prices";
import { isYgo, parseRef } from "@/lib/card-ref";
import { getPrint, ygoImage, ygoPrice } from "@/lib/ygo";

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

  // Yu-Gi-Oh! prints: each set is fetched once and cached, so this is cheap.
  const ygo = ids.filter(isYgo);
  const ygoResults = await Promise.allSettled(ygo.map((ref) => getPrint(ref)));
  ygoResults.forEach((r, i) => {
    const found = r.status === "fulfilled" ? r.value : null;
    if (!found) return void failed.push(ygo[i]);
    const empty = { ...ygoPrice(found.card), trend: null };
    cards.push({
      id: ygo[i],
      name: found.card.name,
      image: ygoImage(found.card.imageId),
      setId: found.set.code,
      setName: found.set.name,
      localId: found.print.code,
      rarity: found.print.rarity,
      normal: ygoPrice(found.card),
      reverse: empty,
    });
  });

  const tcgdexIds = ids.filter((id) => !isYgo(id));
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
