import Link from "next/link";
import { notFound } from "next/navigation";
import { preload } from "react-dom";
import AddToCollection from "@/components/AddToCollection";
import CardImg from "@/components/CardImg";
import { formatEur } from "@/lib/prices";
import { YGO_PREFIX, getPrint, ygoCardHref, ygoCardmarketUrl, ygoImage, ygoSetHref } from "@/lib/ygo";

export const revalidate = 3600;

// Yu-Gi-Oh! comes in these languages; there is no Dutch edition.
const YGO_LANGUAGES = ["EN", "DE", "FR", "IT", "ES", "PT"] as const;

export default async function YugiohCard({ params }: { params: Promise<{ ref: string }> }) {
  const ref = YGO_PREFIX + decodeURIComponent((await params).ref);
  const found = await getPrint(ref);
  if (!found) notFound();
  const { set, card, print, prev, next } = found;
  for (const c of [prev, next]) if (c) preload(ygoImage(c.card.imageId, "big"), { as: "image" });
  // The other prints of this card, so you can jump to the one you have.
  const others = card.prints.filter((p) => p.ref !== print.ref);
  const stats = [card.attribute, card.race, card.level ? `Level ${card.level}` : null, card.atk != null ? `ATK ${card.atk}` : null, card.def != null ? `DEF ${card.def}` : null].filter(Boolean);

  return (
    <>
      <Link href={ygoSetHref(set.code)} className="back">← {set.name}</Link>
      <div className="card-hero">
        {prev && (
          <Link href={ygoCardHref(prev.print.ref)} className="card-nav prev" prefetch scroll={false} aria-label={`Vorige kaart: ${prev.card.name}`}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
          </Link>
        )}
        <CardImg src={ygoImage(card.imageId, "big")} name={card.name} code={print.code} eager />
        {next && (
          <Link href={ygoCardHref(next.print.ref)} className="card-nav next" prefetch scroll={false} aria-label={`Volgende kaart: ${next.card.name}`}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
          </Link>
        )}
      </div>
      <header className="card-head">
        <h1>{card.name}</h1>
        <p className="muted">
          {set.name} · {print.code} · {print.rarity}
        </p>
        <p className="muted small">{[card.type, ...stats].join(" · ")}</p>
      </header>

      <section className="price-card">
        <div className="price-top">
          <div>
            <div className="muted small">Prijs (Cardmarket)</div>
            <div className="price-big">{formatEur(card.cardmarket)}</div>
          </div>
        </div>
      </section>
      <p className="updated-line">
        <span className="dot" aria-hidden="true" />
        Cardmarket-prijs via YGOPRODeck, dagelijks bijgewerkt. Dit is één prijs voor alle drukken van deze kaart samen; zeldzame drukken kunnen meer waard zijn.
      </p>

      <AddToCollection cardRef={print.ref} japanese={false} hasReverse={false} languages={YGO_LANGUAGES} />
      <a href={ygoCardmarketUrl(card.name)} className="btn btn-block" target="_blank" rel="noopener noreferrer">
        Bekijk op Cardmarket
      </a>

      {others.length > 0 && (
        <section className="ygo-prints">
          <h2 className="results-head">Ook verschenen in</h2>
          <div className="list">
            {others.map((p) => (
              <Link key={p.ref} href={ygoCardHref(p.ref)} className="ygo-print">
                <span>{p.setName}</span>
                <span className="muted small">{p.code} · {p.rarity}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
      <p className="muted small">{card.desc}</p>
    </>
  );
}
