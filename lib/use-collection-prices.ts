"use client";

import { useEffect, useMemo, useState } from "react";
import { useCollection, type CollectionEntry } from "./collection";
import { trendChange, type PricedCard } from "./prices";

export type CollectionRow = {
  entry: CollectionEntry;
  card: PricedCard | undefined;
  price: number | null;
  change: number | null;
  updated: string | null;
};

// The collection plus the latest Cardmarket prices, fetched every time a screen
// that needs them opens (and again when the collection changes).
export function useCollectionPrices() {
  const { entries, loaded } = useCollection();
  const [prices, setPrices] = useState<Record<string, PricedCard>>({});
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const idKey = useMemo(() => [...new Set(entries.map((e) => e.cardId))].sort().join(","), [entries]);

  useEffect(() => {
    if (!idKey) return;
    let cancelled = false;
    setError(false);
    fetch(`/api/prices?ids=${encodeURIComponent(idKey)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: { cards: PricedCard[]; failed: string[]; fetchedAt: string }) => {
        if (cancelled) return;
        if (data.cards.length === 0 && data.failed.length > 0) throw new Error("no prices");
        setPrices(Object.fromEntries(data.cards.map((c) => [c.id, c])));
        setFetchedAt(data.fetchedAt);
      })
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [idKey]);

  const rows: CollectionRow[] = entries.map((e) => {
    const card = prices[e.cardId];
    const p = card ? card[e.variant] : null;
    return { entry: e, card, price: p?.trend ?? null, change: p ? trendChange(p) : null, updated: p?.updated ?? null };
  });

  return {
    entries,
    loaded,
    rows,
    error,
    loading: loaded && !!idKey && !fetchedAt && !error,
    total: rows.reduce((sum, r) => sum + (r.price ?? 0) * r.entry.quantity, 0),
    count: entries.reduce((n, e) => n + e.quantity, 0),
    setCount: new Set(rows.map((r) => r.card?.setId).filter(Boolean)).size,
    latest: rows.map((r) => r.updated).filter(Boolean).sort().pop() ?? null,
  };
}
