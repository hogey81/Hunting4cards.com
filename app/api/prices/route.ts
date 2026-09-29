import { NextResponse } from "next/server";
import { cardImage, getCard } from "@/lib/tcgdex";
import { toPricedCard, type PricedCard } from "@/lib/prices";
import { parseRef } from "@/lib/card-ref";

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
  for (let i = 0; i < ids.length; i += BATCH) {
    const refs = ids.slice(i, i + BATCH).map(parseRef);
    const results = await Promise.allSettled(refs.map(({ id, region }) => getCard(id, region)));
    results.forEach((r, j) => {
      if (r.status === "fulfilled" && r.value) cards.push(toPricedCard(r.value, cardImage(r.value.image), refs[j].region));
      else failed.push(ids[i + j]);
    });
  }

  return NextResponse.json(
    { cards, failed, fetchedAt: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
