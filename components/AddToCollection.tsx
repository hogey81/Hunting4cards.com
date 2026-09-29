"use client";

import { useState } from "react";
import { LANGUAGES, entryKey, useCollection, type Language } from "@/lib/collection";
import type { Variant } from "@/lib/prices";

export default function AddToCollection({ cardId, hasReverse }: { cardId: string; hasReverse: boolean }) {
  const { entries, add, setQuantity } = useCollection();
  const [language, setLanguage] = useState<Language>("EN");
  const [variant, setVariant] = useState<Variant>("normal");
  const current = entries.find((e) => e.key === entryKey(cardId, variant, language));

  return (
    <section className="add">
      <fieldset>
        <legend>Taal van jouw kaart</legend>
        <div className="seg seg-5">
          {LANGUAGES.map((l) => (
            <button key={l} type="button" className={l === language ? "chip on" : "chip"} aria-pressed={l === language} onClick={() => setLanguage(l)}>
              {l}
            </button>
          ))}
        </div>
      </fieldset>
      {hasReverse && (
        <fieldset>
          <legend>Versie</legend>
          <div className="seg seg-2">
            {(["normal", "reverse"] as Variant[]).map((v) => (
              <button key={v} type="button" className={v === variant ? "chip on" : "chip"} aria-pressed={v === variant} onClick={() => setVariant(v)}>
                {v === "normal" ? "Normaal" : "Reverse holo"}
              </button>
            ))}
          </div>
        </fieldset>
      )}
      {current ? (
        <div className="stepper">
          <button type="button" className="round-btn" aria-label="Eén minder" onClick={() => setQuantity(current.key, current.quantity - 1)}>−</button>
          <span>{current.quantity}× in je collectie</span>
          <button type="button" className="round-btn" aria-label="Eén meer" onClick={() => add(cardId, variant, language)}>+</button>
        </div>
      ) : (
        <button type="button" className="btn btn-primary btn-block" onClick={() => add(cardId, variant, language)}>
          + Toevoegen aan collectie
        </button>
      )}
    </section>
  );
}
