"use client";

import { useCollection } from "@/lib/collection";

export default function SetProgress({ setId, total }: { setId: string; total: number }) {
  const { entries } = useCollection();
  const owned = new Set(entries.filter((e) => e.cardId.startsWith(`${setId}-`)).map((e) => e.cardId)).size;
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
