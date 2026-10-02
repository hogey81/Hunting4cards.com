import Link from "next/link";

type Game = { key: string; name: string; sub: string; href: string | null; color: string; image: string | null; icon: React.ReactNode };

const bolt = <path d="M37 4 L14 36 H29 L24 60 L51 25 H36 Z" fill="#FFD43B" stroke="#0B1630" strokeWidth="3" strokeLinejoin="round" />;
const pyramid = (
  <>
    <polygon points="32,6 60,56 4,56" fill="#2E1065" stroke="#FFC928" strokeWidth="4" strokeLinejoin="round" />
    <path d="M32 24 L35 36 L46 40 L35 44 L32 54 L29 44 L18 40 L29 36 Z" fill="#FFC928" />
  </>
);
const ball = (
  <>
    <circle cx="32" cy="32" r="26" fill="#FFFFFF" stroke="#0B1630" strokeWidth="3" />
    <polygon points="32,21 42,28 38,40 26,40 22,28" fill="#0B1630" />
    <path d="M32 21 V7 M42 28 L55 23 M38 40 L46 52 M26 40 L18 52 M22 28 L9 23" stroke="#0B1630" strokeWidth="3" />
  </>
);
const hexagon = (
  <>
    <polygon points="32,4 56,18 56,46 32,60 8,46 8,18" fill="#083344" stroke="#FFC928" strokeWidth="4" strokeLinejoin="round" />
    <path d="M32 14 L36 28 L50 32 L36 36 L32 50 L28 36 L14 32 L28 28 Z" fill="#FFFFFF" />
  </>
);

// The game picker: one tile per game, each with its picture in public/games/
// (an icon until a game has one). Pokémon opens the app as it is; the
// others are coming.
export default function GamesPage() {
  const games: Game[] = [
    { key: "pokemon", name: "Pokémon", sub: "Kaarten en sets", href: "/", color: "#1D4ED8", image: "/games/pokemon.webp", icon: bolt },
    { key: "yugioh", name: "Yu-Gi-Oh!", sub: "Binnenkort", href: null, color: "#5B21B6", image: null, icon: pyramid },
    { key: "wk2026", name: "WK 2026", sub: "Panini-stickers · binnenkort", href: null, color: "#15803D", image: null, icon: ball },
    { key: "lorcana", name: "Lorcana", sub: "Binnenkort", href: null, color: "#0E7490", image: null, icon: hexagon },
  ];

  return (
    <div className="games">
      <h1 className="games-title">Kies je spel</h1>
      <p className="games-lead">Welke kaarten wil je verzamelen?</p>
      <div className="games-list">
        {games.map((g) => {
          const body = (
            <>
              <span className="game-pic">
                {g.image ? (
                  <img src={g.image} alt="" loading="eager" />
                ) : (
                  <svg width="48" height="48" viewBox="0 0 64 64" aria-hidden="true">{g.icon}</svg>
                )}
              </span>
              <span className="game-text">
                <span className="game-name">{g.name}</span>
                <span className="game-sub">{g.sub}</span>
              </span>
              {g.href && (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFC928" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 5l7 7-7 7" />
                </svg>
              )}
            </>
          );
          return g.href ? (
            <Link key={g.key} href={g.href} className="game" style={{ background: g.color }}>{body}</Link>
          ) : (
            <div key={g.key} className="game game-soon" style={{ background: g.color }} aria-disabled="true">{body}</div>
          );
        })}
      </div>
      <p className="games-more">Binnenkort meer spellen</p>
    </div>
  );
}
