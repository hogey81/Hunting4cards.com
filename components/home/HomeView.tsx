"use client";

import Link from "next/link";
import CardImg from "@/components/CardImg";
import { CardsArt, ChartArt, JapanArt, SearchArt, SetsArt } from "@/components/home/Art";
import { cardHref } from "@/lib/card-ref";
import { formatChange, formatEur, formatUpdated } from "@/lib/prices";
import { cardCode } from "@/lib/set-code";
import { useCollectionPrices } from "@/lib/use-collection-prices";

function Tile({ href, title, sub, art, wide = false }: { href: string; title: string; sub?: string; art: React.ReactNode; wide?: boolean }) {
  return (
    <Link href={href} className={wide ? "tile-card wide" : "tile-card"}>
      <span className="tile-title">{title}</span>
      {sub && <span className="tile-sub">{sub}</span>}
      <span className="tile-art">{art}</span>
    </Link>
  );
}

export default function HomeView() {
  const { rows, loaded, error, loading, total, count, latest } = useCollectionPrices();
  const risers = rows.filter((r) => (r.change ?? 0) > 0).length;
  const fallers = rows.filter((r) => (r.change ?? 0) < 0).length;
  const valued = rows.filter((r) => r.price != null);
  const change =
    valued.length > 0
      ? valued.reduce((s, r) => s + (r.price ?? 0) * r.entry.quantity * ((r.change ?? 0) / 100), 0) / (total || 1) * 100
      : null;
  const recent = [...rows].sort((a, b) => b.entry.addedAt.localeCompare(a.entry.addedAt)).slice(0, 8);

  return (
    <>
      <header className="home-head">
        <h1>Hunting4Cards</h1>
      </header>

      <form action="/zoeken" className="home-search" role="search">
        <label htmlFor="home-q" className="sr-only">Zoek een kaart op naam of code</label>
        <input id="home-q" name="q" type="search" placeholder="Naam of code, bv. PBL 048" autoComplete="off" enterKeyHint="search" />
        <button type="submit" aria-label="Zoeken">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-4-4" />
          </svg>
        </button>
      </form>

      <Link href="/collectie" className="value-card value-link">
        <div className="value-ring" aria-hidden="true" />
        <div className="muted-light">Waarde van je collectie</div>
        <div className="value-row">
          <div className="value">{loading ? "Laden…" : formatEur(total)}</div>
          {change != null && !loading && <span className={change >= 0 ? "up-light" : "down-light"}>{formatChange(change)}</span>}
        </div>
        <div className="updated">
          <span className={error ? "dot dot-bad" : "dot"} aria-hidden="true" />
          {error ? "Prijzen konden niet worden geladen" : latest ? `Cardmarket-prijzen van ${formatUpdated(latest)}` : "Voeg kaarten toe om hun waarde te zien"}
        </div>
      </Link>

      <nav className="tiles" aria-label="Menu">
        <Tile href="/collectie" title="Mijn kaarten" sub={loaded ? `${count} ${count === 1 ? "kaart" : "kaarten"}` : undefined} art={<CardsArt />} />
        <Tile href="/sets" title="Sets" sub="Voortgang per set" art={<SetsArt />} />
        <Tile href="/collectie?filter=stijgers" title="Stijgers" sub={loaded ? `${risers} in je collectie` : undefined} art={<ChartArt />} />
        <Tile href="/collectie?filter=dalers" title="Dalers" sub={loaded ? `${fallers} in je collectie` : undefined} art={<ChartArt down />} />
        <Tile href="/sets?regio=jp" title="Japanse kaarten" sub="Eigen sets en prijzen" art={<JapanArt />} />
        <Tile href="/zoeken" title="Zoek op code" sub="Setcode en nummer" art={<SearchArt />} />
      </nav>

      {recent.length > 0 && (
        <section className="recent">
          <div className="section-head">
            <h2>Laatst toegevoegd</h2>
            <Link href="/collectie">Alles bekijken</Link>
          </div>
          <div className="strip">
            {recent.map(({ entry, card, price }) => (
              <Link key={entry.key} href={cardHref(entry.cardId)} className="strip-card">
                <div className="tile-img">
                  <CardImg src={card?.image ?? null} name={card?.name ?? cardCode(entry.cardId)} code={cardCode(entry.cardId, card?.localId)} />
                </div>
                <span className="tile-name">{card?.name ?? "…"}</span>
                <strong className="small">{formatEur(price)}</strong>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
