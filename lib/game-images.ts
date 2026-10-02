import { cardImage, getCard } from "./tcgdex";

// One well-known card per game, shown on its tile in the game picker. Each comes
// from that game's open card database; null when it can't be loaded (the tile
// then shows its icon).
const DAY = 86400;

async function json<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { next: { revalidate: DAY } });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

export async function pokemonImage() {
  const card = await getCard("sv03.5-025").catch(() => null); // Pikachu, 151
  return cardImage(card?.image, "high");
}

export async function yugiohImage() {
  const data = await json<{ data: { card_images: { image_url: string }[] }[] }>(
    "https://db.ygoprodeck.com/api/v7/cardinfo.php?name=Dark%20Magician",
  );
  return data?.data?.[0]?.card_images?.[0]?.image_url ?? null;
}

export async function lorcanaImage() {
  const data = await json<{ results: { image_uris?: { digital?: { normal?: string } } }[] }>(
    "https://api.lorcast.com/v0/cards/search?q=" + encodeURIComponent('name:"Mickey Mouse"'),
  );
  return data?.results?.find((c) => c.image_uris?.digital?.normal)?.image_uris?.digital?.normal ?? null;
}
