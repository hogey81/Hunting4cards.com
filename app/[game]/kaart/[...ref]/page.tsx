import Link from "next/link";
import { notFound } from "next/navigation";
import { preload } from "react-dom";
import AddToCollection from "@/components/AddToCollection";
import CardImg from "@/components/CardImg";
import { gameBySlug } from "@/lib/games";
import { gameCardHref, gameSetHref } from "@/lib/games/refs";
import { formatEur, type PriceInfo } from "@/lib/prices";

export const revalidate = 3600;

function Price({ title, value }: { title: string; value: string }) {
  return (
    <section className="price-card">
      <div className="price-top">
        <div>
          <div className="muted small">{title}</div>
          <div className="price-big">{value}</div>
        </div>
      </div>
    </section>
  );
}

const has = (p: PriceInfo | null): p is PriceInfo => p?.trend != null;

export default async function GameCardPage({ params }: { params: Promise<{ game: string; ref: string[] }> }) {
  const { game: slug, ref: parts } = await params;
  const game = gameBySlug(slug);
  if (!game) notFound();
  const ref = `${game.prefix}:${parts.map(decodeURIComponent).join("/")}`;
  const found = await game.getCard(ref).catch(() => null);
  if (!found) notFound();
  const { set, card, prev, next } = found;
  for (const c of [prev, next]) if (c?.image) preload(c.image, { as: "image" });
  const anyPrice = has(card.normal) || has(card.foil) || !!card.otherPrice;

  return (
    <>
      <Link href={gameSetHref(`${game.prefix}:${set.code}`)} className="back">← {set.name}</Link>
      <div className="card-hero">
        {prev && (
          <Link href={gameCardHref(prev.ref)} className="card-nav prev" prefetch scroll={false} aria-label={`Vorige kaart: ${prev.name}`}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
          </Link>
        )}
        <CardImg src={card.bigImage} name={card.name} code={card.code} eager />
        {next && (
          <Link href={gameCardHref(next.ref)} className="card-nav next" prefetch scroll={false} aria-label={`Volgende kaart: ${next.name}`}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
          </Link>
        )}
      </div>
      <header className="card-head">
        <h1>{card.name}</h1>
        <p className="muted">
          {set.name} · {card.code}
          {card.rarity ? ` · ${card.rarity}` : ""}
        </p>
        {card.facts.length > 0 && <p className="muted small">{card.facts.join(" · ")}</p>}
      </header>

      {has(card.normal) && <Price title="Prijs (Cardmarket)" value={formatEur(card.normal.trend)} />}
      {has(card.foil) && <Price title={`Prijs ${game.foilLabel ?? "foil"} (Cardmarket)`} value={formatEur(card.foil.trend)} />}
      {card.otherPrice && <Price title={card.otherPrice.label} value={card.otherPrice.value} />}
      {anyPrice ? (
        <p className="updated-line">
          <span className="dot" aria-hidden="true" />
          {card.priceNote}
        </p>
      ) : (
        <p className="muted">Voor deze kaart is nog geen prijs bekend.</p>
      )}

      <AddToCollection
        cardRef={card.ref}
        japanese={false}
        hasReverse={!!game.foilLabel && card.foil !== null}
        languages={game.languages}
        variantNames={game.foilLabel ? { reverse: game.foilLabel } : undefined}
      />
      <a href={card.cardmarketUrl} className="btn btn-block" target="_blank" rel="noopener noreferrer">
        Bekijk op Cardmarket
      </a>

      {card.others.length > 0 && (
        <section className="game-prints">
          <h2 className="results-head">Ook verschenen in</h2>
          <div className="list">
            {card.others.map((p) => (
              <Link key={p.ref} href={gameCardHref(p.ref)} className="game-print">
                <span>{p.label}</span>
                <span className="muted small">{p.sub}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
      {card.text && <p className="muted small card-text">{card.text}</p>}
    </>
  );
}
