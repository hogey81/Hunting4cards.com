import { NextResponse } from "next/server";
import { assetImage, getSet } from "@/lib/tcgdex";
import { parseRef } from "@/lib/card-ref";
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

  const results = await Promise.allSettled(refs.map((ref) => getSet(parseRef(ref).id, parseRef(ref).region)));
  const sets: MySet[] = [];
  const failed: string[] = [];
  results.forEach((r, i) => {
    const set = r.status === "fulfilled" ? r.value : null;
    if (!set) return void failed.push(refs[i]);
    const ja = parseRef(refs[i]).region === "ja";
    sets.push({
      ref: refs[i],
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
