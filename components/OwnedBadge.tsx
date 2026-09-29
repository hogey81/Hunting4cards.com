"use client";

import { useCollection } from "@/lib/collection";

export default function OwnedBadge({ cardId }: { cardId: string }) {
  const { entries } = useCollection();
  const n = entries.filter((e) => e.cardId === cardId).reduce((s, e) => s + e.quantity, 0);
  return n > 0 ? <span className="qty">{n}×</span> : null;
}
