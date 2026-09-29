import type { Card, CardmarketPricing, Region } from "./tcgdex";
import { toRef } from "./card-ref";

export type Variant = "normal" | "reverse";

export type PriceInfo = {
  trend: number | null;
  low: number | null;
  avg1: number | null;
  avg7: number | null;
  avg30: number | null;
  updated: string | null;
};

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

// Cardmarket's price guide lists the reverse holo / foil version in the "-holo" fields.
export function pricesFor(pricing: CardmarketPricing | null | undefined, variant: Variant): PriceInfo {
  const p = pricing ?? {};
  const suffix = variant === "reverse" ? "-holo" : "";
  const pick = (key: string) => num((p as Record<string, unknown>)[key + suffix]);
  const updated = p.updated != null ? new Date(p.updated) : null;
  return {
    trend: pick("trend") ?? pick("avg"),
    low: pick("low"),
    avg1: pick("avg1"),
    avg7: pick("avg7"),
    avg30: pick("avg30"),
    updated: updated && !Number.isNaN(updated.getTime()) ? updated.toISOString() : null,
  };
}

// Change of the trend price against the 30-day average, in percent.
export function trendChange(p: PriceInfo): number | null {
  if (p.trend == null || !p.avg30) return null;
  return ((p.trend - p.avg30) / p.avg30) * 100;
}

export type PricedCard = {
  // Card reference: the TCGdex id, with "ja:" in front for Japanese cards.
  id: string;
  name: string;
  image: string | null;
  setId: string;
  setName: string;
  localId: string;
  rarity: string | null;
  normal: PriceInfo;
  reverse: PriceInfo;
};

export function toPricedCard(card: Card, image: string | null, region: Region = "en"): PricedCard {
  const cm = card.pricing?.cardmarket;
  return {
    id: toRef(region, card.id),
    name: card.name,
    image,
    setId: card.set.id,
    setName: card.set.name,
    localId: card.localId,
    rarity: card.rarity ?? null,
    normal: pricesFor(cm, "normal"),
    reverse: pricesFor(cm, "reverse"),
  };
}

const eur = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });

export function formatEur(v: number | null | undefined) {
  return v == null ? "–" : eur.format(v);
}

export function formatChange(v: number | null) {
  if (v == null) return null;
  const arrow = v >= 0 ? "▲" : "▼";
  return `${arrow} ${Math.abs(v).toFixed(1).replace(".", ",")}%`;
}

export function formatUpdated(iso: string | null) {
  if (!iso) return "onbekend";
  return new Intl.DateTimeFormat("nl-NL", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Amsterdam",
  }).format(new Date(iso));
}

// Cardmarket has no Dutch site (/nl/ gives a 404), so link to the English one.
export function cardmarketSearchUrl(name: string) {
  return `https://www.cardmarket.com/en/Pokemon/Products/Search?searchString=${encodeURIComponent(name)}`;
}
