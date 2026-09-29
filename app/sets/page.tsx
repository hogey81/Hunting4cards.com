import Link from "next/link";
import SetLogo from "@/components/SetLogo";
import SetProgress from "@/components/SetProgress";
import { assetImage, getSerie, getSeries, type Region } from "@/lib/tcgdex";
import { setHref, toRef } from "@/lib/card-ref";
import { setCode } from "@/lib/set-code";

export const dynamic = "force-dynamic";

export default async function SetsPage({ searchParams }: { searchParams: Promise<{ regio?: string }> }) {
  const region: Region = (await searchParams).regio === "jp" ? "ja" : "en";
  const all = await getSeries(region).catch(() => []);
  // Newest series come last in the API; show the three most recent.
  const recent = all.slice(-3).reverse();
  const series = (await Promise.all(recent.map((s) => getSerie(s.id, region).catch(() => null)))).filter((s) => s !== null);

  return (
    <>
      <header className="head">
        <h1>Sets</h1>
      </header>
      <nav className="chips" aria-label="Soort kaarten">
        <Link href="/sets" className={region === "en" ? "chip on" : "chip"} aria-current={region === "en" ? "page" : undefined}>
          Internationaal
        </Link>
        <Link href="/sets?regio=jp" className={region === "ja" ? "chip on" : "chip"} aria-current={region === "ja" ? "page" : undefined}>
          Japans
        </Link>
      </nav>
      {series.length === 0 && <p className="muted">De sets konden niet worden geladen. Probeer het later opnieuw.</p>}
      {series.map((serie) => (
        <section key={serie.id} className="serie">
          <h2 className="eyebrow">{serie.name}</h2>
          <div className="list">
            {[...serie.sets].reverse().map((set) => {
              const code = region === "ja" ? set.id : setCode(set);
              return (
                <Link key={set.id} href={setHref(region, set.id)} className="set-row">
                  <div className="set-symbol">
                    <SetLogo sources={[assetImage(set.logo), assetImage(set.symbol)]} code={code} />
                  </div>
                  <div className="set-body">
                    <div className="set-name">
                      {set.name} <span className="set-code">{code}</span>
                    </div>
                    <SetProgress prefix={toRef(region, `${set.id}-`)} total={set.cardCount.total} />
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
