"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import CardImg from "./CardImg";
import { entryKey, useCollection } from "@/lib/collection";
import { cardHref, parseRef } from "@/lib/card-ref";
import type { ScanMatch } from "@/lib/scan-text";

type Phase =
  | { step: "idle" }
  | { step: "reading"; progress: number }
  | { step: "searching" }
  | { step: "done"; cards: ScanMatch[]; exact: boolean; read: string }
  | { step: "error"; message: string };

// Draws the photo on a canvas, scaled so the small print is large enough to read.
// No extra filters: they made the colourful card art noisier. `top`/`height` pick a strip (0-1).
async function prepare(file: File, top = 0, height = 1, maxSide = 1800, maxZoom = 1) {
  const bitmap = await createImageBitmap(file);
  const sy = Math.round(bitmap.height * top);
  const sh = Math.round(bitmap.height * height);
  const scale = Math.min(maxSide / Math.max(bitmap.width, sh), maxZoom);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(sh * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, sy, bitmap.width, sh, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas;
}

async function readText(file: File, onProgress: (p: number) => void) {
  const { createWorker } = await import("tesseract.js");
  let pass = 0;
  // Served from our own site (see scripts/copy-ocr.mjs).
  const worker = await createWorker("eng", 1, {
    workerPath: "/ocr/worker.min.js",
    corePath: "/ocr",
    langPath: "/ocr",
    logger: (m) => {
      if (m.status === "recognizing text") onProgress((pass + m.progress) / 2);
    },
  });
  try {
    const whole = await worker.recognize(await prepare(file, 0, 1, 2000));
    pass = 1;
    // The set code and number are small print near the bottom: read the lower half enlarged.
    const bottom = await worker.recognize(await prepare(file, 0.45, 0.55, 2600, 2));
    return `${whole.data.text}\n${bottom.data.text}`;
  } finally {
    await worker.terminate();
  }
}

export default function Scanner() {
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>({ step: "idle" });
  const [typed, setTyped] = useState("");
  const { entries, add } = useCollection();

  async function lookup(request: Promise<Response>) {
    setPhase({ step: "searching" });
    try {
      const res = await request;
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPhase({ step: "done", cards: data.cards, exact: data.exact, read: data.read });
    } catch (e) {
      setPhase({ step: "error", message: e instanceof Error && e.message ? e.message : "Er ging iets mis. Probeer het opnieuw." });
    }
  }

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    if (photo) URL.revokeObjectURL(photo);
    setPhoto(URL.createObjectURL(file));
    setPhase({ step: "reading", progress: 0 });
    let text: string;
    try {
      text = await readText(file, (p) => setPhase({ step: "reading", progress: p }));
    } catch {
      setPhase({ step: "error", message: "De foto kon niet gelezen worden. Probeer het opnieuw of typ de code." });
      return;
    }
    await lookup(fetch("/api/scan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) }));
  }

  function onTyped(e: React.FormEvent) {
    e.preventDefault();
    const q = typed.trim();
    if (q.length >= 2) lookup(fetch(`/api/scan?${new URLSearchParams({ q })}`));
  }

  const busy = phase.step === "reading" || phase.step === "searching";

  return (
    <>
      <header className="head">
        <h1>Kaart scannen</h1>
      </header>

      <div className="scan-frame">
        {photo ? <img src={photo} alt="Jouw foto" /> : (
          <div className="scan-empty">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" />
              <rect x="8" y="7" width="8" height="10" rx="1" />
            </svg>
            <span>Leg de kaart plat, fotografeer recht van boven en laat de kaart het hele beeld vullen. Zorg dat de code linksonder (bv. 30C 100/128) scherp is.</span>
          </div>
        )}
        {busy && (
          <div className="scan-busy" role="status">
            {phase.step === "reading" ? `Kaart lezen… ${Math.round(phase.progress * 100)}%` : "Kaart zoeken…"}
          </div>
        )}
      </div>

      <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { onPhoto(e.target.files?.[0]); e.target.value = ""; }} />
      <input ref={gallery} type="file" accept="image/*" hidden onChange={(e) => { onPhoto(e.target.files?.[0]); e.target.value = ""; }} />
      <div className="scan-actions">
        <button type="button" className="btn btn-primary" disabled={busy} onClick={() => camera.current?.click()}>
          {photo ? "Nieuwe foto" : "Maak een foto"}
        </button>
        <button type="button" className="btn" disabled={busy} onClick={() => gallery.current?.click()}>
          Kies uit galerij
        </button>
      </div>

      {phase.step === "error" && <p className="muted">{phase.message}</p>}

      {phase.step === "done" && (
        <section className="scan-results">
          <p className="muted">
            Gelezen: <strong>{phase.read}</strong>.{" "}
            {phase.cards.length === 0
              ? "Geen kaart herkend. Maak een scherpere foto van dichtbij, of typ hieronder de code die linksonder op de kaart staat (bv. 30C 100)."
              : phase.exact ? "Is dit je kaart?" : "Welke is het? Staat hij er niet tussen, typ dan de code hieronder."}
          </p>
          {phase.cards.map((c) => {
            const japanese = parseRef(c.ref).region === "ja";
            const owned = entries.find((e) => e.key === entryKey(c.ref, "normal", japanese ? "JP" : "EN"));
            return (
              <div key={c.ref} className="scan-match">
                <Link href={cardHref(c.ref)} className="tile-img scan-thumb">
                  <CardImg src={c.image} name={c.name} code={c.code} />
                </Link>
                <div className="scan-info">
                  <strong>{c.name}</strong>
                  <span className="tile-meta">{c.code}{japanese ? " · Japans" : ""}</span>
                  {owned ? (
                    <span className="scan-added">
                      ✓ {owned.quantity}× in je collectie · <Link href={cardHref(c.ref)}>taal of versie wijzigen</Link>
                    </span>
                  ) : null}
                </div>
                <button type="button" className="btn btn-primary scan-add" onClick={() => add(c.ref, "normal", japanese ? "JP" : "EN")}>
                  {owned ? "+1" : "Toevoegen"}
                </button>
              </div>
            );
          })}
        </section>
      )}

      <form className="search" onSubmit={onTyped}>
        <label htmlFor="code" className="sr-only">Of typ de code</label>
        <input id="code" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Of typ de code, bv. PAL 123" autoComplete="off" />
        <button type="submit" className="btn" disabled={busy}>Zoek</button>
      </form>
    </>
  );
}
