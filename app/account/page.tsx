"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { deleteAccount, signOut, useAccount, verifyLink } from "@/lib/account";
import LoginForm from "@/components/LoginForm";
import { useCollection } from "@/lib/collection";

export default function AccountPage() {
  const { enabled, user, ready } = useAccount();
  const { entries } = useCollection();
  const router = useRouter();
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
        <>
          <section className="empty">
            <h2>Je bent ingelogd</h2>
            <p>{user.email}</p>
            <p>Je collectie ({entries.length} {entries.length === 1 ? "kaart" : "kaarten"}) wordt online bewaard. Log op een ander apparaat in met hetzelfde e-mailadres om hem daar ook te zien.</p>
            <div className="row">
              <button className="btn" disabled={busy} onClick={() => run(async () => (await signOut(), null))}>Uitloggen</button>
            </div>
          </section>
          <section className="empty">
            <h2>Account verwijderen</h2>
            <p>Hiermee verwijder je je account en je online collectie voorgoed. Dit kan niet ongedaan worden gemaakt.</p>
            <div className="row">
              <button
                className="btn btn-danger"
                disabled={busy}
                onClick={() => {
                  if (window.confirm("Weet je het zeker? Je account en je collectie worden voorgoed verwijderd.")) run(deleteAccount, () => router.replace("/"));
                }}
              >
                Account verwijderen
              </button>
            </div>
            {error && <p className="account-error">{error}</p>}
          </section>
        </>
      ) : (
        <section className="empty">
          <h2>Inloggen</h2>
          <LoginForm />
        </section>
      )}

      <p className="muted small-print"><Link href="/privacy">Privacyverklaring</Link></p>
    </>
  );
}
