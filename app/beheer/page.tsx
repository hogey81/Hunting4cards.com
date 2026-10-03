"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAccount } from "@/lib/account";
import { adminStats, LIMITS, priceHistoryStatus, type AdminStats } from "@/lib/admin";

const REFRESH_MS = 60_000;

// Usage against the free limits, for the owner only. Refreshes every minute.
export default function BeheerPage() {
  const { user, ready } = useAccount();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [state, setState] = useState<"loading" | "denied" | "error" | "ok">("loading");
  const [prices, setPrices] = useState<{ day: string; count: number } | null | undefined>(undefined);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = () =>
      adminStats().then((r) => {
        if (cancelled) return;
        if (r.stats) {
          setStats(r.stats);
          setState("ok");
        } else setState(r.denied ? "denied" : "error");
      });
    load();
    priceHistoryStatus().then((p) => !cancelled && setPrices(p));
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [user]);

  return (
    <article className="beheer">
      <Link href="/" className="back">← Hunting4Cards</Link>
      <h1>Beheer</h1>

      {!ready ? null : !user ? (
        <section className="empty">
          <p>Log eerst in via <Link href="/account">Account</Link>.</p>
        </section>
      ) : state === "denied" ? (
        <section className="empty">
          <p>Deze pagina is alleen voor de beheerder.</p>
        </section>
      ) : state === "error" ? (
        <section className="empty">
          <p>De cijfers konden niet worden geladen. Probeer het later opnieuw.</p>
        </section>
      ) : !stats ? (
        <p className="muted">Laden…</p>
      ) : (
        <>
          <p className="muted">Bijgewerkt om {new Date(stats.at).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}, ververst elke minuut.</p>

          <h2>Gratis limieten</h2>
          <Meter label="Inlogmails vandaag" sub="Resend, telt één mail per persoon" value={stats.mails_today} limit={LIMITS.mailsPerDay} />
          <Meter label="Inlogmails deze maand" sub="Resend, telt één mail per persoon" value={stats.mails_month} limit={LIMITS.mailsPerMonth} />
          <Meter label="Actieve gebruikers (30 dagen)" sub="Supabase" value={stats.active_30d} limit={LIMITS.activeUsersPerMonth} />
          <Meter
            label="Database"
            sub="Supabase"
            value={stats.db_bytes}
            limit={LIMITS.databaseBytes}
            format={(v) => `${(v / 1024 / 1024).toFixed(0)} MB`}
          />

          <h2>Gebruikers</h2>
          <div className="stats-grid">
            <Stat value={stats.users} label="accounts" />
            <Stat value={stats.new_today} label="nieuw vandaag" />
            <Stat value={stats.new_30d} label="nieuw (30 dagen)" />
            <Stat value={stats.active_today} label="ingelogd vandaag" />
            <Stat value={stats.collections} label="online collecties" />
            <Stat value={stats.cards} label="kaarten opgeslagen" />
          </div>

          <h2>Prijsgeschiedenis</h2>
          <p className="muted">
            {prices === undefined
              ? "Laden…"
              : prices === null
                ? "Nog geen prijzen opgeslagen. Dit gebeurt elke ochtend vroeg."
                : `Laatst opgeslagen op ${new Date(prices.day).toLocaleDateString("nl-NL", { day: "numeric", month: "long" })}: ${prices.count.toLocaleString("nl-NL")} prijzen.`}
          </p>

          <h2>Bij de diensten zelf</h2>
          <p className="muted">Websiteverkeer en serverkosten staan alleen bij Vercel zelf.</p>
          <ul className="beheer-links">
            <li><a href="https://vercel.com/bestecamerakeuze/hunting4cards-com/usage" target="_blank" rel="noreferrer">Vercel: verkeer en servers</a></li>
            <li><a href="https://supabase.com/dashboard/project/vtllviqpmebgnkpupcah/settings/billing/usage" target="_blank" rel="noreferrer">Supabase: gebruik</a></li>
            <li><a href="https://resend.com/settings/usage" target="_blank" rel="noreferrer">Resend: verstuurde mails</a></li>
          </ul>
        </>
      )}
    </article>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="stat">
      <strong>{value.toLocaleString("nl-NL")}</strong>
      <span>{label}</span>
    </div>
  );
}

function Meter({ label, sub, value, limit, format }: { label: string; sub: string; value: number | null; limit: number; format?: (v: number) => string }) {
  const show = format ?? ((v: number) => v.toLocaleString("nl-NL"));
  const pct = value == null ? 0 : Math.min(100, (value / limit) * 100);
  const level = pct >= 90 ? "danger" : pct >= 75 ? "warn" : "ok";
  return (
    <div className={`meter meter-${level}`}>
      <div className="meter-head">
        <span>
          {label} <small>{sub}</small>
        </span>
        <strong>{value == null ? "onbekend" : `${show(value)} van ${show(limit)}`}</strong>
      </div>
      <div className="meter-bar">
        <div style={{ width: `${pct}%` }} />
      </div>
      {level !== "ok" && <p className="meter-note">{level === "danger" ? "Bijna op de limiet." : "Let op: driekwart van de limiet is bereikt."}</p>}
    </div>
  );
}
