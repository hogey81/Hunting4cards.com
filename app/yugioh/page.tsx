import Link from "next/link";
import YgoSearchForm from "@/components/ygo/YgoSearchForm";
import YgoSetList from "@/components/ygo/YgoSetList";
import { getSets } from "@/lib/ygo";

export const revalidate = 3600;

// Start of the Yu-Gi-Oh! part: search and the newest sets.
export default async function YugiohHome() {
  const sets = await getSets().catch(() => []);
  const today = new Date().toISOString().slice(0, 10);
  const recent = sets.filter((s) => !s.date || s.date <= today).slice(0, 24);
  return (
    <>
      <header className="head">
        <h1>Yu-Gi-Oh!</h1>
      </header>
      <YgoSearchForm />
      {sets.length === 0 && <p className="muted">De sets konden niet worden geladen. Probeer het later opnieuw.</p>}
      {recent.length > 0 && (
        <>
          <div className="head">
            <h2 className="results-head">Nieuwste sets</h2>
            <Link href="/yugioh/sets" className="link">Alle {sets.length} sets ›</Link>
          </div>
          <YgoSetList sets={recent} />
        </>
      )}
    </>
  );
}
