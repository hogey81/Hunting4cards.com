import Link from "next/link";

type Game = {
  key: string;
  name: string;
  sub: string;
  href: string | null;
  color: string;
  image: string;
};

// The game picker: one tile per game, each with its own badge picture from
// public/games/ (no characters or brand logos, so no rights issues). The start screen; Pokémon opens the Pokémon part (/pokemon); the
// others are coming.
export default function GamesPage() {
  const games: Game[] = [
    {
      key: "pokemon",
      name: "Pokémon",
      sub: "Kaarten en sets",
      href: "/pokemon",
      color: "#1D4ED8",
      image: "/games/pokemon.svg",
    },
    {
      key: "yugioh",
      name: "Yu-Gi-Oh!",
      sub: "Binnenkort",
      href: null,
      color: "#5B21B6",
      image: "/games/yugioh.svg",
    },
    {
      key: "magic",
      name: "Magic: The Gathering",
      sub: "Binnenkort",
      href: null,
      color: "#9A3412",
      image: "/games/magic.svg",
    },
    {
      key: "onepiece",
      name: "One Piece",
      sub: "Binnenkort",
      href: null,
      color: "#B91C1C",
      image: "/games/onepiece.svg",
    },
    {
      key: "riftbound",
      name: "Riftbound",
      sub: "Binnenkort",
      href: null,
      color: "#B45309",
      image: "/games/riftbound.svg",
    },
    {
      key: "cyberpunk",
      name: "Cyberpunk TCG",
      sub: "Binnenkort",
      href: null,
      color: "#854D0E",
      image: "/games/cyberpunk.svg",
    },
    {
      key: "dragonball",
      name: "Dragon Ball Super",
      sub: "Binnenkort",
      href: null,
      color: "#C2410C",
      image: "/games/dragonball.svg",
    },
    {
      key: "digimon",
      name: "Digimon",
      sub: "Binnenkort",
      href: null,
      color: "#0369A1",
      image: "/games/digimon.svg",
    },
    {
      key: "gundam",
      name: "Gundam",
      sub: "Binnenkort",
      href: null,
      color: "#1E40AF",
      image: "/games/gundam.svg",
    },
    {
      key: "fab",
      name: "Flesh and Blood",
      sub: "Binnenkort",
      href: null,
      color: "#7F1D1D",
      image: "/games/fab.svg",
    },
    {
      key: "starwars",
      name: "Star Wars: Unlimited",
      sub: "Binnenkort",
      href: null,
      color: "#334155",
      image: "/games/starwars.svg",
    },
    {
      key: "vanguard",
      name: "Cardfight!! Vanguard",
      sub: "Binnenkort",
      href: null,
      color: "#9F1239",
      image: "/games/vanguard.svg",
    },
    {
      key: "finalfantasy",
      name: "Final Fantasy",
      sub: "Binnenkort",
      href: null,
      color: "#155E75",
      image: "/games/finalfantasy.svg",
    },
    {
      key: "forceofwill",
      name: "Force of Will",
      sub: "Binnenkort",
      href: null,
      color: "#166534",
      image: "/games/forceofwill.svg",
    },
    {
      key: "weissschwarz",
      name: "Weiss Schwarz",
      sub: "Binnenkort",
      href: null,
      color: "#374151",
      image: "/games/weissschwarz.svg",
    },
    {
      key: "wk2026",
      name: "WK 2026",
      sub: "Panini-stickers · binnenkort",
      href: null,
      color: "#15803D",
      image: "/games/wk2026.svg",
    },
    {
      key: "lorcana",
      name: "Lorcana",
      sub: "Binnenkort",
      href: null,
      color: "#0E7490",
      image: "/games/lorcana.svg",
    },
  ];

  return (
    <div className="games">
      <div className="games-inner games-wide">
        <h1 className="games-title">Kies je spel</h1>
        <p className="games-lead">Welke kaarten wil je verzamelen?</p>
        <div className="games-list">
          {games.map((g) => {
            const body = (
              <>
                <span className="game-pic">
                  <img src={g.image} alt="" loading="eager" />
                </span>
                <span className="game-text">
                  <span className="game-name">{g.name}</span>
                  <span className="game-sub">{g.sub}</span>
                </span>
                {g.href && (
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#FFC928"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </>
            );
            return g.href ? (
              <Link
                key={g.key}
                href={g.href}
                className="game"
                style={{ background: g.color }}
              >
                {body}
              </Link>
            ) : (
              <div
                key={g.key}
                className="game game-soon"
                style={{ background: g.color }}
                aria-disabled="true"
              >
                {body}
              </div>
            );
          })}
        </div>
        <p className="games-more">Binnenkort meer spellen</p>
      </div>
    </div>
  );
}
