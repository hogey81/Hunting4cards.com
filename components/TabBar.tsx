"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { GAME_PATHS } from "@/lib/games/refs";

const tabs = [
  {
    href: "/pokemon",
    label: "Home",
    icon: <path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z" />,
  },
  {
    href: "/collectie",
    label: "Collectie",
    icon: (
      <>
        <rect x="4" y="3" width="11" height="15" rx="2" />
        <path d="M9 21h9a2 2 0 0 0 2-2V8" />
      </>
    ),
  },
  { href: "/scan", label: "Scannen", center: true, icon: null },
  {
    href: "/sets",
    label: "Sets",
    icon: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </>
    ),
  },
  {
    href: "/sets?regio=jp",
    label: "Japans",
    icon: (
      <>
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <circle cx="12" cy="12" r="4" />
      </>
    ),
  },
];

const gridIcon = tabs[3].icon;

// In the other games (Yu-Gi-Oh!, Magic, Lorcana, ...): their own home, scanner and
// sets, and a way back to the game picker. Search is on the game's home.
type Tab = { href: string; label: string; center?: boolean; icon: React.ReactNode };

const gameTabs = (base: string): Tab[] => [
  { ...tabs[0], href: base },
  tabs[1],
  { href: `${base}/scan`, label: "Scannen", center: true, icon: null },
  { href: `${base}/sets`, label: "Sets", icon: gridIcon },
  {
    href: "/",
    label: "Spellen",
    icon: (
      <>
        <rect x="3" y="5" width="18" height="6" rx="2" />
        <rect x="3" y="13" width="18" height="6" rx="2" />
      </>
    ),
  },
];

export default function TabBar() {
  const path = usePathname();
  const params = useSearchParams();
  const game = Object.values(GAME_PATHS).find((base) => path === base || path.startsWith(`${base}/`));
  if (game) return <GameTabBar base={game} path={path} />;
  const japanese = path.startsWith("/jp/") || (path === "/sets" && params.get("regio") === "jp");
  return (
    <nav className="tabbar" aria-label="Hoofdmenu">
      {tabs.map((t) => {
        const active =
          t.label === "Japans" ? japanese
          : t.label === "Sets" ? path.startsWith("/sets") && !japanese
          : t.href === "/pokemon" ? path === "/pokemon"
          : path.startsWith(t.href);
        if (t.center) {
          return (
            <Link key={t.href} href={t.href} className={active ? "tab-center active" : "tab-center"} aria-label="Kaart scannen" aria-current={active ? "page" : undefined}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2.2l1.4-2h5.8l1.4 2h2.2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z" />
                <circle cx="12" cy="13" r="3.5" />
              </svg>
            </Link>
          );
        }
        return (
          <Link key={t.href} href={t.href} className={active ? "tab active" : "tab"} aria-current={active ? "page" : undefined}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {t.icon}
            </svg>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

function GameTabBar({ base, path }: { base: string; path: string }) {
  return (
    <nav className="tabbar" aria-label="Hoofdmenu">
      {gameTabs(base).map((t) => {
        const active = t.href === base ? path === base : t.href !== "/" && path.startsWith(t.href);
        if (t.center) {
          return (
            <Link key={t.href} href={t.href} className={active ? "tab-center active" : "tab-center"} aria-label="Kaart scannen" aria-current={active ? "page" : undefined}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2.2l1.4-2h5.8l1.4 2h2.2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z" />
                <circle cx="12" cy="13" r="3.5" />
              </svg>
            </Link>
          );
        }
        return (
          <Link key={t.href} href={t.href} className={active ? "tab active" : "tab"} aria-current={active ? "page" : undefined}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {t.icon}
            </svg>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
