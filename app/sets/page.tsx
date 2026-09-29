import Link from "next/link";
import SetProgress from "@/components/SetProgress";
import { assetImage, getSerie, getSeries } from "@/lib/tcgdex";
import { setCode } from "@/lib/set-code";

export const dynamic = "force-dynamic";

export default async function SetsPage() {
  const all = await getSeries().catch(() => []);
  // Newest series come last in the API; show the three most recent.
  const recent = all.slice(-3).reverse();
  const series = (await Promise.all(recent.map((s) => getSerie(s.id).catch(() => null)))).filter((s) => s !== null);

  return (
    <>
      <header className="head">
        <h1>Sets</h1>
      </header>
      {series.length === 0 && <p className="muted">De sets konden niet worden geladen. Probeer het later opnieuw.</p>}
      {series.map((serie) => (
        <section key={serie.id} className="serie">
          <h2 className="eyebrow">{serie.name}</h2>
          <div className="list">
            {[...serie.sets].reverse().map((set) => {
              const symbol = assetImage(set.symbol) ?? assetImage(set.logo);
              return (
                <Link key={set.id} href={`/sets/${set.id}`} className="set-row">
                  <div className="set-symbol">{symbol ? <img src={symbol} alt="" /> : setCode(set)}</div>
                  <div className="set-body">
                    <div className="set-name">
                      {set.name} <span className="set-code">{setCode(set)}</span>
                    </div>
                    <SetProgress setId={set.id} total={set.cardCount.total} />
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
