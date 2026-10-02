import { notFound } from "next/navigation";
import GameSetList from "@/components/game/GameSetList";
import { gameBySlug } from "@/lib/games";

export const revalidate = 3600;

export default async function GameSets({ params }: { params: Promise<{ game: string }> }) {
  const game = gameBySlug((await params).game);
  if (!game) notFound();
  const sets = await game.getSets().catch(() => []);
  return (
    <>
      <header className="head">
        <h1>Sets</h1>
      </header>
      {sets.length === 0 && <p className="muted">De sets konden niet worden geladen. Probeer het later opnieuw.</p>}
      <GameSetList prefix={game.prefix} sets={sets} />
    </>
  );
}
