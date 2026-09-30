import type { CardmarketPricing } from "./tcgdex";

// Cardmarket's own daily price guide for Pokémon (game 6): one row per product with
// the same fields TCGdex shows (trend, low, avg1/7/30 and the "-holo" versions).
// TCGdex can lag behind for new sets, so we read the guide ourselves and match
// cards by their Cardmarket product id.
const GUIDE_URL = "https://downloads.s3.cardmarket.com/productCatalog/priceGuide/price_guide_6.json";
const REFRESH_MS = 3 * 60 * 60 * 1000;

type GuideRow = CardmarketPricing & { idProduct: number };
type Guide = { createdAt?: string; priceGuides?: GuideRow[] };

let cache: { at: number; prices: Map<number, CardmarketPricing> } | null = null;
let loading: Promise<Map<number, CardmarketPricing> | null> | null = null;

async function load(): Promise<Map<number, CardmarketPricing> | null> {
  try {
    // The file is too big for Next's fetch cache, so it is kept in memory instead.
    const res = await fetch(GUIDE_URL, { cache: "no-store" });
    if (!res.ok) return null;
    const guide = (await res.json()) as Guide;
    const prices = new Map<number, CardmarketPricing>();
    for (const { idProduct, ...row } of guide.priceGuides ?? []) {
      prices.set(idProduct, { ...row, updated: guide.createdAt, unit: "EUR" });
    }
    cache = { at: Date.now(), prices };
    return prices;
  } catch {
    return null;
  }
}

export async function priceGuide(): Promise<Map<number, CardmarketPricing> | null> {
  if (cache && Date.now() - cache.at < REFRESH_MS) return cache.prices;
  loading ??= load().finally(() => (loading = null));
  // If a refresh fails, keep using the last guide we had.
  return (await loading) ?? cache?.prices ?? null;
}
