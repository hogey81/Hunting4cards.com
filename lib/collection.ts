"use client";

import { useCallback, useEffect, useState } from "react";
import type { Variant } from "./prices";

// For now the collection lives on the device. Accounts and sync can come later.

// Languages you can pick for an international card. Japanese cards are separate
// cards (their own sets and numbers) and are always stored as "JP".
export const LANGUAGES = ["EN", "NL", "DE", "FR"] as const;
export type Language = (typeof LANGUAGES)[number] | "JP";

export type CollectionEntry = {
  key: string;
  cardId: string;
  variant: Variant;
  language: Language;
  quantity: number;
  addedAt: string;
};

const STORAGE_KEY = "h4c.collection.v1";
const EVENT = "h4c-collection";

export function entryKey(cardId: string, variant: Variant, language: Language) {
  return `${cardId}|${variant}|${language}`;
}

function read(): CollectionEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
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

  const add = useCallback((cardId: string, variant: Variant, language: Language, quantity = 1) => {
    const all = read();
    const key = entryKey(cardId, variant, language);
    const existing = all.find((e) => e.key === key);
    if (existing) existing.quantity += quantity;
    else all.push({ key, cardId, variant, language, quantity, addedAt: new Date().toISOString() });
    write(all);
  }, []);

  const setQuantity = useCallback((key: string, quantity: number) => {
    const all = read();
    write(quantity <= 0 ? all.filter((e) => e.key !== key) : all.map((e) => (e.key === key ? { ...e, quantity } : e)));
  }, []);

  return { entries, loaded, add, setQuantity };
}
