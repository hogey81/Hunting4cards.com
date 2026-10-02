import { notFound } from "next/navigation";
import Scanner from "@/components/Scanner";
import { gameBySlug } from "@/lib/games";

export const metadata = { title: "Kaart scannen" };

export default async function GameScanPage({ params }: { params: Promise<{ game: string }> }) {
  const { game: slug } = await params;
  const game = gameBySlug(slug);
  if (!game) notFound();
  return <Scanner game={{ slug, name: game.name, languages: [...game.languages], foilLabel: game.foilLabel }} />;
}
