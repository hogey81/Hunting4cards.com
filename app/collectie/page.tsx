import CollectionView, { type Filter } from "@/components/CollectionView";

export default async function CollectionPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const f = (await searchParams).filter;
  const initial: Filter = f === "stijgers" ? "Stijgers" : f === "dalers" ? "Dalers" : "Alles";
  return <CollectionView initialFilter={initial} />;
}
