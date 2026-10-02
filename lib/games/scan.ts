// Recognises a card of another game than Pokémon from the text the camera read
// on the whole card. First the printed code, which says exactly which print it
// is; where none could be read, the name at the top of the card.
//
// Where each game prints its code:
//   Yu-Gi-Oh!   under the picture, right    "LOB-EN001" (DE, FR, IT, SP, PT for other languages)
//   One Piece   bottom right                "OP01-120"
//   Digimon     bottom right                "BT1-084"
//   Lorcana     bottom left                 "207/204 • EN • 1" (number, language, set)
//   Magic       bottom left                 "0123 R" and "MKM • EN"
//   Star Wars   bottom                      "SOR • 051"
//   FaB         bottom left                 "MST131"
import type { ScanMatch } from "../scan-text";
import type { GameTile, Provider } from "./types";

export type GameScanAnswer = { cards: ScanMatch[]; exact: boolean; sure: boolean; read: string; language: string };

const toMatch = (t: GameTile): ScanMatch => ({ ref: t.ref, name: t.name, code: t.code, image: t.image });
const MAX = 6;

type Found = { tiles: GameTile[]; read: string; language?: string };

// Numbers in a code read with letters that look like digits.
const digits = (s: string) => s.replace(/[OQD]/g, "0").replace(/[IL]/g, "1").replace(/S/g, "5").replace(/B/g, "8");

async function card(provider: Provider, ref: string): Promise<GameTile | null> {
  return (await provider.getCard(ref).catch(() => null))?.card ?? null;
}

const YGO_LANGS: Record<string, string> = { EN: "EN", E: "EN", DE: "DE", G: "DE", FR: "FR", F: "FR", IT: "IT", I: "IT", SP: "ES", S: "ES", PT: "PT", P: "PT" };

const BY_GAME: Record<string, (p: Provider, text: string) => Promise<Found | null>> = {
  async ygo(p, text) {
    for (const m of text.matchAll(/\b([A-Z0-9]{2,5})-(EN|DE|FR|IT|SP|PT|E|G|F|I|S|P)?([0-9OQDILSB]{3})\b/g)) {
      const [, set, lang, num] = m;
      const number = digits(num);
      const found = await p.getSet(set).catch(() => null);
      // The app keeps the English codes, the language is a choice of its own. Old
      // sets also have codes without a language ("LOB-001"), and European ones with
      // a different numbering ("SDY-E006" is another card than SDY-EN006).
      const tries = [`${set}-EN${number}`, `${set}-${lang ?? ""}${number}`, `${set}-${number}`];
      for (const code of tries) {
        const tiles = (found?.cards ?? []).filter((t) => t.code === code);
        if (tiles.length) return { tiles, read: `${set}-${lang ?? ""}${number}`, language: YGO_LANGS[lang ?? "EN"] };
      }
    }
    return null;
  },
  async op(p, text) {
    for (const m of text.matchAll(/\b((?:OP|ST|EB|PRB)[0-9OIL]{2}|P)-([0-9OQDILSB]{3})\b/g)) {
      const prefix = m[1] === "P" ? "P" : m[1].slice(0, -2) + digits(m[1].slice(-2));
      const code = `${prefix}-${digits(m[2])}`;
      const tiles = (await p.search(code).catch(() => [])).filter((t) => t.code === code);
      // The normal print in its own set first ("OP01-120" in OP-01); parallels and reprints as the other choices.
      const home = `op:${code.replace(/^([A-Z]+)(\d+)-.*/, "$1-$2")}/${code}`;
      const rank = (t: GameTile) => (t.ref === home ? 0 : t.ref.endsWith(`/${code}`) ? 1 : 2);
      tiles.sort((a, b) => rank(a) - rank(b));
      if (tiles.length) return { tiles, read: code };
    }
    return null;
  },
  async dgm(p, text) {
    for (const m of text.matchAll(/\b((?:BT|EX|ST|RB|AD)[0-9OIL]{1,2}|LM|P)-([0-9OQDILSB]{3})\b/g)) {
      const prefix = m[1].length > 2 ? m[1].slice(0, 2) + digits(m[1].slice(2)) : m[1];
      const code = `${prefix}-${digits(m[2])}`;
      const tile = await card(p, `dgm:${code}`);
      if (tile) return { tiles: [tile], read: code };
    }
    return null;
  },
  async lor(p, text) {
    for (const m of text.matchAll(/\b(\d{1,3})\s*\/\s*\d{2,3}\s*\W{0,3}\s*(EN|DE|FR|IT|JA)\s*\W{0,3}\s*(\d{1,2})\b/g)) {
      const [, num, lang, set] = m;
      const tile = await card(p, `lor:${set}/${Number(num)}`);
      if (tile) return { tiles: [tile], read: `${num} · ${set}`, language: lang === "JA" ? "JP" : lang };
    }
    return null;
  },
  async mtg(p, text) {
    const set = text.match(/\b([A-Z0-9]{3,5})\s*[•·.*+-]\s*(EN|DE|FR|IT|ES|PT|JA|JP)\b/);
    const num = text.match(/\b(\d{1,4})\s*[\/ ]?\s*(?:\d{3}\s+)?[CURMLST]\b/);
    if (!set || !num) return null;
    const tile = await card(p, `mtg:${set[1].toLowerCase()}/${Number(num[1])}`);
    return tile ? { tiles: [tile], read: `${set[1]} ${Number(num[1])}`, language: set[2] === "JA" ? "JP" : set[2] } : null;
  },
  async swu(p, text) {
    const sets = new Set((await p.getSets().catch(() => [])).map((s) => s.code));
    // "SOR • 051" or "051/252 • SOR".
    const pairs = [
      ...[...text.matchAll(/\b([A-Z][A-Z0-9]{2,5})\b[^\n\dA-Z]{0,6}(\d{1,3})\b/g)].map((m) => [m[1], m[2]]),
      ...[...text.matchAll(/\b(\d{1,3})\s*\/\s*\d{2,3}[^\n\dA-Z]{0,6}([A-Z][A-Z0-9]{2,5})\b/g)].map((m) => [m[2], m[1]]),
    ];
    for (const [set, num] of pairs) {
      if (!sets.has(set)) continue;
      const tile = (await card(p, `swu:${set}/${num.padStart(3, "0")}`)) ?? (await card(p, `swu:${set}/${Number(num)}`));
      if (tile) return { tiles: [tile], read: `${set} ${num}` };
    }
    return null;
  },
  async fab(p, text) {
    const sets = new Set((await p.getSets().catch(() => [])).map((s) => s.code));
    for (const m of text.matchAll(/\b([A-Z0-9]{3})([0-9OQDILSB]{3})\b/g)) {
      if (!sets.has(m[1])) continue;
      const tile = await card(p, `fab:${m[1]}/${digits(m[2])}`);
      if (tile) return { tiles: [tile], read: `${m[1]}${digits(m[2])}` };
    }
    return null;
  },
};

