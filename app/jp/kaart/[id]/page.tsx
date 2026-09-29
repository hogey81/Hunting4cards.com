import { notFound } from "next/navigation";
import CardDetail from "@/components/CardDetail";
import { getCard } from "@/lib/tcgdex";

export const revalidate = 3600;

export default async function JapaneseCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = await getCard(decodeURIComponent(id), "ja");
  if (!card) notFound();
  return <CardDetail card={card} region="ja" />;
}
