import YgoSetList from "@/components/ygo/YgoSetList";
import { getSets } from "@/lib/ygo";

export const revalidate = 3600;

export default async function YugiohSets() {
  const sets = await getSets().catch(() => []);
  return (
    <>
      <header className="head">
        <h1>Sets</h1>
      </header>
      {sets.length === 0 && <p className="muted">De sets konden niet worden geladen. Probeer het later opnieuw.</p>}
      <YgoSetList sets={sets} />
    </>
  );
}
