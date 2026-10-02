export default function GameSearchForm({ action, hint, q = "" }: { action: string; hint: string; q?: string }) {
  return (
    <form action={action} className="search" role="search">
      <label htmlFor="q" className="sr-only">Zoek een kaart op naam</label>
      <input id="q" name="q" type="search" defaultValue={q} placeholder={hint} autoComplete="off" />
      <button type="submit" className="btn btn-primary">Zoek</button>
    </form>
  );
}
