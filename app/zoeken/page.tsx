import Link from "next/link";
import CardImg from "@/components/CardImg";
import OwnedBadge from "@/components/OwnedBadge";
import { cardImage, getSet, searchCards, type CardResume, type Region } from "@/lib/tcgdex";
import { cardCode, parseCodeQuery, sameCardNumber } from "@/lib/set-code";
import { cardHref, toRef } from "@/lib/card-ref";
import { hasJapanese, japaneseNameFor } from "@/lib/names";

async function cardsInSets(setIds: string[], region: Region) {
  const sets = await Promise.all(setIds.map((id) => getSet(id, region)));
  return sets.flatMap((set) => set?.cards ?? []);
}

type Results = { en: CardResume[]; ja: CardResume[] };

// "PBL 048" (international) or "M4 001" (Japanese) finds that card. A bare code lists
// the whole set, but only when no card is named like it ("Mew" is also a set code).
// A name searches both: English names are translated to find the Japanese cards too.
async function search(q: string): Promise<Results> {
  const code = parseCodeQuery(q);
  if (code?.number) {
    const [en, ja] = await Promise.all([
      cardsInSets(code.setIds, "en"),
      code.jpSetId ? cardsInSets([code.jpSetId], "ja") : Promise.resolve([]),
    ]);
    const hits = {
      en: en.filter((c) => sameCardNumber(c.localId, code.number!)),
      ja: ja.filter((c) => sameCardNumber(c.localId, code.number!)),
    };
    if (hits.en.length || hits.ja.length) return hits;
  }

  const jaName = hasJapanese(q) ? q : japaneseNameFor(q)?.ja;
  const [en, ja] = await Promise.all([
    hasJapanese(q) ? Promise.resolve([]) : searchCards(q, "en"),
    jaName ? searchCards(jaName, "ja").catch(() => []) : Promise.resolve([]),
  ]);
  if (en.length || ja.length || !code) return { en, ja };

  const [setEn, setJa] = await Promise.all([
    cardsInSets(code.setIds, "en"),
    code.jpSetId ? cardsInSets([code.jpSetId], "ja") : Promise.resolve([]),
  ]);
  return { en: setEn, ja: setJa };
}

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
