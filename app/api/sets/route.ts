import { NextResponse } from "next/server";
import { assetImage, getSet } from "@/lib/tcgdex";
import { isYgo, parseRef } from "@/lib/card-ref";
import { getSets, ygoSetImage } from "@/lib/ygo";
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

  // Yu-Gi-Oh! sets ("ygo:LOB") all come from one cached list.
  const ygo = refs.filter(isYgo);
  if (ygo.length) {
    const all = await getSets().catch(() => []);
    for (const ref of ygo) {
      const code = ref.slice(4).toUpperCase();
      const matches = all.filter((s) => s.code.toUpperCase() === code);
      const set = [...matches].sort((a, b) => b.total - a.total)[0];
      if (!set) {
        failed.push(ref);
        continue;
      }
      sets.push({ ref, name: set.name, code: set.code, images: [ygoSetImage(set.code)], total: set.total, serie: "Yu-Gi-Oh!", releaseDate: set.date });
    }
  }

  const tcgdex = refs.filter((ref) => !isYgo(ref));
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