const plain = (s: string) => s.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, " ").trim();

// The card name is near the top: try the first lines with enough letters to be a
// name, and keep the cards whose name was read.
async function byName(p: Provider, text: string): Promise<Found | null> {
  const read = plain(text);
  const lines = text
    .split("\n")
    .map((l) => l.replace(/[^\p{L}\p{N}'’,.\- ]/gu, " ").replace(/\s+/g, " ").trim())
    .filter((l) => (l.match(/\p{L}/gu) ?? []).length >= 4);
  // The first two lines together too: Lorcana prints "Elsa" above "Spirit of Winter".
  const tries = [lines.slice(0, 2).join(" "), ...lines.slice(0, 3)].filter((l, i, all) => l && all.indexOf(l) === i);
  for (const line of tries) {
    const found = await p.search(line).catch(() => [] as GameTile[]);
    // A name like "Elsa - Spirit of Winter" is read as its parts.
    // Without what the app adds in brackets, like FaB's "(Red)".
    const words = (t: GameTile) => plain(t.name.replace(/\([^)]*\)/g, "")).split(" ").filter((w) => w.length > 1);
    const tiles = found.filter((t) => words(t).every((w) => read.includes(w)));
    if (tiles.length) return { tiles, read: line };
  }
  return null;
}

export async function scanGame(provider: Provider, raw: string): Promise<GameScanAnswer> {
  // A zero read for the letter O in "OP01-001".
  const text = raw.toUpperCase().slice(0, 8000).replace(/\b0P(?=\d)/g, "OP");
  const language = provider.languages[0];
  const byCode = await BY_GAME[provider.prefix]?.(provider, text).catch(() => null);
  if (byCode?.tiles.length) {
    const cards = byCode.tiles.slice(0, MAX).map(toMatch);
    // One print for the code read: certain enough to show at once.
    return { cards, exact: cards.length === 1, sure: cards.length === 1, read: byCode.read, language: byCode.language ?? language };
  }
  const named = await byName(provider, raw.slice(0, 8000));
  if (named) {
    const cards = named.tiles.slice(0, MAX).map(toMatch);
    return { cards, exact: cards.length === 1, sure: false, read: named.read, language };
  }
  return { cards: [], exact: false, sure: false, read: raw.split("\n")[0]?.slice(0, 40) || "niets leesbaars", language };
}
