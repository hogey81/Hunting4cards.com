"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import CardImg from "./CardImg";
import { CONDITIONS, LANGUAGES, entryKey, lastCondition, useCollection, type Condition, type Language } from "@/lib/collection";
import { cardHref, parseRef } from "@/lib/card-ref";
import type { ScanMatch } from "@/lib/scan-text";
import { VARIANT_NAMES, type Variant } from "@/lib/prices";
import { CLEANUPS, cleanUp, describeCamera, focusAt, openBackCamera, setCameraZoom, tuneCamera } from "@/lib/camera";

type Phase =
  | { step: "idle" }
  | { step: "reading"; progress: number }
  | { step: "searching" }
  | { step: "done"; cards: ScanMatch[]; exact: boolean; read: string; language: Language }
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

type OcrWorker = Awaited<ReturnType<typeof import("tesseract.js")["createWorker"]>>;

// Text recognition takes a few seconds to load, so it starts as soon as the scan
// page opens and is reused for every scan.
let ocr: Promise<OcrWorker> | null = null;
let onOcrProgress: (p: number) => void = () => {};
function ocrWorker() {
  ocr ??= import("tesseract.js").then(({ createWorker }) =>
    // Served from our own site (see scripts/copy-ocr.mjs).
    createWorker("eng", 1, {
      workerPath: "/ocr/worker.min.js",
      corePath: "/ocr",
      langPath: "/ocr",
      logger: (m) => {
        if (m.status === "recognizing text") onOcrProgress(m.progress);
      },
    }),
  );
  ocr.catch(() => (ocr = null));
  return ocr;
}

// Reads parts of the photo. Each part is [top, height, maxSide, maxZoom].
async function readParts(file: File, parts: [number, number, number, number][], onProgress: (p: number) => void) {
  const worker = await ocrWorker();
  await worker.setParameters({ tessedit_char_whitelist: "" }); // the live camera limits the letters; a photo needs all
  const texts: string[] = [];
  for (const [i, [top, height, maxSide, maxZoom]] of parts.entries()) {
    onOcrProgress = (p) => onProgress((i + p) / parts.length);
    texts.push((await worker.recognize(await prepare(file, top, height, maxSide, maxZoom))).data.text);
  }
  onOcrProgress = () => {};
  return texts.join("\n");
}

// Quick look first: only the name at the top and the small print at the bottom
// ("PAL DE 123/193"), which is all that is needed for most cards.
const QUICK: [number, number, number, number][] = [
  [0.8, 0.2, 1800, 2.5],
  [0, 0.16, 1400, 1.5],
];
// If that isn't enough (the card was small in the photo, or an older card):
// the whole card, and only then the lower half enlarged. Each step stops as soon
// as the card is found.
const STEPS: [number, number, number, number][][] = [QUICK, [[0, 1, 2000, 2]], [[0.45, 0.55, 2600, 2]]];
const PASSES = STEPS.flat().length;

const LANGUAGE_NAMES: Record<string, string> = {
  EN: "Engels", NL: "Nederlands", DE: "Duits", FR: "Frans", IT: "Italiaans", ES: "Spaans", PT: "Portugees", JP: "Japans",
};

// The live camera only reads the code at the bottom left of the card
// ("PFL EN 120/094"): a short line of plain print, which reads far more reliably
// than the whole card. The outline is a strip (as a share of the frame; height / width).
const GUIDE_WIDTH = 0.7;
const GUIDE_RATIO = 1 / 4;

// Cuts the part of the video frame inside the outline (the video is shown
// with object-fit: cover, so the visible part is centred). `screenZoom`: how much
// the video is enlarged on screen when the camera can't zoom by itself.
function grabGuide(video: HTMLVideoElement, screenZoom: number) {
  // The size before the on-screen enlargement (a CSS transform, which the bounding box includes).
  const outer = video.getBoundingClientRect();
  const box = { width: outer.width / screenZoom, height: outer.height / screenZoom };
  const scale = Math.max(box.width / video.videoWidth, box.height / video.videoHeight) * screenZoom;
  const gw = box.width * GUIDE_WIDTH;
  const gh = gw * GUIDE_RATIO;
  // A margin, so a code held slightly off-centre is still complete.
  const w = Math.min(video.videoWidth, (gw * 1.1) / scale);
  const h = Math.min(video.videoHeight, (gh * 1.3) / scale);
  const canvas = document.createElement("canvas");
  // Enlarged: small print reads better when the letters are big.
  const up = Math.min(3, 1400 / w);
  canvas.width = Math.round(w * up);
  canvas.height = Math.round(h * up);
  canvas.getContext("2d")!.drawImage(video, (video.videoWidth - w) / 2, (video.videoHeight - h) / 2, w, h, 0, 0, canvas.width, canvas.height);
  return canvas;
}

