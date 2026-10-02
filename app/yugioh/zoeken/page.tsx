import Link from "next/link";
import CardImg from "@/components/CardImg";
import YgoSearchForm from "@/components/ygo/YgoSearchForm";
import { searchCards, ygoCardHref, ygoImage, type YgoCard } from "@/lib/ygo";

export default async function YugiohSearch({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").trim();
  let cards: YgoCard[] = [];
  let failed = false;
  if (q.length >= 2) {
    try {
      cards = await searchCards(q);
    } catch {
      failed = true;
    }
  }
  return (
    <>
      <header className="head">
        <h1>Zoeken</h1>
      </header>
      <YgoSearchForm q={q} />
      {failed && <p className="muted">Zoeken lukt nu even niet. Probeer het later opnieuw.</p>}
      {q.length >= 2 && !failed && cards.length === 0 && <p className="muted">Geen kaarten gevonden voor “{q}”.</p>}
      <div className="grid">
        {cards.map((c) => {
          // Open the oldest print first; the card page lists the others.
          const first = c.prints[c.prints.length - 1];
          return (
            <Link key={c.id} href={ygoCardHref(first.ref)} className="tile">
              <div className="tile-img">
                <CardImg src={ygoImage(c.imageId)} name={c.name} code={first.code} />
              </div>
              <div className="tile-name">{c.name}</div>
              <div className="tile-meta">{c.prints.length} {c.prints.length === 1 ? "druk" : "drukken"}</div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
