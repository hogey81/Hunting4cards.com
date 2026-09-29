import Link from "next/link";
import CardImg from "@/components/CardImg";
import OwnedBadge from "@/components/OwnedBadge";
import { cardImage, getSet, searchCards, type CardResume } from "@/lib/tcgdex";
import { cardCode, parseCodeQuery, sameCardNumber } from "@/lib/set-code";

async function cardsInSets(setIds: string[]) {
  const sets = await Promise.all(setIds.map((id) => getSet(id)));
  return sets.flatMap((set) => set?.cards ?? []);
}

// "PBL 048" finds that card. A bare code like "PBL" lists the whole set, but only
// when no card is named like it ("Mew" is also the code of the 151 set).
async function search(q: string): Promise<CardResume[]> {
  const code = parseCodeQuery(q);
  if (code?.number) {
    const hits = (await cardsInSets(code.setIds)).filter((c) => sameCardNumber(c.localId, code.number!));
    if (hits.length) return hits;
  }
  const byName = await searchCards(q);
  if (byName.length || !code) return byName;
  return cardsInSets(code.setIds);
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").trim();
  let results: CardResume[] = [];
  let failed = false;
  if (q.length >= 2) {
    try {
      results = await search(q);
    } catch {
      failed = true;
    }
  }

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
      {q.length >= 2 && !failed && results.length === 0 && <p className="muted">Geen kaarten gevonden voor “{q}”.</p>}
      <div className="grid">
        {results.map((c) => {
          const code = cardCode(c.id, c.localId);
          return (
            <Link key={c.id} href={`/kaart/${c.id}`} className="tile">
              <div className="tile-img">
                <CardImg src={cardImage(c.image)} name={c.name} code={code} />
                <OwnedBadge cardId={c.id} />
              </div>
              <div className="tile-name">{c.name}</div>
              <div className="tile-meta">{code}</div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
