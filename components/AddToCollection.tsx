"use client";

import { useEffect, useState } from "react";
import { CONDITIONS, LANGUAGES, entryKey, lastCondition, useCollection, type Condition, type Language } from "@/lib/collection";
import { VARIANT_NAMES, type Variant } from "@/lib/prices";

export default function AddToCollection({
  cardRef,
  japanese,
  hasReverse,
  hasHolo = false,
}: {
  cardRef: string;
  japanese: boolean;
  hasReverse: boolean;
  hasHolo?: boolean;
}) {
  const { entries, add, setQuantity } = useCollection();
  const [picked, setPicked] = useState<Language>("EN");
  const [variant, setVariant] = useState<Variant>("normal");
  const [condition, setCondition] = useState<Condition>("NM");
  useEffect(() => setCondition(lastCondition()), []);
  const language: Language = japanese ? "JP" : picked;
  const current = entries.find((e) => e.key === entryKey(cardRef, variant, language, condition));
  const variants: Variant[] = ["normal", ...(hasHolo ? ["holo" as const] : []), ...(hasReverse ? ["reverse" as const] : [])];
  const conditionInfo = CONDITIONS.find((c) => c.code === condition)!;

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
      {variants.length > 1 && (
        <fieldset>
          <legend>Versie</legend>
          <div className={variants.length > 2 ? "seg seg-3" : "seg seg-2"}>
            {variants.map((v) => (
              <button key={v} type="button" className={v === variant ? "chip on" : "chip"} aria-pressed={v === variant} onClick={() => setVariant(v)}>
                {VARIANT_NAMES[v]}
              </button>
            ))}
          </div>
        </fieldset>
      )}
      <fieldset>
        <legend>Staat van jouw kaart</legend>
        <div className="seg seg-4">
          {CONDITIONS.map((c) => (
            <button key={c.code} type="button" className={c.code === condition ? "chip on" : "chip"} aria-pressed={c.code === condition} title={c.name} onClick={() => setCondition(c.code)}>
              {c.code}
            </button>
          ))}
        </div>
        <p className="condition-hint"><strong>{conditionInfo.name}</strong>: {conditionInfo.hint.toLowerCase()}</p>
      </fieldset>
      {current ? (
        <div className="stepper">
          <button type="button" className="round-btn" aria-label="Eén minder" onClick={() => setQuantity(current.key, current.quantity - 1)}>−</button>
          <span>{current.quantity}× in je collectie</span>
          <button type="button" className="round-btn" aria-label="Eén meer" onClick={() => add(cardRef, variant, language, condition)}>+</button>
        </div>
      ) : (
        <button type="button" className="btn btn-primary btn-block" onClick={() => add(cardRef, variant, language, condition)}>
          + Toevoegen aan collectie
        </button>
      )}
    </section>
  );
}
