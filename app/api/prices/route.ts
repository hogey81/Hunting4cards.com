import { NextResponse } from "next/server";
import { lookupPrices } from "@/lib/price-lookup";

const MAX_IDS = 500;

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

  const { cards, failed } = await lookupPrices(ids);

  return NextResponse.json(
    { cards, failed, fetchedAt: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
