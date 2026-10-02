import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacyverklaring · Hunting4Cards" };

// Required by Google Play and the App Store. Keep it in line with what the app really does.
export default function PrivacyPage() {
  return (
    <article className="legal">
      <Link href="/" className="back">← Hunting4Cards</Link>
      <h1>Privacyverklaring</h1>
      <p className="muted">Laatst bijgewerkt: 2 oktober 2026</p>

      <p>Hunting4Cards is een app om je verzamelkaarten bij te houden, met prijzen van Cardmarket. We verzamelen zo weinig mogelijk gegevens en verkopen niets door.</p>

      <h2>Welke gegevens we bewaren</h2>
      <ul>
        <li><strong>Je e-mailadres</strong>, als je inlogt. We sturen je daarmee een inlogcode. Je hebt geen wachtwoord.</li>
        <li><strong>Je collectie</strong>: welke kaarten je hebt, hoeveel, in welke staat en versie. Zonder account staat die alleen op je apparaat; met account bewaren we hem online zodat je hem niet kwijtraakt.</li>
      </ul>

      <h2>De camera</h2>
      <p>De scanner gebruikt je camera om de tekst op een kaart te lezen. Dat gebeurt op je eigen telefoon. Foto&apos;s worden niet opgeslagen en niet verstuurd; alleen de gelezen tekst (zoals een setcode of kaartnaam) gaat naar onze server om de kaart op te zoeken.</p>

      <h2>Wie de gegevens verwerkt</h2>
      <ul>
        <li>Supabase (servers in Ierland) bewaart je account en collectie.</li>
        <li>Resend verstuurt de inlogmail.</li>
        <li>Vercel host de website en app.</li>
        <li>Google Fonts levert de lettertypes; daarbij ziet Google je IP-adres.</li>
      </ul>
      <p>We gebruiken geen advertenties en geen trackers.</p>

      <h2>Je rechten</h2>
      <p>Je kunt je account en je online collectie op elk moment zelf verwijderen via <Link href="/account">Account</Link> → Account verwijderen. Alles wordt dan direct gewist. Vragen of een ander verzoek (inzage, correctie)? Mail naar <a href="mailto:privacy@hunting4cards.com">privacy@hunting4cards.com</a>.</p>

      <h2>Merken</h2>
      <p>Hunting4Cards is een onafhankelijke app en is niet verbonden aan, gesponsord of goedgekeurd door de makers van de kaartspellen of door Cardmarket. Namen van spellen en kaarten zijn eigendom van hun rechthebbenden.</p>
    </article>
  );
}
