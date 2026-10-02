// Card references for the other games in the collection. Each starts with the
// game's prefix:
//   Yu-Gi-Oh!  "ygo:LOB-EN001~UR"  set "ygo:LOB"   (print code, rarity)
//   Magic      "mtg:mkm/123"       set "mtg:mkm"   (Scryfall set code, collector number)
//   Lorcana    "lor:1/207"         set "lor:1"     (Lorcast set code, collector number)
//   One Piece  "op:OP-01/OP01-120_p1" set "op:OP-01" (optcgapi set id, card picture id)
//   Digimon    "dgm:BT2-043"       set "dgm:BT2"   (card number)
//   Star Wars  "swu:SOR/051"       set "swu:SOR"   (swu-db set code, card number)
//   FaB        "fab:MST/131"       set "fab:MST"   (set id, number after it)
// Kept free of data fetching, so client components can use it.

export const GAME_PATHS = {
  ygo: "/yugioh",
  mtg: "/magic",
  lor: "/lorcana",
  op: "/onepiece",
  dgm: "/digimon",
  swu: "/starwars",
  fab: "/fab",
} as const;
export type GamePrefix = keyof typeof GAME_PATHS;

export function gameOf(ref: string): GamePrefix | null {
  const prefix = ref.slice(0, ref.indexOf(":"));
  return prefix in GAME_PATHS ? (prefix as GamePrefix) : null;
}

const rest = (ref: string) => ref.slice(ref.indexOf(":") + 1);

// Yu-Gi-Oh! and Digimon cards carry their set in the code ("LOB-EN001", "BT2-043").
const dashGames: readonly GamePrefix[] = ["ygo", "dgm"];

// "ygo:LOB-EN001~UR" -> "ygo:LOB", "mtg:mkm/123" -> "mtg:mkm".
export function gameSetRef(ref: string): string {
  const game = gameOf(ref)!;
  const sep = dashGames.includes(game) ? ref.lastIndexOf("-") : ref.indexOf("/");
  return sep > 0 ? ref.slice(0, sep) : ref;
}

// What every card reference in a set starts with ("ygo:LOB-", "mtg:mkm/").
export function gameSetPrefix(setRef: string): string {
  return setRef + (dashGames.includes(gameOf(setRef)!) ? "-" : "/");
}

// The "/" in "mkm/123" stays a path separator (the card page takes the rest of the path).
export function gameCardHref(ref: string) {
  return `${GAME_PATHS[gameOf(ref)!]}/kaart/${rest(ref).split("/").map(encodeURIComponent).join("/")}`;
}

export function gameSetHref(setRef: string) {
  return `${GAME_PATHS[gameOf(setRef)!]}/sets/${encodeURIComponent(rest(setRef))}`;
}

// The code shown under a card: "LOB-EN001", "MKM 123", "1 207", "OP01-120", "MST131".
export function gameCardCode(ref: string) {
  const r = rest(ref);
  const game = gameOf(ref);
  if (game === "ygo") return r.split("~")[0];
  if (game === "dgm") return r;
  const [set, number] = r.split("/");
  if (game === "op") return (number ?? "").split("_")[0];
  if (game === "fab") return `${set}${number ?? ""}`;
  return `${set.toUpperCase()} ${number ?? ""}`.trim();
}
