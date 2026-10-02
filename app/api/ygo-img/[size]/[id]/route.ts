// Card and set pictures from YGOPRODeck, passed through and cached for a year by
// Vercel's CDN, so each picture is fetched from YGOPRODeck only once (they ask
// apps not to load pictures straight from their server).
const SOURCES: Record<string, (id: string) => string> = {
  small: (id) => `https://images.ygoprodeck.com/images/cards_small/${id}.jpg`,
  big: (id) => `https://images.ygoprodeck.com/images/cards/${id}.jpg`,
  set: (id) => `https://images.ygoprodeck.com/images/sets/${id}.jpg`,
};

export async function GET(_request: Request, { params }: { params: Promise<{ size: string; id: string }> }) {
  const { size, id } = await params;
  const source = SOURCES[size];
  // Card ids are numbers; set codes letters and digits.
  if (!source || !/^[A-Za-z0-9-]{1,20}$/.test(id)) return new Response("Niet gevonden", { status: 404 });
  const res = await fetch(source(id), { cache: "no-store" });
  if (!res.ok) return new Response("Niet gevonden", { status: 404, headers: { "Cache-Control": "public, s-maxage=86400" } });
  return new Response(res.body, {
    headers: {
      "Content-Type": res.headers.get("Content-Type") ?? "image/jpeg",
      "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
    },
  });
}
