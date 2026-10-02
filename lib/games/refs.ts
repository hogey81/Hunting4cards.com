// Card references for the other games in the collection. Each starts with the
// game's prefix:
//   Yu-Gi-Oh!  "ygo:LOB-EN001~UR"  set "ygo:LOB"   (print code, rarity)
//   Magic      "mtg:mkm/123"       set "mtg:mkm"   (Scryfall set code, collector number)
//   Lorcana    "lor:1/207"         set "lor:1"     (Lorcast set code, collector number)
// Kept free of data fetching, so client components can use it.

export const GAME_PATHS = { ygo: "/yugioh", mtg: "/magic", lor: "/lorcana" } as const;
export type GamePrefix = keyof typeof GAME_PATHS;

export function gameOf(ref: string): GamePrefix | null {
  const prefix = ref.slice(0, ref.indexOf(":"));
  return prefix in GAME_PATHS ? (prefix as GamePrefix) : null;
}

const rest = (ref: string) => ref.slice(ref.indexOf(":") + 1);

// "ygo:LOB-EN001~UR" -> "ygo:LOB", "mtg:mkm/123" -> "mtg:mkm".
export function gameSetRef(ref: string): string {
  const game = gameOf(ref)!;
  const sep = game === "ygo" ? ref.lastIndexOf("-") : ref.indexOf("/");
  return sep > 0 ? ref.slice(0, sep) : ref;
}

// What every card reference in a set starts with ("ygo:LOB-", "mtg:mkm/").
export function gameSetPrefix(setRef: string): string {
  return setRef + (gameOf(setRef) === "ygo" ? "-" : "/");
}

// The "/" in "mkm/123" stays a path separator (the card page takes the rest of the path).
export function gameCardHref(ref: string) {
  return `${GAME_PATHS[gameOf(ref)!]}/kaart/${rest(ref).split("/").map(encodeURIComponent).join("/")}`;
}

export function gameSetHref(setRef: string) {
  return `${GAME_PATHS[gameOf(setRef)!]}/sets/${encodeURIComponent(rest(setRef))}`;
}

// The code shown under a card: "LOB-EN001", "MKM 123", "1 207".
export function gameCardCode(ref: string) {
  const r = rest(ref);
  if (gameOf(ref) === "ygo") return r.split("~")[0];
  const [set, number] = r.split("/");
  return `${set.toUpperCase()} ${number ?? ""}`.trim();
}
