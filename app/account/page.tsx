"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { sendCode, signOut, useAccount, verifyCode, verifyLink } from "@/lib/account";
import { useCollection } from "@/lib/collection";
import { LOGIN_WITH_CODE } from "@/lib/account-config";

export default function AccountPage() {
  const { enabled, user, ready } = useAccount();
  const { entries } = useCollection();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Opened from the button in the email: finish the login straight away.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenHash = params.get("token_hash");
    if (!tokenHash) return;
    window.history.replaceState(null, "", "/account");
    // Logged in from the email: go to the start screen with the game tiles.
    run(() => verifyLink(tokenHash), () => router.replace("/"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function run(step: () => Promise<string | null>, after?: () => void) {
    setBusy(true);
    setError(null);
    const err = await step();
    setBusy(false);
    if (err) setError(err);
    else after?.();
  }

  return (
    <>
      <Link href="/collectie" className="back">← Collectie</Link>
      <h1>Account</h1>

      {!enabled ? (
        <section className="empty">
          <p>Inloggen is op dit moment niet beschikbaar. Je collectie staat op dit apparaat.</p>
        </section>
      ) : !ready ? null : user ? (
        <section className="empty">
          <h2>Je bent ingelogd</h2>
          <p>{user.email}</p>
          <p>Je collectie ({entries.length} {entries.length === 1 ? "kaart" : "kaarten"}) wordt online bewaard. Log op een ander apparaat in met hetzelfde e-mailadres om hem daar ook te zien.</p>
          <div className="row">
            <button className="btn" disabled={busy} onClick={() => run(async () => (await signOut(), null))}>Uitloggen</button>
          </div>
        </section>
      ) : (
        <section className="empty">
          <h2>Bewaar je collectie online</h2>
          <p>Log in met je e-mailadres. Zo raak je je kaarten nooit kwijt, ook niet op een nieuwe telefoon. De kaarten die nu op dit apparaat staan gaan mee.</p>
          {!sent ? (
            <form className="account-form" onSubmit={(e) => { e.preventDefault(); run(() => sendCode(email.trim()), () => setSent(true)); }}>
              <label className="sr-only" htmlFor="email">E-mailadres</label>
              <input id="email" type="email" required autoComplete="email" inputMode="email" placeholder="jij@voorbeeld.nl" value={email} onChange={(e) => setEmail(e.target.value)} />
              <button className="btn btn-primary" disabled={busy}>{busy ? "Versturen…" : LOGIN_WITH_CODE ? "Stuur inlogcode" : "Stuur inloglink"}</button>
            </form>
          ) : !LOGIN_WITH_CODE ? (
            <div className="account-form">
              <p>We hebben een mail gestuurd naar <strong>{email}</strong>. Tik op de link in die mail om in te loggen. Geen mail gezien? Kijk ook even bij spam.</p>
              <button type="button" className="btn" onClick={() => { setSent(false); setError(null); }}>Ander e-mailadres</button>
            </div>
          ) : (
            <form className="account-form" onSubmit={(e) => { e.preventDefault(); run(() => verifyCode(email.trim(), code.trim())); }}>
              <p>We hebben een mail gestuurd naar <strong>{email}</strong>. Tik op de knop in die mail, of vul hier de code uit de mail in.</p>
              <label className="sr-only" htmlFor="code">Code</label>
              <input id="code" required autoComplete="one-time-code" inputMode="numeric" placeholder="Code uit de mail" value={code} onChange={(e) => setCode(e.target.value)} />
              <button className="btn btn-primary" disabled={busy}>{busy ? "Controleren…" : "Inloggen"}</button>
              <button type="button" className="btn" onClick={() => { setSent(false); setCode(""); setError(null); }}>Ander e-mailadres</button>
            </form>
          )}
          {error && <p className="account-error">{error}</p>}
        </section>
      )}
    </>
  );
}
