import index from "./card-index.json";
import { sameCardNumber } from "./set-code";

// Finds cards whose name, attacks or abilities appear in the text read from a
// photo (see scripts/update-card-index.mjs). Rare phrases count more than common
// ones ("Life-Locked" is on one card, "Tackle" on hundreds), and a matching card
// number counts most, so a blurry title still finds the right card.

type Index = { sets: string[]; dates: string[]; cards: [number, string][]; phrases: Record<string, number[]> };
const INDEX = index as unknown as Index;

export const normalize = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export type CardCandidate = { id: string; score: number; numberMatches: boolean; released: string };

export function matchCards(text: string, number: string | null, extraNames: string[] = []): CardCandidate[] {
  const haystack = ` ${normalize(text)} ${extraNames.map(normalize).join(" ")} `;
  const names = new Set(extraNames.map(normalize));
  const scores = new Map<number, number>();
  for (const [phrase, cardIndexes] of Object.entries(INDEX.phrases)) {
    // Single short words ("Share", "Guard") show up in any text; only trust them as a known Pokémon name.
    const trusted = phrase.includes(" ") ? phrase.length >= 5 : phrase.length >= 7 || names.has(phrase);
    if (!trusted || !haystack.includes(` ${phrase} `)) continue;
    const weight = 1 / Math.sqrt(cardIndexes.length);
    for (const i of cardIndexes) scores.set(i, (scores.get(i) ?? 0) + weight);
  }
  const candidates = [...scores].map(([i, score]) => {
    const [setIndex, localId] = INDEX.cards[i];
    const numberMatches = !!number && sameCardNumber(localId, number);
    return { id: `${INDEX.sets[setIndex]}-${localId}`, score: score + (numberMatches ? 2 : 0), numberMatches, released: INDEX.dates[setIndex] };
  });
  // Equal scores: newer sets first, since those are the cards people scan most.
  return candidates.sort((a, b) => b.score - a.score || b.released.localeCompare(a.released));
}
