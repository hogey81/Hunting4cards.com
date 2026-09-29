import Link from "next/link";
import { notFound } from "next/navigation";
import AddToCollection from "@/components/AddToCollection";
import { cardImage, getCard } from "@/lib/tcgdex";
import { cardmarketSearchUrl, formatChange, formatEur, formatUpdated, pricesFor, trendChange, type PriceInfo } from "@/lib/prices";

export const revalidate = 3600;

function PriceBlock({ title, p }: { title: string; p: PriceInfo }) {
  const change = trendChange(p);
  return (
    <section className="price-card">
      <div className="price-top">
        <div>
          <div className="muted small">{title}</div>
          <div className="price-big">{formatEur(p.trend)}</div>
        </div>
        {change != null && (
          <div className={change >= 0 ? "up" : "down"}>
            {formatChange(change)} <span className="muted small">t.o.v. 30 dagen</span>
          </div>
        )}
      </div>
      <div className="price-grid">
        <div><span>Vanaf</span><strong>{formatEur(p.low)}</strong></div>
        <div><span>Gem. 7 dagen</span><strong>{formatEur(p.avg7)}</strong></div>
        <div><span>Gem. 30 dagen</span><strong>{formatEur(p.avg30)}</strong></div>
      </div>
    </section>
  );
}

export default async function CardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = await getCard(id);
  if (!card) notFound();

  const img = cardImage(card.image, "high");
  const cm = card.pricing?.cardmarket;
  const normal = pricesFor(cm, "normal");
  const reverse = pricesFor(cm, "reverse");
  const hasReverse = reverse.trend != null;

  return (
    <>
      <Link href={`/sets/${card.set.id}`} className="back">← {card.set.name}</Link>
      <div className="card-hero">
        {img ? <img src={img} alt={card.name} /> : <div className="card-placeholder">{card.name}</div>}
      </div>
      <header className="card-head">
        <h1>{card.name}</h1>
        <p className="muted">
          {card.set.name} · {card.localId}/{card.set.cardCount.official}
          {card.rarity ? ` · ${card.rarity}` : ""}
        </p>
      </header>

      {cm ? (
        <>
          <PriceBlock title="Trendprijs (Cardmarket)" p={normal} />
          {hasReverse && <PriceBlock title="Trendprijs reverse holo" p={reverse} />}
          <p className="updated-line">
            <span className="dot" aria-hidden="true" />
            Cardmarket-prijs van {formatUpdated(normal.updated)}. Dit is de prijs over alle talen samen.
          </p>
        </>
      ) : (
        <p className="muted">Voor deze kaart is nog geen Cardmarket-prijs bekend.</p>
      )}

      <AddToCollection cardId={card.id} hasReverse={hasReverse || !!card.variants?.reverse} />
      <a href={cardmarketSearchUrl(card.name)} className="btn btn-block" target="_blank" rel="noopener noreferrer">
        Bekijk op Cardmarket
      </a>
    </>
  );
}
