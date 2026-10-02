// Files bigger than Next's fetch cache allows (2 MB) are kept in memory instead,
// like Cardmarket's price guide in lib/cardmarket.ts.
const cache = new Map<string, { at: number; value: Promise<unknown> }>();

export function bigJson<T>(url: string, maxAgeMs: number): Promise<T | null> {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < maxAgeMs) return hit.value as Promise<T | null>;
  const value = fetch(url, { cache: "no-store", headers: { "User-Agent": "Hunting4Cards/1.0 (+https://www.hunting4cards.com)" } })
    .then((res) => (res.ok ? (res.json() as Promise<T>) : null))
    .catch(() => null);
  cache.set(url, { at: Date.now(), value });
  // A failed download is tried again on the next request.
  value.then((v) => {
    if (v == null && cache.get(url)?.value === value) cache.delete(url);
  });
  return value;
}
