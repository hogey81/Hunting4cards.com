import Link from "next/link";
import { preload } from "react-dom";
import AddToCollection from "@/components/AddToCollection";
import CardImg from "@/components/CardImg";
import { cardImage, getSet, type Card, type Region } from "@/lib/tcgdex";
import { cardmarketProductUrl } from "@/lib/cardmarket-url";
import { cardHref, setHref, toRef } from "@/lib/card-ref";
import { englishNameForDex } from "@/lib/names";
import { setCode } from "@/lib/set-code";
import { cardmarketSearchUrl, formatChange, formatEur, formatUpdated, pricesFor, trendChange, type PriceInfo } from "@/lib/prices";

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

export default async function CardDetail({ card, region }: { card: Card; region: Region }) {
  const jp = region === "ja";
  const set = await getSet(card.set.id, region).catch(() => null);
  // Japanese cards have their own Cardmarket pages we can't derive yet: those use search.
  const productUrl = jp ? null : cardmarketProductUrl(card, set);
  // The cards before and after this one in the set, for the arrows.
  const at = set?.cards.findIndex((c) => c.id === card.id) ?? -1;
  const prev = at > 0 ? set!.cards[at - 1] : null;
  const next = at >= 0 && at < set!.cards.length - 1 ? set!.cards[at + 1] : null;
  // Load the neighbours' pictures in advance, so the arrows switch without a blank moment.
  for (const c of [prev, next]) {
    const src = c && cardImage(c.image, "high");
    if (src) preload(src, { as: "image" });
  }
  const code = `${jp ? card.set.id : setCode(card.set)} ${card.localId}`;
  const englishName = jp ? englishNameForDex(card.dexId?.[0]) : null;
  const cm = card.pricing?.cardmarket;
  const normal = pricesFor(cm, "normal");
  const reverse = pricesFor(cm, "reverse");
  const hasReverse = reverse.trend != null;

  return (
    <>
      <Link href={setHref(region, card.set.id)} className="back">← {card.set.name}</Link>
      <div className="card-hero">
        {prev && (
          <Link href={cardHref(toRef(region, prev.id))} className="card-nav prev" prefetch scroll={false} aria-label={`Vorige kaart: ${prev.name}`}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
          </Link>
        )}
        <CardImg src={cardImage(card.image, "high")} name={card.name} code={code} eager />
        {next && (
          <Link href={cardHref(toRef(region, next.id))} className="card-nav next" prefetch scroll={false} aria-label={`Volgende kaart: ${next.name}`}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
          </Link>
        )}
      </div>
      <header className="card-head">
        <h1>
          {card.name}
          {jp && <span className="badge-jp">JP</span>}
        </h1>
        <p className="muted">
          {englishName ? `${englishName} · ` : ""}
          {card.set.name} · {code}/{card.set.cardCount.official}
          {card.rarity ? ` · ${card.rarity}` : ""}
        </p>
      </header>

      {cm ? (
        <>
          <PriceBlock title={jp ? "Trendprijs Japanse kaart (Cardmarket)" : "Trendprijs (Cardmarket)"} p={normal} />
          {hasReverse && <PriceBlock title="Trendprijs reverse holo" p={reverse} />}
          <p className="updated-line">
            <span className="dot" aria-hidden="true" />
            Cardmarket-prijs van {formatUpdated(normal.updated)}.
            {jp ? " Dit is de prijs van deze Japanse kaart." : " Dit is de prijs over alle westerse talen samen."}
          </p>
        </>
      ) : (
        <p className="muted">Voor deze kaart is nog geen Cardmarket-prijs bekend.</p>
      )}

      <AddToCollection cardRef={toRef(region, card.id)} japanese={jp} hasReverse={hasReverse || !!card.variants?.reverse} hasHolo={!!card.variants?.holo} />
      <a href={productUrl ?? cardmarketSearchUrl(englishName ?? card.name)} className="btn btn-block" target="_blank" rel="noopener noreferrer">
        Bekijk op Cardmarket
      </a>
    </>
  );
}
