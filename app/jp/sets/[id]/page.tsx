import { notFound } from "next/navigation";
import SetDetail from "@/components/SetDetail";
import { getSet } from "@/lib/tcgdex";

export const revalidate = 3600;

export default async function JapaneseSetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const set = await getSet(decodeURIComponent(id), "ja");
  if (!set) notFound();
  return <SetDetail set={set} region="ja" />;
}
