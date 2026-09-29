"use client";

import { useCollection } from "@/lib/collection";

// prefix is the start of the card references in this set, e.g. "me05-" or "ja:M4-".
export default function SetProgress({ prefix, total }: { prefix: string; total: number }) {
  const { entries } = useCollection();
  const owned = new Set(entries.filter((e) => e.cardId.startsWith(prefix)).map((e) => e.cardId)).size;
  const pct = total ? Math.min(100, Math.round((owned / total) * 100)) : 0;
  return (
    <>
      <div className="bar" aria-hidden="true">
        <div style={{ width: `${pct}%` }} />
      </div>
      <div className="bar-label">
        <span>
          {owned} van {total} kaarten
        </span>
        <span>{pct}%</span>
      </div>
    </>
  );
}
