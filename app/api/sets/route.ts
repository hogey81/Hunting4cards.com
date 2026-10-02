import { NextResponse } from "next/server";
import { assetImage, getSet } from "@/lib/tcgdex";
import { isOtherGame, parseRef } from "@/lib/card-ref";
import { BY_PREFIX } from "@/lib/games";
import { gameOf } from "@/lib/games/refs";
import { setCode } from "@/lib/set-code";

const MAX_IDS = 200;

export type MySet = {
  ref: string;
  name: string;
  code: string;
  images: (string | null)[];
  total: number;
  serie: string;
  releaseDate: string | null;
};

// The sets behind the given set references ("me05", "ja:M4"): what the "Mijn sets"
// overview needs to list the sets someone has cards from.
export async function GET(request: Request) {
  const refs = [
    ...new Set(
      (new URL(request.url).searchParams.get("ids") ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ].slice(0, MAX_IDS);

  const sets: MySet[] = [];
  const failed: string[] = [];

  // Sets of the other games ("ygo:LOB", "mtg:mkm"), from each game's cached set list.
  const others = refs.filter(isOtherGame);
  const games = [...new Set(others.map((ref) => gameOf(ref)!))];
  const lists = new Map(await Promise.all(games.map(async (g) => [g, await BY_PREFIX[g].getSets().catch(() => [])] as const)));
  for (const ref of others) {
    const game = BY_PREFIX[gameOf(ref)!];
    const code = ref.slice(ref.indexOf(":") + 1).toLowerCase();
    const set = (lists.get(game.prefix) ?? []).filter((s) => s.code.toLowerCase() === code).sort((a, b) => b.total - a.total)[0];
    if (!set) {
      failed.push(ref);
      continue;
    }
    sets.push({ ref, name: set.name, code: set.code.toUpperCase(), images: [set.image], total: set.total, serie: game.name, releaseDate: set.date });
  }

  const tcgdex = refs.filter((ref) => !isOtherGame(ref));
  const results = await Promise.allSettled(tcgdex.map((ref) => getSet(parseRef(ref).id, parseRef(ref).region)));
  results.forEach((r, i) => {
    const set = r.status === "fulfilled" ? r.value : null;
    if (!set) return void failed.push(tcgdex[i]);
    const ja = parseRef(tcgdex[i]).region === "ja";
    sets.push({
      ref: tcgdex[i],
      name: set.name,
      code: ja ? set.id : setCode(set),
      images: [assetImage(set.logo), assetImage(set.symbol)],
      total: set.cardCount.total,
      serie: ja ? `${set.serie.name} (Japans)` : set.serie.name,
      releaseDate: set.releaseDate ?? null,
    });
  });

  return NextResponse.json({ sets, failed }, { headers: { "Cache-Control": "public, s-maxage=3600" } });
}
