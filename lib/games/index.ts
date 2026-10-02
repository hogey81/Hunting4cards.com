import { digimon } from "./digimon";
import { fab } from "./fab";
import { lorcana } from "./lorcana";
import { magic } from "./mtg";
import { onepiece } from "./onepiece";
import type { GamePrefix } from "./refs";
import { starwars } from "./swu";
import type { Provider } from "./types";
import { yugioh } from "./ygo";

// The games beside Pokémon, by their address in the app (/yugioh, /magic, ...).
export const GAMES: Record<string, Provider> = { yugioh, magic, lorcana, onepiece, digimon, starwars, fab };

export const BY_PREFIX: Record<GamePrefix, Provider> = { ygo: yugioh, mtg: magic, lor: lorcana, op: onepiece, dgm: digimon, swu: starwars, fab };

export function gameBySlug(slug: string): Provider | null {
  return GAMES[slug] ?? null;
}
