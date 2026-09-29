import Link from "next/link";
import OwnedBadge from "@/components/OwnedBadge";
import { cardImage, searchCards } from "@/lib/tcgdex";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").trim();
  let results: Awaited<ReturnType<typeof searchCards>> = [];
  let failed = false;
  if (q.length >= 2) {
    try {
      results = await searchCards(q);
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
        <label htmlFor="q" className="sr-only">Zoek een kaart</label>
        <input id="q" name="q" type="search" defaultValue={q} placeholder="Bijvoorbeeld Charizard" autoComplete="off" />
        <button type="submit" className="btn btn-primary">Zoek</button>
      </form>
      {failed && <p className="muted">Zoeken lukt nu even niet. Probeer het later opnieuw.</p>}
      {q.length >= 2 && !failed && results.length === 0 && <p className="muted">Geen kaarten gevonden voor “{q}”.</p>}
      <div className="grid">
        {results.map((c) => {
          const img = cardImage(c.image);
          return (
            <Link key={c.id} href={`/kaart/${c.id}`} className="tile">
              <div className="tile-img">
                {img ? <img src={img} alt={c.name} loading="lazy" /> : <span>{c.name}</span>}
                <OwnedBadge cardId={c.id} />
              </div>
              <div className="tile-name">{c.name}</div>
              <div className="tile-meta">{c.id}</div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
