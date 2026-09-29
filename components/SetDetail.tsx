import Link from "next/link";
import CardImg from "@/components/CardImg";
import OwnedBadge from "@/components/OwnedBadge";
import { assetImage, cardImage, type CardSet, type Region } from "@/lib/tcgdex";
import { cardHref, toRef } from "@/lib/card-ref";
import { setCode } from "@/lib/set-code";

export default function SetDetail({ set, region }: { set: CardSet; region: Region }) {
  const jp = region === "ja";
  const logo = assetImage(set.logo);
  const code = jp ? set.id : setCode(set);

  return (
    <>
      <Link href={jp ? "/sets?regio=jp" : "/sets"} className="back">← Sets</Link>
      <header className="set-head">
        {logo && <img src={logo} alt="" className="set-logo" />}
        <h1>
          {set.name}
          {jp && <span className="badge-jp">JP</span>}
        </h1>
        <p className="muted">
          {code} · {set.serie.name} · {set.cardCount.total} kaarten
          {set.releaseDate ? ` · ${new Date(set.releaseDate).getFullYear()}` : ""}
        </p>
      </header>
      <div className="grid">
        {set.cards.map((c) => {
          const ref = toRef(region, c.id);
          return (
            <Link key={c.id} href={cardHref(ref)} className="tile">
              <div className="tile-img">
                <CardImg src={cardImage(c.image)} name={c.name} code={`${code} ${c.localId}`} />
                <OwnedBadge cardId={ref} />
              </div>
              <div className="tile-name">{c.name}</div>
              <div className="tile-meta">{code} {c.localId}</div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
