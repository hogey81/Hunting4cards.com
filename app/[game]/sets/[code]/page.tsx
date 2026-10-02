import Link from "next/link";
import { notFound } from "next/navigation";
import GameGrid from "@/components/game/GameGrid";
import SetLogo from "@/components/SetLogo";
import { gameBySlug } from "@/lib/games";

export const revalidate = 3600;

export default async function GameSet({ params }: { params: Promise<{ game: string; code: string }> }) {
  const { game: slug, code } = await params;
  const game = gameBySlug(slug);
  if (!game) notFound();
  const found = await game.getSet(decodeURIComponent(code));
  if (!found) notFound();
  const { set, cards } = found;
  return (
    <>
      <Link href={`/${slug}/sets`} className="back">← Sets</Link>
      <header className="set-head">
        <SetLogo sources={[set.image]} code={null} className="set-logo" />
        <h1>{set.name}</h1>
        <p className="muted">
          {set.code.toUpperCase()} · {cards.length} kaarten
          {set.date ? ` · ${set.date.slice(0, 4)}` : ""}
        </p>
      </header>
      <GameGrid cards={cards} />
    </>
  );
}
