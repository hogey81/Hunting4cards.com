import type { PriceInfo } from "../prices";
import type { Language } from "../collection";
import type { GamePrefix } from "./refs";

// Each game other than Pokémon plugs in through a Provider (lib/games/*.ts), so
// the pages under app/[game] work the same way for all of them.

export type GameSet = {
  code: string;
  name: string;
  total: number;
  date: string | null;
  image: string | null;
};

// A card as it shows in a grid.
export type GameTile = {
  ref: string;
  name: string;
  image: string | null;
  code: string;
  sub: string;
};

export type GameCard = GameTile & {
  bigImage: string | null;
  // e.g. "Mythic", "Ultra Rare"
  rarity: string | null;
  // Short facts under the name: type, stats.
  facts: string[];
  text: string | null;
  // Prices in euro (Cardmarket) for the collection value; foil is the foil print.
  normal: PriceInfo;
  foil: PriceInfo | null;
  // Shown on the card page instead, when the source has no euro price (e.g. "$ 3,20").
  otherPrice: { label: string; value: string } | null;
  priceNote: string;
  cardmarketUrl: string;
  // Other prints of the same card (another set or rarity).
  others: { ref: string; label: string; sub: string }[];
};

export type Provider = {
  prefix: GamePrefix;
  name: string;
  languages: readonly Language[];
  searchHint: string;
  // How the second version is called ("Foil"); null when a game has none in the app.
  foilLabel: string | null;
  getSets(): Promise<GameSet[]>;
  getSet(code: string): Promise<{ set: GameSet; cards: GameTile[] } | null>;
  getCard(ref: string): Promise<{ set: GameSet; card: GameCard; prev: GameTile | null; next: GameTile | null } | null>;
  search(q: string): Promise<GameTile[]>;
};

export const noPrice: PriceInfo = { trend: null, low: null, avg1: null, avg7: null, avg30: null, updated: null };

export const euroPrice = (v: unknown, updated: string | null = null): PriceInfo => {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return { ...noPrice, trend: Number.isFinite(n) && n > 0 ? n : null, updated };
};
