// Euro prices from Cardmarket's free daily files for games whose card source has
// no Cardmarket ids (One Piece, Digimon, Star Wars Unlimited, Flesh and Blood,
// Lorcana). The product list only has a name and an expansion id per product, so
// cards are matched by a key from the name: the code in "Shanks (OP01-120)", or
// the name itself ("Elsa - Spirit of Winter").
//
// A card is printed in several expansions, so for a set we first pick the
// Cardmarket expansion that holds most of the set's cards. Inside it, the n-th
// card with the same key (e.g. the enchanted Elsa after the normal one) gets the
// n-th product with that key, in product-id order.
import type { PriceInfo } from "../prices";
import { bigJson } from "./big-json";

const LIST = (game: number) => `https://downloads.s3.cardmarket.com/productCatalog/productList/products_singles_${game}.json`;
const GUIDE = (game: number) => `https://downloads.s3.cardmarket.com/productCatalog/priceGuide/price_guide_${game}.json`;
const REFRESH_MS = 6 * 3600 * 1000;

type Product = { idProduct: number; name: string; idExpansion: number };
type Row = Record<string, number | null> & { idProduct: number };

export type CardmarketMatch = { normal: PriceInfo; foil: PriceInfo; idProduct: number };

type Catalog = { byKey: Map<string, Product[]>; prices: Map<number, Row>; updated: string | null };
const catalogs = new Map<number, Promise<Catalog | null>>();
const catalogAt = new Map<number, number>();

async function catalog(game: number, keyOf: (name: string) => string | null): Promise<Catalog | null> {
  const fresh = Date.now() - (catalogAt.get(game) ?? 0) < REFRESH_MS;
  if (!fresh || !catalogs.has(game)) {
    catalogAt.set(game, Date.now());
    const loading = Promise.all([
      bigJson<{ products: Product[] }>(LIST(game), REFRESH_MS),
      bigJson<{ createdAt?: string; priceGuides: Row[] }>(GUIDE(game), REFRESH_MS),
    ]).then(([list, guide]) => {
      if (!list || !guide) return null;
      const byKey = new Map<string, Product[]>();
      for (const p of list.products) {
        const key = keyOf(p.name);
        if (!key) continue;
        const k = key.toLowerCase();
        byKey.set(k, [...(byKey.get(k) ?? []), p]);
      }
      for (const ps of byKey.values()) ps.sort((a, b) => a.idProduct - b.idProduct);
      const updated = guide.createdAt ? new Date(guide.createdAt) : null;
      return {
        byKey,
        prices: new Map(guide.priceGuides.map((r) => [r.idProduct, r])),
        updated: updated && !Number.isNaN(updated.getTime()) ? updated.toISOString() : null,
      };
    });
    catalogs.set(game, loading);
    // Don't keep a failed load; try again on the next request.
    loading.then((c) => c ?? catalogs.delete(game)).catch(() => catalogs.delete(game));
  }
  return catalogs.get(game)!.catch(() => null);
}

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null);

function priceOf(row: Row | undefined, suffix: "" | "-foil", updated: string | null): PriceInfo {
  const pick = (k: string) => num(row?.[k + suffix]);
  return { trend: pick("trend") ?? pick("avg"), low: pick("low"), avg1: pick("avg1"), avg7: pick("avg7"), avg30: pick("avg30"), updated };
}

// "Shanks (OP01-120)" -> "OP01-120"
export const codeInName = (name: string) => name.match(/\(([A-Z0-9]+-[A-Z0-9]+)\)\s*$/i)?.[1] ?? null;

// Prices for all cards of one set, in the same order as `keys` (null: no match).
export async function cardmarketPrices(
  game: number,
  keyOf: (productName: string) => string | null,
  keys: (string | string[])[],
): Promise<(CardmarketMatch | null)[]> {
  const cat = await catalog(game, keyOf);
  if (!cat) return keys.map(() => null);
  // A key can have alternatives (FaB: "Name (Red)" or just "Name"); use the first one Cardmarket knows.
  const chosen = keys.map((k) => (Array.isArray(k) ? k : [k]).map((x) => x.toLowerCase()).find((x) => cat.byKey.has(x)) ?? null);

  // The expansion most of this set's keys are in.
  const votes = new Map<number, number>();
  for (const k of new Set(chosen)) {
    if (!k) continue;
    for (const exp of new Set(cat.byKey.get(k)!.map((p) => p.idExpansion))) votes.set(exp, (votes.get(exp) ?? 0) + 1);
  }
  const expansion = [...votes].sort((a, b) => b[1] - a[1])[0]?.[0];

  const seen = new Map<string, number>();
  return chosen.map((k) => {
    if (!k) return null;
    const n = seen.get(k) ?? 0;
    seen.set(k, n + 1);
    const all = cat.byKey.get(k)!;
    const inSet = all.filter((p) => p.idExpansion === expansion);
    // Not in that expansion (a promo or reprint): only the first print of a card falls back to its oldest product.
    const product = inSet.length ? inSet[n] : n === 0 ? all[0] : undefined;
    if (!product) return null;
    const row = cat.prices.get(product.idProduct);
    return { normal: priceOf(row, "", cat.updated), foil: priceOf(row, "-foil", cat.updated), idProduct: product.idProduct };
  });
}

// The cache for one set's prices, so a card page doesn't redo the whole set.
const setCache = new Map<string, { at: number; value: Promise<(CardmarketMatch | null)[]> }>();

export function cachedSetPrices(id: string, load: () => Promise<(CardmarketMatch | null)[]>) {
  const hit = setCache.get(id);
  if (hit && Date.now() - hit.at < REFRESH_MS) return hit.value;
  const value = load().catch(() => [] as (CardmarketMatch | null)[]);
  setCache.set(id, { at: Date.now(), value });
  return value;
}

export function cardmarketSearchUrl(game: string, name: string) {
  return `https://www.cardmarket.com/en/${game}/Products/Search?searchString=${encodeURIComponent(name)}`;
}
