# Hunting4Cards

Een verzamelapp voor Pokémon-kaarten met actuele Cardmarket-prijzen.

- Next.js (App Router), te hosten op Vercel.
- Kaarten, sets en Cardmarket-prijzen komen van [TCGdex](https://tcgdex.dev). Alle calls staan in `lib/tcgdex.ts`, zodat de bron later te vervangen is.
- Prijzen worden op de server elk uur ververst. Cardmarket zelf werkt de prijzen één keer per dag bij. Bij elke keer openen haalt de app de nieuwste prijzen op via `/api/prices`.
- De collectie wordt voorlopig op het apparaat bewaard (localStorage).

## Lokaal draaien

```bash
npm install
npm run dev
```

Open http://localhost:3000.
