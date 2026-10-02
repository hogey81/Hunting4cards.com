import { notFound } from "next/navigation";
import GameGrid from "@/components/game/GameGrid";
import GameSearchForm from "@/components/game/GameSearchForm";
import { gameBySlug } from "@/lib/games";
import type { GameTile } from "@/lib/games/types";

export default async function GameSearch({ params, searchParams }: { params: Promise<{ game: string }>; searchParams: Promise<{ q?: string }> }) {
  const { game: slug } = await params;
  const game = gameBySlug(slug);
  if (!game) notFound();
  const q = ((await searchParams).q ?? "").trim();
  let cards: GameTile[] = [];
  let failed = false;
  if (q.length >= 2) {
    try {
      cards = await game.search(q);
    } catch {
      failed = true;
    }
  }
  return (
    <>
      <header className="head">
        <h1>Zoeken</h1>
      </header>
      <GameSearchForm action={`/${slug}/zoeken`} hint={game.searchHint} q={q} />
      {failed && <p className="muted">Zoeken lukt nu even niet. Probeer het later opnieuw.</p>}
      {q.length >= 2 && !failed && cards.length === 0 && <p className="muted">Geen kaarten gevonden voor “{q}”.</p>}
      <GameGrid cards={cards} owned={false} />
    </>
  );
}
