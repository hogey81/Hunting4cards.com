"use client";

import { useState } from "react";
import { LANGUAGES, entryKey, useCollection, type Language } from "@/lib/collection";
import type { Variant } from "@/lib/prices";

export default function AddToCollection({ cardRef, japanese, hasReverse }: { cardRef: string; japanese: boolean; hasReverse: boolean }) {
  const { entries, add, setQuantity } = useCollection();
  const [picked, setPicked] = useState<Language>("EN");
  const [variant, setVariant] = useState<Variant>("normal");
  const language: Language = japanese ? "JP" : picked;
  const current = entries.find((e) => e.key === entryKey(cardRef, variant, language));

  return (
    <section className="add">
      {!japanese && (
        <fieldset>
          <legend>Taal van jouw kaart</legend>
          <div className="seg seg-4">
            {LANGUAGES.map((l) => (
              <button key={l} type="button" className={l === picked ? "chip on" : "chip"} aria-pressed={l === picked} onClick={() => setPicked(l)}>
                {l}
              </button>
            ))}
          </div>
        </fieldset>
      )}
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
          <button type="button" className="round-btn" aria-label="Eén meer" onClick={() => add(cardRef, variant, language)}>+</button>
        </div>
      ) : (
        <button type="button" className="btn btn-primary btn-block" onClick={() => add(cardRef, variant, language)}>
          + Toevoegen aan collectie
        </button>
      )}
    </section>
  );
}