// Only what a card code is made of: fewer wrong guesses from the text reader.
const CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/ ";

// The part of the text that is a card code: "PFL DE 120/094", "120/094", or
// "SVP EN 085" on promos. Strict on purpose: a carpet or a table read as text
// easily gives something like "E1 047", which is also a real card.
const LANG = "(?:EN|DE|FR|IT|ES|PT|NL)";
const CODE_RE = new RegExp(`(?:\\b[A-Z0-9]{2,6}\\s+)?(?:${LANG}\\s+)?\\d{1,3}\\s*/\\s*\\d{2,3}\\b`);
const codeIn = (text: string) => text.match(CODE_RE)?.[0] ?? null;
// The numbers alone ("120/094"): the same card read twice in a row, whatever the
// letters came out as, before it is looked up.
const numbersOf = (code: string) => code.match(/\d{1,3}\s*\/\s*\d{2,3}/)?.[0].replace(/\s/g, "") ?? code;

const ZOOMS = [1, 1.5, 2, 3];
// Zoomed in, the phone is held further away: most phones can't focus closer than
// about 10 cm. Only when the camera zooms by itself: enlarging on screen makes the picture blurrier.
const START_ZOOM = 2;

export default function Scanner() {
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>({ step: "idle" });
  const [typed, setTyped] = useState("");
  const { entries, add } = useCollection();
  const [condition, setCondition] = useState<Condition>("NM");
  useEffect(() => setCondition(lastCondition()), []);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [live, setLive] = useState(false);
  const [zoom, setZoom] = useState(START_ZOOM);
  const [hardwareZoom, setHardwareZoom] = useState(false);
  const [seen, setSeen] = useState("");
  const [found, setFound] = useState("");
  // The card just found, shown in front of the camera; reading waits while it is open.
  const [popup, setPopup] = useState<ScanMatch | null>(null);
  const [popupSure, setPopupSure] = useState(true);
  const [choices, setChoices] = useState<ScanMatch[]>([]);
  const [variant, setVariant] = useState<Variant>("normal");
  // What the camera last read and what that found, shown small under the picture:
  // a screenshot then tells where scanning gets stuck on a phone.
  const [debug, setDebug] = useState("");
  const [lastCode, setLastCode] = useState("");
  const paused = useRef(false);
  const closedAt = useRef(0);
  const closePopup = () => {
    closedAt.current = Date.now();
    setPopup(null);
    paused.current = false;
  };
  const results = useRef<HTMLElement>(null);
  const [cameraInfo, setCameraInfo] = useState("");
  const screenZoom = hardwareZoom ? 1 : zoom;

  function stopCamera() {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    setLive(false);
  }
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    ocrWorker().catch(() => {});
    return () => {
      mounted.current = false;
      stopCamera();
    };
  }, []);

  // The camera runs inside the page. Opening the phone's camera app instead made
  // Android close the page to free memory, and the photo was lost.
  // `auto`: started by opening the page. Then there is no tap to open the phone's
  // camera app with, so on failure the start screen just stays.
  async function startCamera(auto = false) {
    if (!navigator.mediaDevices?.getUserMedia) {
      if (!auto) camera.current?.click();
      return;
    }
    try {
      stream.current = await openBackCamera();
      // Left the page while the camera was starting: switch it off again.
      if (!mounted.current) return stopCamera();
      const track = stream.current.getVideoTracks()[0];
      const canZoom = await tuneCamera(track);
      const hw = canZoom && (await setCameraZoom(track, START_ZOOM));
      setHardwareZoom(hw);
      setZoom(hw ? START_ZOOM : 1);
      setCameraInfo(describeCamera(track, hw));
      setLive(true);
      setPhase({ step: "idle" });
    } catch {
      // No permission or no camera: fall back to the phone's own camera.
      if (!auto) camera.current?.click();
    }
  }

  // The camera button in the tab bar leads here: go straight to the camera.
  useEffect(() => {
    startCamera(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (live && video.current && stream.current) {
      video.current.srcObject = stream.current;
      video.current.play().catch(() => {});
    }
  }, [live]);

  async function changeZoom() {
    const next = ZOOMS[(ZOOMS.indexOf(zoom) + 1) % ZOOMS.length];
    setZoom(next);
    const track = stream.current?.getVideoTracks()[0];
    if (track && hardwareZoom) await setCameraZoom(track, next);
  }

  function tapToFocus(e: React.MouseEvent<HTMLVideoElement>) {
    const track = stream.current?.getVideoTracks()[0];
    if (!track) return;
    const r = e.currentTarget.getBoundingClientRect();
    focusAt(track, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
  }

  // Shows the card in the middle of the screen; `sure` false asks "Is dit je kaart?".
  function showCard(data: { cards: ScanMatch[]; exact: boolean; read: string; language: string }, sure: boolean) {
    setPhoto(null);
    const language: Language = (LANGUAGES as readonly string[]).includes(data.language) ? (data.language as Language) : "EN";
    setPhase({ step: "done", cards: data.cards, exact: data.exact, read: data.read, language });
    navigator.vibrate?.(60);
    setFound(data.cards[0].name);
    paused.current = true;
    setPopupSure(sure);
    setChoices(data.cards.slice(0, 4));
    setVariant("normal");
    setPopup(data.cards[0]);
  }

  // The "Zoek deze code" button: look up the last code read, whatever it is.
  async function searchLastCode() {
    if (!lastCode) return;
    setDebug(`zoeken naar ${lastCode}…`);
    const res = await post(lastCode).catch(() => null);
    const data = res?.ok ? await res.json().catch(() => null) : null;
    if (data?.cards?.length) showCard(data, !!data.exact);
    else setDebug(`${lastCode}: ${res ? (res.ok ? "geen kaart gevonden" : `fout ${res.status}`) : "geen verbinding"}`);
  }

  // While the camera runs, keep reading the strip until a code finds the card:
  // no button to press, and a blurry frame just means the next one is tried.
  const zoomRef = useRef(screenZoom);
  zoomRef.current = screenZoom;
  useEffect(() => {
    if (!live) return;
    let active = true;
    let last = "";
    let lastSeenAt = 0;
    // The numbers read in the last frames: each frame is cleaned up differently and
    // often only one of those reads the code, so "read twice" counts recent frames,
    // not only the one just before.
    const recent: string[] = [];
    let posted = "";
    let missed = ""; // read clearly, but no card found for it
    let frame = 0;
    (async () => {
      const worker = await ocrWorker().catch(() => null);
      while (active && worker) {
        await new Promise((r) => setTimeout(r, 40));
        const v = video.current;
        if (!active || !v?.videoWidth || paused.current) continue;
        const how = CLEANUPS[frame++ % CLEANUPS.length];
        let text = "";
        try {
          // Set every time: a photo from the gallery reads with all letters in between.
          await worker.setParameters({ tessedit_char_whitelist: CODE_CHARS });
          text = (await worker.recognize(cleanUp(grabGuide(v, zoomRef.current), how))).data.text;
        } catch (e) {
          setDebug(`leesfout: ${e instanceof Error ? e.message : String(e)}`.slice(0, 80));
          continue; // one failed frame must not stop the scanning
        }
        if (!active) return;
        const line = text.replace(/\s+/g, " ").trim();
        const code = codeIn(line);
        if (line) setDebug(`gelezen: "${line.slice(0, 32)}"`);
        if (code) setLastCode(code);
        setSeen(
          !code ? "" : numbersOf(code) === missed ? `${code} · niet gevonden, houd de kaart stil of iets dichterbij` : `Code gelezen: ${code} · even stilhouden…`,
        );
        const numbers = code ? numbersOf(code) : "";
        recent.push(numbers);
        if (recent.length > 9) recent.shift();
        const steady = !!code && recent.filter((n) => n === numbers).length >= 2;
        // The card just shown is skipped while it stays in view, so it doesn't pop up
        // again at once; scanned again after it was away a moment, or a few seconds
        // later, it is shown again (the same card twice, or a second copy).
        if (last && numbers === last) {
          const now = Date.now();
          // (While the card was shown nothing was read: count from when it was closed.)
          const away = now - Math.max(lastSeenAt, closedAt.current) > 1500;
          lastSeenAt = now;
          if (!away && now - closedAt.current < 4000) continue;
          last = "";
          posted = "";
        }
        // Nothing read, or this exact text already looked up.
        if (!code || numbers === last || (code === posted && !steady)) continue;
        posted = code;
        // The whole line: the set code may stand apart from the number ("G SVIEN 047/198").
        const res = await post(line).catch(() => null);
        const data = res?.ok ? await res.json().catch(() => null) : null;
        if (!active) return;
        setDebug(`${code} → ${!res ? "geen verbinding" : !res.ok ? `fout ${res.status}` : `${data?.cards?.length ?? 0} kaart(en)${data?.exact ? ", precies" : ""}${data?.sure ? ", zeker" : ""}`}`);
        // Exactly one card: shown at once when the set code matched exactly, else
        // when read twice. Read twice but not one card: the best guess, as a question.
        const exact = !!data?.exact && (data.sure || steady);
        if (!data?.cards?.length || !(exact || steady)) {
          if (steady && data) missed = numbers;
          continue;
        }
        last = numbers;
        lastSeenAt = Date.now();
        showCard(data, exact);
      }
    })();
    return () => {
      active = false;
      setSeen("");
      closePopup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live]);

  // `onlyIfExact`: a first try, shown only when it found the one card.
  async function lookup(request: Promise<Response>, onlyIfExact = false) {
    setPhase({ step: "searching" });
    try {
      const res = await request;
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (onlyIfExact && !data.exact) return false;
      const language: Language = (LANGUAGES as readonly string[]).includes(data.language) ? data.language : "EN";
      setPhase({ step: "done", cards: data.cards, exact: data.exact, read: data.read, language });
      return data.exact as boolean;
    } catch (e) {
      if (onlyIfExact) return false;
      setPhase({ step: "error", message: e instanceof Error && e.message ? e.message : "Er ging iets mis. Probeer het opnieuw." });
      return false;
    }
  }

  const post = (text: string) =>
    fetch("/api/scan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    if (photo) URL.revokeObjectURL(photo);
    setPhoto(URL.createObjectURL(file));
    setPhase({ step: "reading", progress: 0 });
    try {
      let text = "";
      let done = 0;
      for (const [i, parts] of STEPS.entries()) {
        const before = done;
        text += "\n" + (await readParts(file, parts, (p) => setPhase({ step: "reading", progress: (before + p * parts.length) / PASSES })));
        done += parts.length;
        const last = i === STEPS.length - 1;
        if (await lookup(post(text), !last)) return;
        if (!last) setPhase({ step: "reading", progress: done / PASSES });
      }
    } catch {
      setPhase({ step: "error", message: "De foto kon niet gelezen worden. Probeer het opnieuw of typ de code." });
    }
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

      <div className={live ? "scan-frame live" : "scan-frame"}>
        {live ? (
          <>
            <video
              ref={video}
              className="scan-video"
              style={screenZoom > 1 ? { transform: `scale(${screenZoom})` } : undefined}
              playsInline
              muted
              onClick={tapToFocus}
            />
            <div className="scan-guide code" aria-hidden="true" />
            <div className="scan-howto">
              <svg width="30" height="42" viewBox="0 0 30 42" aria-hidden="true">
                <rect x="1" y="1" width="28" height="40" rx="3" fill="none" stroke="#fff" strokeWidth="2" />
                <rect x="3" y="34" width="14" height="5" rx="1.5" fill="#ffd84d" />
              </svg>
              <span>
                Houd het balkje boven de <strong>code linksonder</strong> op je kaart
                <br />
                bv. <strong>PFL EN 120/094</strong>
              </span>
            </div>
            <span className="scan-seen" role="status">
              {seen
                ? seen
                : found
                  ? `✓ ${found} gevonden · leg de volgende kaart neer`
                  : "Zoeken naar de code onderaan de kaart…"}
              {cameraInfo && <small>{cameraInfo}</small>}
              {debug && <small>{debug}</small>}
            </span>
            {popup && (() => {
              const language: Language = parseRef(popup.ref).region === "ja" ? "JP" : phase.step === "done" ? phase.language : "EN";
              // On the page itself, so no part of the scan page can clip or cover it.
              return createPortal(
                <div className="scan-popup-backdrop">
                  <div className="scan-popup" role="dialog" aria-label="Kaart gevonden">
                    <div className="scan-popup-card">
                      <div className="tile-img">
                        <CardImg src={popup.image} name={popup.name} code={popup.code} />
                      </div>
                      <div className="scan-popup-info">
                        <span className="scan-popup-found">{popupSure ? "✓ Gevonden" : "Is dit je kaart?"}</span>
                        <strong>{popup.name}</strong>
                        <span className="tile-meta">{popup.code} · {LANGUAGE_NAMES[language]}</span>
                      </div>
                    </div>
                    <div className="scan-popup-pick seg-cond" role="group" aria-label="Staat van de kaart">
                      {CONDITIONS.map((c) => (
                        <button key={c.code} type="button" title={c.name} aria-pressed={c.code === condition} className={c.code === condition ? "chip on" : "chip"} onClick={() => setCondition(c.code)}>
                          {c.code}
                        </button>
                      ))}
                    </div>
                    <div className="scan-popup-pick seg-ver" role="group" aria-label="Versie">
                      {(Object.keys(VARIANT_NAMES) as Variant[]).map((v) => (
                        <button key={v} type="button" aria-pressed={v === variant} className={v === variant ? "chip on" : "chip"} onClick={() => setVariant(v)}>
                          {VARIANT_NAMES[v]}
                        </button>
                      ))}
                    </div>
                    {!popupSure && choices.length > 1 && (
                      <div className="scan-popup-choices">
                        <span>Of is het:</span>
                        {choices.filter((c) => c.ref !== popup.ref).map((c) => (
                          <button key={c.ref} type="button" className="chip" onClick={() => setPopup(c)}>
                            {c.name} · {c.code}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="scan-popup-actions">
                      <button type="button" className="btn btn-primary" onClick={() => { add(popup.ref, variant, language, condition); closePopup(); }}>
                        Toevoegen
                      </button>
                      <button type="button" className="btn" onClick={closePopup}>Volgende kaart</button>
                    </div>
                  </div>
                </div>,
                document.body,
              );
            })()}
            <button type="button" className="scan-zoom" onClick={changeZoom} aria-label={`Zoom ${zoom}×, tik voor meer`}>
              {zoom}×
            </button>
          </>
        ) : photo ? <img src={photo} alt="Jouw foto" /> : (
          <div className="scan-empty">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" />
              <rect x="8" y="7" width="8" height="10" rx="1" />
            </svg>
            <span>Leg de kaart plat op tafel en houd je telefoon er recht boven. Zorg dat de code linksonder (bv. 30C 100/128) scherp is.</span>
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
      {live && lastCode && !popup && (
        <button type="button" className="btn btn-primary scan-search" onClick={searchLastCode}>
          Zoek {lastCode}
        </button>
      )}
      <div className="scan-actions">
        {live ? (
          <>
            <button type="button" className="btn" onClick={stopCamera}>Stoppen</button>
            <button type="button" className="btn" onClick={() => { stopCamera(); gallery.current?.click(); }}>
              Kies uit galerij
            </button>
          </>
        ) : (
          <>
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => startCamera()}>
              {photo ? "Nieuwe scan" : "Start camera"}
            </button>
            <button type="button" className="btn" disabled={busy} onClick={() => gallery.current?.click()}>
              Kies uit galerij
            </button>
          </>
        )}
      </div>

      {phase.step === "error" && <p className="muted">{phase.message}</p>}

      {phase.step === "done" && (
        <section className="scan-results" ref={results}>
          <p className="muted">
            Gelezen: <strong>{phase.read}</strong>.{" "}
            {phase.cards.length === 0
              ? "Geen kaart herkend. Maak een scherpere foto van dichtbij, of typ hieronder de code die linksonder op de kaart staat (bv. 30C 100)."
              : phase.exact ? "Is dit je kaart?" : "Welke is het? Staat hij er niet tussen, typ dan de code hieronder."}
          </p>
          {phase.cards.length > 0 && (
            <label className="scan-condition">
              Staat van de kaart
              <select value={condition} onChange={(e) => setCondition(e.target.value as Condition)}>
                {CONDITIONS.map((c) => (
                  <option key={c.code} value={c.code}>{c.code} · {c.name}</option>
                ))}
              </select>
            </label>
          )}
          {phase.cards.map((c) => {
            const japanese = parseRef(c.ref).region === "ja";
            const language: Language = japanese ? "JP" : phase.language;
            const owned = entries.find((e) => e.key === entryKey(c.ref, "normal", language, condition));
            return (
              <div key={c.ref} className="scan-match">
                <Link href={cardHref(c.ref)} className="tile-img scan-thumb">
                  <CardImg src={c.image} name={c.name} code={c.code} />
                </Link>
                <div className="scan-info">
                  <strong>{c.name}</strong>
                  <span className="tile-meta">{c.code} · {LANGUAGE_NAMES[language]} · {condition}</span>
                  {owned ? (
                    <span className="scan-added">
                      ✓ {owned.quantity}× in je collectie · <Link href={cardHref(c.ref)}>taal, versie of staat wijzigen</Link>
                    </span>
                  ) : null}
                </div>
                <button type="button" className="btn btn-primary scan-add" onClick={() => add(c.ref, "normal", language, condition)}>
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
