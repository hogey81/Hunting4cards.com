import Link from "next/link";
import { notFound } from "next/navigation";
import CardImg from "@/components/CardImg";
import OwnedBadge from "@/components/OwnedBadge";
import SetLogo from "@/components/SetLogo";
import { getSet, ygoCardHref, ygoImage, ygoSetImage } from "@/lib/ygo";

export const revalidate = 3600;

export default async function YugiohSet({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const set = await getSet(decodeURIComponent(code));
  if (!set) notFound();
  return (
    <>
      <Link href="/yugioh/sets" className="back">← Sets</Link>
      <header className="set-head">
        <SetLogo sources={[ygoSetImage(set.code)]} code={null} className="set-logo" />
        <h1>{set.name}</h1>
        <p className="muted">
          {set.code} · {set.cards.length} kaarten
          {set.date ? ` · ${set.date.slice(0, 4)}` : ""}
        </p>
      </header>
      <div className="grid">
        {set.cards.map(({ card, print }) => (
          <Link key={print.ref} href={ygoCardHref(print.ref)} className="tile">
            <div className="tile-img">
              <CardImg src={ygoImage(card.imageId)} name={card.name} code={print.code} />
              <OwnedBadge cardId={print.ref} />
            </div>
            <div className="tile-name">{card.name}</div>
            <div className="tile-meta">{print.code} · {print.rarityCode}</div>
          </Link>
        ))}
      </div>
    </>
  );
}
