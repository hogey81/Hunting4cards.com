import { NextResponse } from "next/server";
import { gameBySlug } from "@/lib/games";
import { scanGame } from "@/lib/games/scan";

// The scanner of another game than Pokémon (/yugioh/scan, ...); Pokémon has /api/scan.

// GET ?q= : a name or code the user typed.
export async function GET(request: Request, { params }: { params: Promise<{ game: string }> }) {
  const game = gameBySlug((await params).game);
  if (!game) return NextResponse.json({ error: "Onbekend spel" }, { status: 404 });
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ cards: [], exact: false, read: q, language: game.languages[0] });
  try {
    return NextResponse.json(await scanGame(game, q));
  } catch {
    return NextResponse.json({ error: "Kaartgegevens ophalen lukt nu even niet." }, { status: 502 });
  }
}

// POST { text }: the text read on the whole card.
export async function POST(request: Request, { params }: { params: Promise<{ game: string }> }) {
  const game = gameBySlug((await params).game);
  if (!game) return NextResponse.json({ error: "Onbekend spel" }, { status: 404 });
  const { text } = (await request.json().catch(() => ({}))) as { text?: string };
  if (!String(text ?? "").trim()) return NextResponse.json({ cards: [], exact: false, sure: false, read: "", language: game.languages[0] });
  try {
    return NextResponse.json(await scanGame(game, String(text)));
  } catch {
    return NextResponse.json({ error: "Kaartgegevens ophalen lukt nu even niet." }, { status: 502 });
  }
}
