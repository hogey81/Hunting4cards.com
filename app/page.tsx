"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useCollection } from "@/lib/collection";
import { formatChange, formatEur, formatUpdated, trendChange, type PricedCard } from "@/lib/prices";

type Filter = "Alles" | "Stijgers" | "Dalers";

export default function CollectionPage() {
  const { entries, loaded } = useCollection();
  const [prices, setPrices] = useState<Record<string, PricedCard>>({});
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<Filter>("Alles");

  const idKey = useMemo(() => [...new Set(entries.map((e) => e.cardId))].sort().join(","), [entries]);

  // Load the latest prices every time the app opens (and when the collection changes).
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

  const rows = entries.map((e) => {
    const card = prices[e.cardId];
    const p = card ? card[e.variant] : null;
    return { entry: e, card, price: p?.trend ?? null, change: p ? trendChange(p) : null, updated: p?.updated ?? null };
  });

  const total = rows.reduce((sum, r) => sum + (r.price ?? 0) * r.entry.quantity, 0);
  const count = entries.reduce((n, e) => n + e.quantity, 0);
  const setCount = new Set(rows.map((r) => r.card?.setId).filter(Boolean)).size;
  const latest = rows.map((r) => r.updated).filter(Boolean).sort().pop() ?? null;

  const visible = rows
    .filter((r) => (filter === "Stijgers" ? (r.change ?? 0) > 0 : filter === "Dalers" ? (r.change ?? 0) < 0 : true))
    .sort((a, b) => (b.price ?? 0) - (a.price ?? 0));

  return (
    <>
      <header className="head">
        <h1>Mijn collectie</h1>
        <Link href="/zoeken" className="round-btn" aria-label="Kaart zoeken">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-4-4" />
          </svg>
        </Link>
      </header>

      <section className="value-card">
        <div className="value-ring" aria-hidden="true" />
        <div className="muted-light">Waarde van je collectie</div>
        <div className="value">{loaded && idKey && !fetchedAt && !error ? "Laden…" : formatEur(total)}</div>
        {(error || latest) && (
          <div className="updated">
            <span className={error ? "dot dot-bad" : "dot"} aria-hidden="true" />
            {error
              ? "Prijzen konden niet worden geladen. Probeer het later opnieuw."
              : `Cardmarket-prijzen van ${formatUpdated(latest)}`}
          </div>
        )}
      </section>

      <section className="stats">
        <div className="stat"><strong>{count}</strong><span>kaarten</span></div>
        <div className="stat"><strong>{setCount}</strong><span>sets</span></div>
        <div className="stat"><strong>{entries.length}</strong><span>unieke</span></div>
      </section>

      {loaded && entries.length === 0 ? (
        <section className="empty">
          <h2>Nog geen kaarten</h2>
          <p>Zoek een kaart of blader door de sets en tik op Toevoegen.</p>
          <div className="row">
            <Link href="/zoeken" className="btn btn-primary">Kaart zoeken</Link>
            <Link href="/sets" className="btn">Bekijk sets</Link>
          </div>
        </section>
      ) : (
        <>
          <div className="chips" role="group" aria-label="Filter">
            {(["Alles", "Stijgers", "Dalers"] as Filter[]).map((f) => (
              <button key={f} className={f === filter ? "chip on" : "chip"} aria-pressed={f === filter} onClick={() => setFilter(f)}>
                {f}
              </button>
            ))}
          </div>
          <div className="grid">
            {visible.map(({ entry, card, price, change }) => (
              <Link key={entry.key} href={`/kaart/${entry.cardId}`} className="tile">
                <div className="tile-img">
                  {card?.image ? <img src={card.image} alt={card.name} loading="lazy" /> : <span>{card?.name ?? entry.cardId}</span>}
                  {entry.quantity > 1 && <span className="qty">{entry.quantity}×</span>}
                </div>
                <div className="tile-name">{card?.name ?? "…"}</div>
                <div className="tile-meta">
                  {entry.language}
                  {entry.variant === "reverse" ? " · reverse" : ""}
                </div>
                <div className="tile-price">
                  <strong>{formatEur(price)}</strong>
                  {change != null && <span className={change >= 0 ? "up" : "down"}>{formatChange(change)}</span>}
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </>
  );
}
