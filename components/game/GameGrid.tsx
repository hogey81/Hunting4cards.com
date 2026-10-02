import Link from "next/link";
import CardImg from "@/components/CardImg";
import OwnedBadge from "@/components/OwnedBadge";
import { gameCardHref } from "@/lib/games/refs";
import type { GameTile } from "@/lib/games/types";

export default function GameGrid({ cards, owned = true }: { cards: GameTile[]; owned?: boolean }) {
  return (
    <div className="grid">
      {cards.map((c) => (
        <Link key={c.ref} href={gameCardHref(c.ref)} className="tile">
          <div className="tile-img">
            <CardImg src={c.image} name={c.name} code={c.code} />
            {owned && <OwnedBadge cardId={c.ref} />}
          </div>
          <div className="tile-name">{c.name}</div>
          <div className="tile-meta">{c.code}{c.sub ? ` · ${c.sub}` : ""}</div>
        </Link>
      ))}
    </div>
  );
}
