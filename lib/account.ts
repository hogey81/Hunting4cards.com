"use client";

import { useEffect, useState } from "react";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { SUPABASE_KEY, SUPABASE_URL, accountsOn } from "./account-config";
import { CHANGED_KEY, COLLECTION_EVENT, read, write, type CollectionEntry } from "./collection";

let client: SupabaseClient | null = null;
export function supabase() {
  if (!accountsOn()) return null;
  client ??= createClient(SUPABASE_URL, SUPABASE_KEY);
  return client;
}

// Which account this device last copied the collection with, and when.
const SYNC_USER = "h4c.sync.user";
const SYNC_AT = "h4c.sync.at";

const get = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const set = (k: string, v: string | null) => {
  try {
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  } catch {}
};

// Both sides kept: the higher quantity and the earliest added date win.
export function mergeEntries(a: CollectionEntry[], b: CollectionEntry[]) {
  const byKey = new Map(a.map((e) => [e.key, { ...e }]));
  for (const e of b) {
    const mine = byKey.get(e.key);
    if (!mine) byKey.set(e.key, { ...e });
    else {
      mine.quantity = Math.max(mine.quantity, e.quantity);
      if (e.addedAt < mine.addedAt) mine.addedAt = e.addedAt;
    }
  }
  return [...byKey.values()];
}

async function push(user: User, entries: CollectionEntry[]) {
  const sb = supabase();
  if (!sb) return;
  const at = new Date().toISOString();
  const { error } = await sb.from("collections").upsert({ user_id: user.id, entries, updated_at: at });
  if (!error) {
    set(SYNC_USER, user.id);
    set(SYNC_AT, at);
  }
}

// Brings this device and the account in line.
async function pull(user: User) {
  const sb = supabase();
  if (!sb) return;
  const { data, error } = await sb.from("collections").select("entries, updated_at").eq("user_id", user.id).maybeSingle();
  if (error) return;
  const local = read();
  const remote: CollectionEntry[] = Array.isArray(data?.entries) ? data.entries : [];
  const syncedAt = get(SYNC_AT) ?? "";
  const localChanged = (get(CHANGED_KEY) ?? "") > syncedAt;
  const remoteChanged = !!data && data.updated_at > syncedAt;

  if (get(SYNC_USER) !== user.id) {
    // First time with this account on this device: keep the cards from both.
    const merged = mergeEntries(remote, local);
    write(merged, true);
    await push(user, merged);
  } else if (remoteChanged && localChanged) {
    const merged = mergeEntries(remote, local);
    write(merged, true);
    await push(user, merged);
  } else if (remoteChanged) {
    write(remote, true);
    set(SYNC_AT, data!.updated_at);
  } else if (localChanged || !data) {
    await push(user, local);
  }
}

export function useAccount() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const sb = supabase();
    if (!sb) {
      setReady(true);
      return;
    }
    sb.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setReady(true);
    });
    const { data } = sb.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);
  return { enabled: accountsOn(), user, ready };
}

export async function sendCode(email: string) {
  const sb = supabase();
  if (!sb) return "Inloggen staat uit.";
  // The link brings you back to the account page of the site you asked it from.
  const emailRedirectTo = `${window.location.origin}/account`;
  const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: true, emailRedirectTo } });
  if (!error) return null;
  return error.status === 429 ? "Er zijn net te veel codes verstuurd. Probeer het over een tijdje opnieuw." : "De code kon niet worden verstuurd. Klopt het e-mailadres?";
}

export async function verifyCode(email: string, code: string) {
  const sb = supabase();
  if (!sb) return "Inloggen staat uit.";
  const { error } = await sb.auth.verifyOtp({ email, token: code, type: "email" });
  return error ? "Die code klopt niet of is verlopen." : null;
}

// The button in the email: /account?token_hash=…&type=email signs you in directly.
export async function verifyLink(tokenHash: string) {
  const sb = supabase();
  if (!sb) return "Inloggen staat uit.";
  const { error } = await sb.auth.verifyOtp({ token_hash: tokenHash, type: "email" });
  return error ? "Deze inloglink is verlopen of al gebruikt. Vraag een nieuwe aan." : null;
}

// Deletes the account and its online collection for good (supabase/delete-account.sql),
// then clears this device like a logout.
export async function deleteAccount() {
  const sb = supabase();
  if (!sb) return "Inloggen staat uit.";
  const { error } = await sb.rpc("delete_my_account");
  if (error) return "Je account kon niet worden verwijderd. Probeer het later opnieuw.";
  await signOut();
  return null;
}

export async function signOut() {
  const sb = supabase();
  if (!sb) return;
  await sb.auth.signOut();
  // The cards are safe in the account; leave nothing behind on a shared device.
  write([], true);
  set(SYNC_USER, null);
  set(SYNC_AT, null);
  set(CHANGED_KEY, null);
}

// Mounted once in the layout: keeps the account and the device in line.
export function AccountSync() {
  const { user } = useAccount();
  useEffect(() => {
    if (!user) return;
    pull(user);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onChange = (e: Event) => {
      if ((e as CustomEvent).detail?.fromSync) return;
      clearTimeout(timer);
      timer = setTimeout(() => push(user, read()), 800);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") pull(user);
    };
    window.addEventListener(COLLECTION_EVENT, onChange);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(timer);
      window.removeEventListener(COLLECTION_EVENT, onChange);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [user]);
  return null;
}
