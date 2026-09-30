"use client";

import Link from "next/link";
import { useState } from "react";
import { useCollectionPrices } from "@/lib/use-collection-prices";
import { cardCode } from "@/lib/set-code";
import { cardHref } from "@/lib/card-ref";
import CardImg from "@/components/CardImg";
import { formatChange, formatEur, formatUpdated } from "@/lib/prices";

export type Filter = "Alles" | "Stijgers" | "Dalers";

export default function CollectionView({ initialFilter }: { initialFilter: Filter }) {
  const { entries, loaded, rows, error, loading, total, count, setCount, latest } = useCollectionPrices();
  const [filter, setFilter] = useState<Filter>(initialFilter);

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
        <div className="value">{loading ? "Laden…" : formatEur(total)}</div>
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
              <Link key={entry.key} href={cardHref(entry.cardId)} className="tile">
                <div className="tile-img">
                  <CardImg src={card?.image ?? null} name={card?.name ?? cardCode(entry.cardId)} code={cardCode(entry.cardId, card?.localId)} />
                  {entry.quantity > 1 && <span className="qty">{entry.quantity}×</span>}
                </div>
                <div className="tile-name">{card?.name ?? "…"}</div>
                <div className="tile-meta">
                  {card ? cardCode(card.id, card.localId) : cardCode(entry.cardId)} · {entry.language} · {entry.condition}
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
