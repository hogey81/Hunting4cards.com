import { NextResponse } from "next/server";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/account-config";
import { lookupPrices } from "@/lib/price-lookup";
import type { PriceInfo } from "@/lib/prices";

// Runs once a day (vercel.json): saves today's price of every card that is in someone's
// collection, and each collection's total value. Pro will draw its charts and price
// alerts from this history. Only Vercel's scheduler knows CRON_SECRET; the database
// functions check the same secret (supabase/price-history.sql).
export const maxDuration = 300;
export const dynamic = "force-dynamic";

async function rpc(fn: string, args: object) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${fn}: ${res.status} ${await res.text()}`);
  return res.json();
}

const row = (card_ref: string, variant: "normal" | "reverse", p: PriceInfo) =>
  p.trend == null && p.low == null ? [] : [{ card_ref, variant, trend: p.trend, low: p.low, avg30: p.avg30 }];

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET ontbreekt" }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "geen toegang" }, { status: 401 });
  }

  const refs: string[] = await rpc("price_history_refs", { p_token: secret });
  const { cards, failed } = await lookupPrices(refs);
  const rows = cards.flatMap((c) => [...row(c.id, "normal", c.normal), ...row(c.id, "reverse", c.reverse)]);

  let saved = 0;
  for (let i = 0; i < rows.length; i += 500) {
    saved += await rpc("record_prices", { p_token: secret, p_rows: rows.slice(i, i + 500) });
  }
  const collections: number = await rpc("record_collection_values", { p_token: secret });

  return NextResponse.json({ cards: refs.length, prices: saved, failed: failed.length, collections });
}
