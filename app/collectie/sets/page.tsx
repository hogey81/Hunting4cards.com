"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import SetLogo from "@/components/SetLogo";
import SetProgress from "@/components/SetProgress";
import { useCollection } from "@/lib/collection";
import { mySetRefs, setPrefix, setRefHref } from "@/lib/card-ref";
import type { MySet } from "@/app/api/sets/route";

// The sets someone has cards from, per game (Pokémon first), then per series, newest first.
export default function MySetsPage() {
  const { entries, loaded } = useCollection();
  const refs = useMemo(() => mySetRefs(entries).sort().join(","), [entries]);
  const [sets, setSets] = useState<MySet[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!refs) return;
    let cancelled = false;
    setError(false);
    fetch(`/api/sets?ids=${encodeURIComponent(refs)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: { sets: MySet[] }) => !cancelled && setSets(data.sets))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [refs]);

  const games = useMemo(() => {
    const sorted = [...(sets ?? [])].sort(
      (a, b) => a.gameOrder - b.gameOrder || (b.releaseDate ?? "").localeCompare(a.releaseDate ?? ""),
    );
    const byGame = new Map<string, Map<string, MySet[]>>();
    for (const s of sorted) {
      const series = byGame.get(s.game) ?? new Map<string, MySet[]>();
      series.set(s.serie, [...(series.get(s.serie) ?? []), s]);
      byGame.set(s.game, series);
    }
    return [...byGame].map(([game, series]) => [game, [...series]] as const);
  }, [sets]);

  return (
    <>
      <Link href="/collectie" className="back">
        ← Collectie
      </Link>
      <header className="head">
        <h1>Mijn sets</h1>
      </header>
      {loaded && !refs && <p className="muted">Je hebt nog geen kaarten. Voeg kaarten toe, dan zie je hier je sets.</p>}
      {refs && error && <p className="muted">De sets konden niet worden geladen. Probeer het later opnieuw.</p>}
      {refs && !sets && !error && <p className="muted">Laden…</p>}
      {games.map(([game, series]) => (
        <section key={game} className="game-group">
          <h2 className="game-group-title">{game}</h2>
          {series.map(([serie, list]) => (
            <section key={serie} className="serie">
              {serie !== game && <h3 className="eyebrow">{serie}</h3>}
              <div className="list">
                {list.map((set) => {
                  return (
                    <Link key={set.ref} href={setRefHref(set.ref)} className="set-row">
                      <div className="set-symbol">
                        <SetLogo sources={set.images} code={set.code} />
                      </div>
                      <div className="set-body">
                        <div className="set-name">
                          {set.name} <span className="set-code">{set.code}</span>
                        </div>
                        <SetProgress prefix={setPrefix(set.ref)} total={set.total} />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </section>
      ))}
    </>
  );
}
