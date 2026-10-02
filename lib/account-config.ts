// Online accounts (Supabase). Set ACCOUNTS_ENABLED to false to switch login off:
// the app then works as before, with the collection only on the device.
export const ACCOUNTS_ENABLED: boolean = true;

// Both values are public by design (they ship to every browser). The database only
// lets a signed-in user read and write their own row (row level security).
export const SUPABASE_URL: string = "https://vtllviqpmebgnkpupcah.supabase.co";
export const SUPABASE_KEY: string = "sb_publishable_asGMu1qx7ZFotjBK1aBcZw_BYUvrae3";

// Supabase's own mail service sends a sign-in link and its text can't be changed.
// With our own mail service (custom SMTP) the mail can show a 6-digit code instead,
// which works better inside the Android app: then set this to true.
export const LOGIN_WITH_CODE: boolean = false;

export const accountsOn = () => ACCOUNTS_ENABLED && !!SUPABASE_URL && !!SUPABASE_KEY;
