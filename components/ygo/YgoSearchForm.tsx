export default function YgoSearchForm({ q = "" }: { q?: string }) {
  return (
    <form action="/yugioh/zoeken" className="search" role="search">
      <label htmlFor="q" className="sr-only">Zoek een Yu-Gi-Oh!-kaart op naam</label>
      <input id="q" name="q" type="search" defaultValue={q} placeholder="Naam, bv. Dark Magician" autoComplete="off" />
      <button type="submit" className="btn btn-primary">Zoek</button>
    </form>
  );
}
