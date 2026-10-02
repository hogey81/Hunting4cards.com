import Link from "next/link";
import SetLogo from "@/components/SetLogo";
import SetProgress from "@/components/SetProgress";
import { ygoSetHref, ygoSetImage, type YgoSet } from "@/lib/ygo";

// Yu-Gi-Oh! sets grouped by release year, newest first.
export default function YgoSetList({ sets }: { sets: YgoSet[] }) {
  const years = new Map<string, YgoSet[]>();
  for (const s of sets) {
    const year = s.date?.slice(0, 4) ?? "Zonder datum";
    years.set(year, [...(years.get(year) ?? []), s]);
  }
  return (
    <>
      {[...years].map(([year, list]) => (
        <section key={year} className="serie">
          <h2 className="eyebrow">{year}</h2>
          <div className="list">
            {list.map((set) => (
              <Link key={`${set.code}-${set.name}`} href={ygoSetHref(set.code)} className="set-row">
                <div className="set-symbol">
                  <SetLogo sources={[ygoSetImage(set.code)]} code={set.code} />
                </div>
                <div className="set-body">
                  <div className="set-name">
                    {set.name} <span className="set-code">{set.code}</span>
                  </div>
                  <SetProgress prefix={`ygo:${set.code}-`} total={set.total} />
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
