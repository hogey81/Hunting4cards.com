import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacyverklaring · Hunting4Cards" };

// Who is responsible for the data (AVG: "verwerkingsverantwoordelijke").
const OWNER = "Hunting4Cards";
const CONTACT = "privacy@hunting4cards.com";

// Required by Google Play and the App Store, and by the AVG. Keep it in line with what the app really does.
export default function PrivacyPage() {
  return (
    <article className="legal">
      <Link href="/" className="back">← Hunting4Cards</Link>
      <h1>Privacyverklaring</h1>
      <p className="muted">Laatst bijgewerkt: 2 oktober 2026</p>

      <p>Hunting4Cards is een app om je verzamelkaarten bij te houden, met prijzen van Cardmarket. We verzamelen zo weinig mogelijk gegevens en verkopen niets door.</p>

      <h2>Wie is verantwoordelijk</h2>
      <p>{OWNER} is verantwoordelijk voor de verwerking van je gegevens. Je bereikt ons via <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.</p>

      <h2>Welke gegevens we bewaren, en waarom</h2>
      <ul>
        <li><strong>Je e-mailadres</strong>, als je inlogt. Daarmee sturen we je een inlogcode; een wachtwoord heb je niet. Dit is nodig om je account te laten werken (uitvoering van de overeenkomst).</li>
        <li><strong>Je collectie</strong>: welke kaarten je hebt, hoeveel, in welke staat en versie. Zonder account staat die alleen op je eigen apparaat. Met account bewaren we hem online zodat je hem niet kwijtraakt (uitvoering van de overeenkomst).</li>
        <li><strong>Technische gegevens</strong> zoals je IP-adres en het type apparaat. Onze hostingpartij legt die kort vast in serverlogboeken om de app veilig en werkend te houden (gerechtvaardigd belang).</li>
      </ul>
      <p>We gebruiken geen advertenties, geen trackers en geen analysecookies. De app bewaart je collectie en instellingen op je apparaat (lokale opslag); dat is nodig om de app te laten werken.</p>

      <h2>De camera</h2>
      <p>De scanner gebruikt je camera om de tekst op een kaart te lezen. Dat gebeurt op je eigen telefoon. Foto&apos;s worden niet opgeslagen en niet verstuurd; alleen de gelezen tekst (zoals een setcode of kaartnaam) gaat naar onze server om de kaart op te zoeken.</p>

      <h2>Hoe lang we gegevens bewaren</h2>
      <p>Je account en online collectie bewaren we tot je ze verwijdert. Daarna zijn ze direct weg. Serverlogboeken worden na korte tijd automatisch gewist door onze hostingpartij.</p>

      <h2>Met wie we samenwerken</h2>
      <p>Voor hosting, opslag en het versturen van e-mail werken we met zorgvuldig gekozen dienstverleners. Zij verwerken je gegevens alleen in onze opdracht en mogen ze nergens anders voor gebruiken. Je account en collectie staan op servers in de Europese Unie. Waar een dienstverlener buiten de EU gevestigd is, gelden de waarborgen die de AVG voorschrijft, zoals de standaardcontractbepalingen van de Europese Commissie.</p>
      <p>Kaartafbeeldingen en lettertypes worden rechtstreeks geladen van de openbare kaartdatabases van de spellen en van Google Fonts, zoals bij elke website die afbeeldingen van elders toont.</p>

      <h2>Je rechten</h2>
      <p>Je kunt je account en je online collectie op elk moment zelf verwijderen via <Link href="/account">Account</Link> → Account verwijderen. Je hebt ook recht op inzage, correctie, overdracht en bezwaar. Mail daarvoor naar <a href={`mailto:${CONTACT}`}>{CONTACT}</a>; we reageren binnen een maand.</p>
      <p>Ben je niet tevreden over hoe we met je gegevens omgaan, dan kun je een klacht indienen bij de Autoriteit Persoonsgegevens (autoriteitpersoonsgegevens.nl).</p>

      <h2>Merken</h2>
      <p>Hunting4Cards is een onafhankelijke app en is niet verbonden aan, gesponsord of goedgekeurd door de makers van de kaartspellen of door Cardmarket. Namen van spellen en kaarten zijn eigendom van hun rechthebbenden.</p>
    </article>
  );
}
