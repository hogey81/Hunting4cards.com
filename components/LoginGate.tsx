"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount } from "@/lib/account";
import LoginForm from "@/components/LoginForm";

// With accounts switched on, the game picker ("/") is open to everyone; picking a game
// shows this login screen until you're logged in. /account stays reachable, because the
// button in the login mail finishes the login there.
export default function LoginGate() {
  const { enabled, user, ready } = useAccount();
  const path = usePathname();
  if (!enabled || user || path === "/" || path === "/account") return null;
  return (
    <div className="games login-gate">
      {ready && (
        <div className="games-inner">
          <img className="login-logo" src="/icon-192.png" alt="" width={96} height={96} />
          <h1 className="games-title">Welkom bij Hunting4Cards</h1>
          <p className="games-lead">Log in met je e-mailadres. Je krijgt een mail met een inlogknop en een code, een wachtwoord is niet nodig. Je collectie wordt tevens online bewaard!</p>
          <section className="login-card">
            <LoginForm />
          </section>
          <Link className="login-back" href="/">‹ Terug naar de spellen</Link>
        </div>
      )}
    </div>
  );
}
