import Link from "next/link";
import CardImg from "@/components/CardImg";
import OwnedBadge from "@/components/OwnedBadge";
import { cardImage, type CardResume, type Region } from "@/lib/tcgdex";
import { cardCode } from "@/lib/set-code";
import { cardHref, toRef } from "@/lib/card-ref";
import { search, type Results } from "@/lib/search";

function CardGrid({ cards, region }: { cards: CardResume[]; region: Region }) {
  return (
    <div className="grid">
      {cards.map((c) => {
        const ref = toRef(region, c.id);
        const code = cardCode(ref, c.localId);
        return (
          <Link key={ref} href={cardHref(ref)} className="tile">
            <div className="tile-img">
              <CardImg src={cardImage(c.image)} name={c.name} code={code} />
              <OwnedBadge cardId={ref} />
            </div>
            <div className="tile-name">{c.name}</div>
            <div className="tile-meta">{code}</div>
          </Link>
        );
      })}
    </div>
  );
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").trim();
  let results: Results = { en: [], ja: [] };
  let failed = false;
  if (q.length >= 2) {
    try {
      results = await search(q);
    } catch {
      failed = true;
    }
  }
  const none = results.en.length === 0 && results.ja.length === 0;

  return (
    <>
      <header className="head">
        <h1>Zoeken</h1>
      </header>
      <form action="/zoeken" className="search" role="search">
        <label htmlFor="q" className="sr-only">Zoek een kaart op naam of code</label>
        <input id="q" name="q" type="search" defaultValue={q} placeholder="Naam of code, bv. PBL 048" autoComplete="off" />
        <button type="submit" className="btn btn-primary">Zoek</button>
      </form>
      {failed && <p className="muted">Zoeken lukt nu even niet. Probeer het later opnieuw.</p>}
      {q.length >= 2 && !failed && none && <p className="muted">Geen kaarten gevonden voor “{q}”.</p>}
      {results.en.length > 0 && (
        <>
          {results.ja.length > 0 && <h2 className="results-head">Internationaal</h2>}
          <CardGrid cards={results.en} region="en" />
        </>
      )}
      {results.ja.length > 0 && (
        <>
          <h2 className="results-head">Japans</h2>
          <CardGrid cards={results.ja} region="ja" />
        </>
      )}
    </>
  );
}
