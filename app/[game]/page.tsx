import Link from "next/link";
import { notFound } from "next/navigation";
import GameSearchForm from "@/components/game/GameSearchForm";
import GameSetList from "@/components/game/GameSetList";
import { gameBySlug } from "@/lib/games";

export const revalidate = 3600;

// Start of a game's part (/yugioh, /magic, /lorcana): search and the newest sets.
export default async function GameHome({ params }: { params: Promise<{ game: string }> }) {
  const { game: slug } = await params;
  const game = gameBySlug(slug);
  if (!game) notFound();
  const sets = await game.getSets().catch(() => []);
  const today = new Date().toISOString().slice(0, 10);
  const recent = sets.filter((s) => !s.date || s.date <= today).slice(0, 24);
  return (
    <>
      <header className="head">
        <h1>{game.name}</h1>
      </header>
      <GameSearchForm action={`/${slug}/zoeken`} hint={game.searchHint} />
      {sets.length === 0 && <p className="muted">De sets konden niet worden geladen. Probeer het later opnieuw.</p>}
      {recent.length > 0 && (
        <>
          <div className="head">
            <h2 className="results-head">Nieuwste sets</h2>
            <Link href={`/${slug}/sets`} className="link">Alle {sets.length} sets ›</Link>
          </div>
          <GameSetList prefix={game.prefix} sets={recent} />
        </>
      )}
    </>
  );
}
