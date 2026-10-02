import { lorcana } from "./lorcana";
import { magic } from "./mtg";
import type { GamePrefix } from "./refs";
import type { Provider } from "./types";
import { yugioh } from "./ygo";

// The games beside Pokémon, by their address in the app (/yugioh, /magic, /lorcana).
export const GAMES: Record<string, Provider> = { yugioh, magic, lorcana };

export const BY_PREFIX: Record<GamePrefix, Provider> = { ygo: yugioh, mtg: magic, lor: lorcana };

export function gameBySlug(slug: string): Provider | null {
  return GAMES[slug] ?? null;
}
