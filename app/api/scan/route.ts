import { NextResponse } from "next/server";
import { cardImage, getCard, getSet, type CardResume, type Region } from "@/lib/tcgdex";
import { findByCode, findInSet, search, type Results } from "@/lib/search";
import { matchSet, readCode, totalFits } from "@/lib/code-match";
import { cardCode, setIdFromCardId } from "@/lib/set-code";
import { matchCards, type CardCandidate } from "@/lib/card-match";
import { toRef } from "@/lib/card-ref";
import { describeHints, hintsFromText, type ScanMatch } from "@/lib/scan-text";

const MAX_RESULTS = 12;

function toMatches(results: Results): ScanMatch[] {
  const one = (region: Region) => (c: CardResume) => {
    const ref = toRef(region, c.id);
    return { ref, name: c.name, code: cardCode(ref, c.localId), image: cardImage(c.image) };
  };
  return [...results.en.map(one("en")), ...results.ja.map(one("ja"))].slice(0, MAX_RESULTS);
}

const MAX_SHOWN = 8;

// The language of the card: the code printed next to the number ("PAL DE 123"),
// otherwise the language of the texts that matched (German attack names etc.).
function cardLanguage(printed: string | null, candidates: CardCandidate[], ids: string[]) {
  if (printed) return printed;
  const hit = candidates.find((c) => ids.includes(c.id) && c.score > (c.numberMatches ? 2 : 0));
  return hit ? hit.language.toUpperCase() : null;
}

// When several sets have a card with this name and number, keep the ones whose
// set size matches the "/193" printed on the card.
async function preferSetSize(ids: string[], total: number | null) {
  if (!total || ids.length < 2) return ids;
  const sizes = new Map<string, number | undefined>();
  await Promise.all(
    [...new Set(ids.map(setIdFromCardId))].map(async (id) => {
      sizes.set(id, (await getSet(id).catch(() => null))?.cardCount.official);
    }),
  );
  const same = ids.filter((id) => sizes.get(setIdFromCardId(id)) === total);
  return same.length ? same : ids;
}

async function cardsByIds(ids: string[]): Promise<ScanMatch[]> {
  const cards = await Promise.all(ids.slice(0, MAX_SHOWN).map((id) => getCard(id).catch(() => null)));
  return toMatches({ en: cards.filter((c): c is NonNullable<typeof c> => !!c), ja: [] });
}

// GET ?q= : a code or name the user typed.
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ cards: [], exact: false, read: q });
  try {
    const cards = toMatches(await search(q));
    return NextResponse.json({ cards, exact: cards.length === 1, read: q });
  } catch {
    return NextResponse.json({ error: "Kaartgegevens ophalen lukt nu even niet." }, { status: 502 });
  }
}

// POST { text }: the text read from a photo. Tries the set code with its number
// ("PAL 123"), then the name, attacks and abilities that were read, weighed
// together with the card number.
export async function POST(request: Request) {
  const { text } = (await request.json().catch(() => ({}))) as { text?: string };
  const hints = hintsFromText(String(text ?? "").slice(0, 20000));
  const read = describeHints(hints);

  // Name, attacks and abilities that were read, weighed together with the card number.
  const candidates = matchCards(String(text ?? ""), hints.number, hints.pokemon);

  try {
    // A full code with "/094": checked against the sets that exist (see lib/code-match.ts).
    const code = readCode(String(text ?? ""));
    const set = code && matchSet(code);
    if (code && set) {
      const cards = toMatches(await findInSet(set.id, code.number));
      const language = cardLanguage(code.language ?? hints.language, candidates, cards.map((c) => c.ref));
      // `sure`: code letters, number and set size all as printed, so the camera needn't read it again.
      if (cards.length)
        return NextResponse.json({ cards, exact: cards.length === 1, sure: set.sure, read: cards[0].code, language });
    }

    for (const code of hints.codes.slice(0, 4)) {
      // A set whose size doesn't match the "/094" that was read is a misread.
      const found = await findByCode(code);
      const cards = toMatches({
        en: found.en.filter((c) => !hints.total || totalFits(setIdFromCardId(c.id), hints.total)),
        // A printed language code ("EN", "DE") is only on international cards.
        ja: hints.language ? [] : found.ja,
      });
      const language = cardLanguage(hints.language, candidates, cards.map((c) => c.ref));
      if (cards.length) return NextResponse.json({ cards, exact: true, read: code, language });
    }

    const withNumber = candidates.filter((c) => c.numberMatches && c.score >= 2.1);
    if (withNumber.length) {
      const best = withNumber.filter((c) => c.score >= withNumber[0].score - 0.5).map((c) => c.id);
      const cards = await cardsByIds(await preferSetSize(best, hints.total));
      const language = cardLanguage(hints.language, candidates, best);
      if (cards.length)
        return NextResponse.json({ cards, exact: cards.length === 1, read: `${cards[0].name} ${hints.number}`, language });
    }
    // Without a readable number: show the likeliest cards, but not for words that
    // hundreds of cards share (like the attack "Tackle").
    const likely = candidates.filter((c) => c.score >= 0.1).map((c) => c.id);
    const cards = await cardsByIds(likely);
    return NextResponse.json({ cards, exact: false, read, language: cardLanguage(hints.language, candidates, likely) });
  } catch {
    return NextResponse.json({ error: "Kaartgegevens ophalen lukt nu even niet." }, { status: 502 });
  }
}
