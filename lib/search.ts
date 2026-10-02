import { getSet, searchCards, type CardResume, type Region } from "./tcgdex";
import { japaneseSetId, parseCodeQuery, sameCardNumber, setIdsForCode } from "./set-code";
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

// The card with this number in one international set.
export async function findInSet(setId: string, number: string): Promise<Results> {
  const cards = await cardsInSets([setId], "en");
  return { en: cards.filter((c) => sameCardNumber(c.localId, number)), ja: [] };
}

const plain = (s: string) => s.toLowerCase().normalize("NFD").replace(/[^a-z0-9\u3040-\u30ff\u4e00-\u9fff]+/g, " ").trim();

const NAME_WORDS = new Set(["ex", "gx", "v", "vmax", "vstar", "break", "prime", "lv", "star", "mega", "tag", "team"]);

// A name with a set code before or after it: "Gengar ex 30C" or "30C Gengar".
// The cards in that set whose name holds what was typed.
async function findNameInSet(q: string): Promise<Results | null> {
  const words = q.trim().split(/\s+/);
  if (words.length < 2) return null;
  const tries: [string, string][] = [
    [words[words.length - 1], words.slice(0, -1).join(" ")],
    [words[0], words.slice(1).join(" ")],
  ];
  for (const [code, name] of tries) {
    // Words in card names that are also set codes ("ex" is the e-Card set "EX").
    if (NAME_WORDS.has(code.toLowerCase())) continue;
    const setIds = setIdsForCode(code);
    const jpSetId = japaneseSetId(code);
    if (!setIds.length && !jpSetId) continue;
    const wanted = plain(name);
    const [en, ja] = await Promise.all([
      cardsInSets(setIds, "en"),
      jpSetId ? cardsInSets([jpSetId], "ja") : Promise.resolve([]),
    ]);
    const hits = { en: en.filter((c) => plain(c.name).includes(wanted)), ja: ja.filter((c) => plain(c.name).includes(wanted)) };
    if (hits.en.length || hits.ja.length) return hits;
  const inSet = await findNameInSet(q).catch(() => null);
  if (inSet) return inSet;
  }
  return null;
}

// "PBL 048" (international) or "M4 001" (Japanese) finds that card, "Gengar ex 30C"
// that card in the set. A bare code lists
// the whole set, but only when no card is named like it ("Mew" is also a set code).
// A name searches both: English names are translated to find the Japanese cards too.
export async function search(q: string): Promise<Results> {
  const code = parseCodeQuery(q);
  const hits = await findByCode(q);
  if (hits.en.length || hits.ja.length) return hits;
  const inSet = await findNameInSet(q).catch(() => null);
  if (inSet) return inSet;

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
