import pokemon from "pokemon";

// English Pokémon names -> Japanese, so "Darkrai ex" also finds ダークライ cards.
const EN_NAMES = pokemon.all("en");

export function japaneseNameFor(query: string): { en: string; ja: string } | null {
  const q = query.toLowerCase();
  let best: string | null = null;
  for (const name of EN_NAMES) {
    const n = name.toLowerCase();
    const i = q.indexOf(n);
    if (i === -1) continue;
    const before = q[i - 1];
    const after = q[i + n.length];
    const bounded = (!before || !/[a-z]/.test(before)) && (!after || !/[a-z]/.test(after));
    if (bounded && (!best || n.length > best.length)) best = name;
  }
  if (!best) return null;
  return { en: best, ja: pokemon.getName(pokemon.getId(best), "ja") };
}

export function englishNameForDex(dexId: number | undefined) {
  if (!dexId) return null;
  try {
    return pokemon.getName(dexId, "en");
  } catch {
    return null;
  }
}

export function hasJapanese(text: string) {
  return /[぀-ヿ一-龯]/.test(text);
}
