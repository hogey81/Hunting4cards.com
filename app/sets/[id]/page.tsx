import Link from "next/link";
import { notFound } from "next/navigation";
import OwnedBadge from "@/components/OwnedBadge";
import { assetImage, cardImage, getSet } from "@/lib/tcgdex";

export const revalidate = 3600;

export default async function SetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const set = await getSet(id);
  if (!set) notFound();
  const logo = assetImage(set.logo);

  return (
    <>
      <Link href="/sets" className="back">← Sets</Link>
      <header className="set-head">
        {logo && <img src={logo} alt="" className="set-logo" />}
        <h1>{set.name}</h1>
        <p className="muted">
          {set.serie.name} · {set.cardCount.total} kaarten
          {set.releaseDate ? ` · ${new Date(set.releaseDate).getFullYear()}` : ""}
        </p>
      </header>
      <div className="grid">
        {set.cards.map((c) => {
          const img = cardImage(c.image);
          return (
            <Link key={c.id} href={`/kaart/${c.id}`} className="tile">
              <div className="tile-img">
                {img ? <img src={img} alt={c.name} loading="lazy" /> : <span>{c.name}</span>}
                <OwnedBadge cardId={c.id} />
              </div>
              <div className="tile-name">{c.name}</div>
              <div className="tile-meta">#{c.localId}</div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
