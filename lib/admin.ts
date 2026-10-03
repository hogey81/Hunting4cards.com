"use client";

import { supabase } from "./account";

// The numbers behind /beheer (supabase/admin-stats.sql). Only admins get them.
export type AdminStats = {
  users: number;
  new_today: number;
  new_30d: number;
  active_today: number;
  active_30d: number;
  collections: number;
  cards: number;
  db_bytes: number;
  mails_today: number | null;
  mails_month: number | null;
  at: string;
};

export async function adminStats(): Promise<{ stats?: AdminStats; denied?: boolean; error?: boolean }> {
  const sb = supabase();
  if (!sb) return { error: true };
  const { data, error } = await sb.rpc("admin_stats");
  if (!error) return { stats: data as AdminStats };
  return error.code === "42501" ? { denied: true } : { error: true };
}

// Free plan limits, as of October 2026. Check the providers' price pages when one gets close.
export const LIMITS = {
  mailsPerDay: 100, // Resend
  mailsPerMonth: 3000, // Resend
  activeUsersPerMonth: 50000, // Supabase
  databaseBytes: 500 * 1024 * 1024, // Supabase
};

// Last day the daily job saved prices (supabase/price-history.sql), and how many.
export async function priceHistoryStatus(): Promise<{ day: string; count: number } | null> {
  const sb = supabase();
  if (!sb) return null;
  const { data } = await sb.from("price_history").select("day").order("day", { ascending: false }).limit(1);
  const day = data?.[0]?.day as string | undefined;
  if (!day) return null;
  const { count } = await sb.from("price_history").select("*", { count: "exact", head: true }).eq("day", day);
  return { day, count: count ?? 0 };
}
