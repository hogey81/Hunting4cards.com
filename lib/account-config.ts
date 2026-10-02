// Online accounts (Supabase). Set ACCOUNTS_ENABLED to false to switch login off:
// the app then works as before, with the collection only on the device.
export const ACCOUNTS_ENABLED: boolean = true;

// Both values are public by design (they ship to every browser). The database only
// lets a signed-in user read and write their own row (row level security).
export const SUPABASE_URL: string = "https://vtllviqpmebgnkpupcah.supabase.co";
export const SUPABASE_KEY: string = "sb_publishable_asGMu1qx7ZFotjBK1aBcZw_BYUvrae3";

export const accountsOn = () => ACCOUNTS_ENABLED && !!SUPABASE_URL && !!SUPABASE_KEY;
