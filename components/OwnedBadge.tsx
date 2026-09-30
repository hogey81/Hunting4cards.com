"use client";

import { useCollection } from "@/lib/collection";

// Marks a card you already have: a light grey veil over the image, a check mark
// and how many you have.
export default function OwnedBadge({ cardId }: { cardId: string }) {
  const { entries } = useCollection();
  const n = entries.filter((e) => e.cardId === cardId).reduce((s, e) => s + e.quantity, 0);
  if (n === 0) return null;
  return (
    <>
      <div className="owned-veil" aria-hidden="true" />
      <div className="owned-check" role="img" aria-label="In je collectie">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </div>
      <span className="qty">{n}×</span>
    </>
  );
}
