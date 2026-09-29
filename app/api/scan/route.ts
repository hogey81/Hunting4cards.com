import { NextResponse } from "next/server";
import { cardImage, searchCards, type CardResume, type Region } from "@/lib/tcgdex";
import { findByCode, search, type Results } from "@/lib/search";
import { cardCode, sameCardNumber } from "@/lib/set-code";
import { toRef } from "@/lib/card-ref";
import type { ScanMatch } from "@/lib/scan-text";

const MAX_RESULTS = 12;

function toMatches(results: Results): ScanMatch[] {
  const one = (region: Region) => (c: CardResume) => {
    const ref = toRef(region, c.id);
    return { ref, name: c.name, code: cardCode(ref, c.localId), image: cardImage(c.image) };
  };
  return [...results.en.map(one("en")), ...results.ja.map(one("ja"))].slice(0, MAX_RESULTS);
}

// Finds the card in a photo from what the scanner read on it. Tries, in order:
// the set code with its number ("PAL 123"), then a name from the top of the card
// with the number, then the name alone. "q" is a code or name the user typed.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const q = params.get("q")?.trim();
  const codes = params.getAll("code").slice(0, 4);
  const names = params.getAll("name").slice(0, 4);
  const number = params.get("number");

  try {
    if (q) {
      const cards = toMatches(await search(q));
      return NextResponse.json({ cards, exact: cards.length === 1 });
    }

    for (const code of codes) {
      const cards = toMatches(await findByCode(code));
      if (cards.length) return NextResponse.json({ cards, exact: true });
    }

    let byName: ScanMatch[] = [];
    for (const name of names) {
      const found = await searchCards(name, "en");
      if (!found.length) continue;
      const sameNumber = number ? found.filter((c) => sameCardNumber(c.localId, number)) : [];
      if (sameNumber.length) return NextResponse.json({ cards: toMatches({ en: sameNumber, ja: [] }), exact: true });
      if (!byName.length) byName = toMatches({ en: found, ja: [] });
    }
    return NextResponse.json({ cards: byName, exact: false });
  } catch {
    return NextResponse.json({ error: "Kaartgegevens ophalen lukt nu even niet." }, { status: 502 });
  }
}
