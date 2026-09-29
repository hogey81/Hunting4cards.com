import { getSet, searchCards, type CardResume, type Region } from "./tcgdex";
import { parseCodeQuery, sameCardNumber } from "./set-code";
import { hasJapanese, japaneseNameFor } from "./names";

async function cardsInSets(setIds: string[], region: Region) {
  const sets = await Promise.all(setIds.map((id) => getSet(id, region)));
  return sets.flatMap((set) => set?.cards ?? []);
}

export type Results = { en: CardResume[]; ja: CardResume[] };

// Only the exact card for a code with a number, like "PBL 048". Empty otherwise.
export async function findByCode(q: string): Promise<Results> {
  const code = parseCodeQuery(q);
  if (!code?.number) return { en: [], ja: [] };
  const [en, ja] = await Promise.all([
    cardsInSets(code.setIds, "en"),
    code.jpSetId ? cardsInSets([code.jpSetId], "ja") : Promise.resolve([]),
  ]);
  return {
    en: en.filter((c) => sameCardNumber(c.localId, code.number!)),
    ja: ja.filter((c) => sameCardNumber(c.localId, code.number!)),
  };
}

// "PBL 048" (international) or "M4 001" (Japanese) finds that card. A bare code lists
// the whole set, but only when no card is named like it ("Mew" is also a set code).
// A name searches both: English names are translated to find the Japanese cards too.
export async function search(q: string): Promise<Results> {
  const code = parseCodeQuery(q);
  const hits = await findByCode(q);
  if (hits.en.length || hits.ja.length) return hits;

  const jaName = hasJapanese(q) ? q : japaneseNameFor(q)?.ja;
  const [en, ja] = await Promise.all([
    hasJapanese(q) ? Promise.resolve([]) : searchCards(q, "en"),
    jaName ? searchCards(jaName, "ja").catch(() => []) : Promise.resolve([]),
  ]);
  if (en.length || ja.length || !code) return { en, ja };

  const [setEn, setJa] = await Promise.all([
    cardsInSets(code.setIds, "en"),
    code.jpSetId ? cardsInSets([code.jpSetId], "ja") : Promise.resolve([]),
  ]);
  return { en: setEn, ja: setJa };
}
