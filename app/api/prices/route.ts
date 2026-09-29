import { NextResponse } from "next/server";
import { cardImage, getCard } from "@/lib/tcgdex";
import { toPricedCard, type PricedCard } from "@/lib/prices";

const MAX_IDS = 500;
const BATCH = 20;

// Returns the latest Cardmarket prices for the given card ids. The app calls
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
    const results = await Promise.allSettled(ids.slice(i, i + BATCH).map((id) => getCard(id)));
    results.forEach((r, j) => {
      if (r.status === "fulfilled" && r.value) cards.push(toPricedCard(r.value, cardImage(r.value.image)));
      else failed.push(ids[i + j]);
    });
  }

  return NextResponse.json(
    { cards, failed, fetchedAt: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
