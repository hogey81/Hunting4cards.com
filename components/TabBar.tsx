"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const tabs = [
  {
    href: "/",
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
  { href: "/zoeken", label: "Zoeken", center: true, icon: null },
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

export default function TabBar() {
  const path = usePathname();
  const params = useSearchParams();
  const japanese = path.startsWith("/jp/") || (path === "/sets" && params.get("regio") === "jp");
  return (
    <nav className="tabbar" aria-label="Hoofdmenu">
      {tabs.map((t) => {
        const active =
          t.label === "Japans" ? japanese
          : t.label === "Sets" ? path.startsWith("/sets") && !japanese
          : t.href === "/" ? path === "/"
          : path.startsWith(t.href);
        if (t.center) {
          return (
            <Link key={t.href} href={t.href} className={active ? "tab-center active" : "tab-center"} aria-label="Zoeken" aria-current={active ? "page" : undefined}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-4-4" />
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
