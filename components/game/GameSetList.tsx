import Link from "next/link";
import SetLogo from "@/components/SetLogo";
import SetProgress from "@/components/SetProgress";
import { gameSetHref, gameSetPrefix, type GamePrefix } from "@/lib/games/refs";
import type { GameSet } from "@/lib/games/types";

// A game's sets grouped by release year (or the group the game gives them), newest first.
export default function GameSetList({ prefix, sets }: { prefix: GamePrefix; sets: GameSet[] }) {
  const years = new Map<string, GameSet[]>();
  for (const s of sets) {
    const year = s.group ?? s.date?.slice(0, 4) ?? "Zonder datum";
    years.set(year, [...(years.get(year) ?? []), s]);
  }
  return (
    <>
      {[...years].map(([year, list]) => (
        <section key={year} className="serie">
          <h2 className="eyebrow">{year}</h2>
          <div className="list">
            {list.map((set) => {
              const setRef = `${prefix}:${set.code}`;
              return (
                <Link key={`${set.code}-${set.name}`} href={gameSetHref(setRef)} className="set-row">
                  <div className="set-symbol">
                    <SetLogo sources={[set.image]} code={set.code.toUpperCase()} />
                  </div>
                  <div className="set-body">
                    <div className="set-name">
                      {set.name} <span className="set-code">{set.code.toUpperCase()}</span>
                    </div>
                    <SetProgress prefix={gameSetPrefix(setRef)} total={set.total} />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}
