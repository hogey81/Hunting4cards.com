"use client";

import { useCallback, useEffect, useState } from "react";
import type { Variant } from "./prices";

// For now the collection lives on the device. Accounts and sync can come later.

// Languages you can pick for an international card. Japanese cards are separate
// cards (their own sets and numbers) and are always stored as "JP".
export const LANGUAGES = ["EN", "NL", "DE", "FR", "IT", "ES", "PT"] as const;
export type Language = (typeof LANGUAGES)[number] | "JP";

// Card condition, on Cardmarket's scale.
export const CONDITIONS = [
  { code: "MT", name: "Mint", hint: "Perfect, rechtstreeks uit het pakje" },
  { code: "NM", name: "Near Mint", hint: "Bijna perfect, hooguit een piepklein foutje" },
  { code: "EX", name: "Excellent", hint: "Licht gebruikt, kleine witte randjes of krasjes" },
  { code: "GD", name: "Good", hint: "Duidelijk gebruikt, randen en hoeken wat versleten" },
  { code: "LP", name: "Light Played", hint: "Flink gespeeld, zichtbare slijtage" },
  { code: "PL", name: "Played", hint: "Zwaar gebruikt, maar nog heel" },
  { code: "PO", name: "Poor", hint: "Beschadigd: vouw, scheur of waterschade" },
] as const;
export type Condition = (typeof CONDITIONS)[number]["code"];
export const conditionName = (c: Condition) => CONDITIONS.find((x) => x.code === c)?.name ?? c;

export type CollectionEntry = {
  key: string;
  cardId: string;
  variant: Variant;
  language: Language;
  condition: Condition;
  quantity: number;
  addedAt: string;
};

const STORAGE_KEY = "h4c.collection.v1";
const EVENT = "h4c-collection";

export function entryKey(cardId: string, variant: Variant, language: Language, condition: Condition) {
  return `${cardId}|${variant}|${language}|${condition}`;
}

function read(): CollectionEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    // Cards added before conditions existed count as Near Mint.
    return parsed.map((e: CollectionEntry) =>
      e.condition ? e : { ...e, condition: "NM", key: entryKey(e.cardId, e.variant, e.language, "NM") },
    );
  } catch {
    return [];
  }
}

// The condition picked last time is the likeliest for the next card
// (most people add a pile of cards in the same state).
const CONDITION_KEY = "h4c.condition";
export function lastCondition(): Condition {
  try {
    const c = localStorage.getItem(CONDITION_KEY);
    if (CONDITIONS.some((x) => x.code === c)) return c as Condition;
  } catch {}
  return "NM";
}
export function rememberCondition(c: Condition) {
  try {
    localStorage.setItem(CONDITION_KEY, c);
  } catch {}
}

function write(entries: CollectionEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Storage full or blocked: keep working in memory.
  }
  window.dispatchEvent(new Event(EVENT));
}

export function useCollection() {
  const [entries, setEntries] = useState<CollectionEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const sync = () => setEntries(read());
    sync();
    setLoaded(true);
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const add = useCallback((cardId: string, variant: Variant, language: Language, condition: Condition, quantity = 1) => {
    const all = read();
    const key = entryKey(cardId, variant, language, condition);
    const existing = all.find((e) => e.key === key);
    if (existing) existing.quantity += quantity;
    else all.push({ key, cardId, variant, language, condition, quantity, addedAt: new Date().toISOString() });
    rememberCondition(condition);
    write(all);
  }, []);

  const setQuantity = useCallback((key: string, quantity: number) => {
    const all = read();
    write(quantity <= 0 ? all.filter((e) => e.key !== key) : all.map((e) => (e.key === key ? { ...e, quantity } : e)));
  }, []);

  return { entries, loaded, add, setQuantity };
}
