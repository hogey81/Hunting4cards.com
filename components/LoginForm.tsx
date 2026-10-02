"use client";

import { useState } from "react";
import { sendCode, verifyCode } from "@/lib/account";
import { LOGIN_WITH_CODE } from "@/lib/account-config";

// Email → code (or the button in the mail). Used on the login screen and the account page.
export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          <p>We hebben een mail gestuurd naar <strong>{email}</strong>. Tik op de knop in die mail, of vul hier de code uit de mail in. Geen mail gezien? Kijk ook even bij spam.</p>
          <label className="sr-only" htmlFor="code">Code</label>
          <input id="code" required autoComplete="one-time-code" inputMode="numeric" placeholder="Code uit de mail" value={code} onChange={(e) => setCode(e.target.value)} />
          <button className="btn btn-primary" disabled={busy}>{busy ? "Controleren…" : "Inloggen"}</button>
          <button type="button" className="btn" onClick={() => { setSent(false); setCode(""); setError(null); }}>Ander e-mailadres</button>
        </form>
      )}
      {error && <p className="account-error">{error}</p>}
    </>
  );
}
