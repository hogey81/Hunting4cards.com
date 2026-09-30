"use client";

import { useState } from "react";

// Shows the card picture, or a clean placeholder when TCGdex has no image
// (common for the newest sets) or the image fails to load.
export default function CardImg({ src, name, code, eager }: { src: string | null; name: string; code?: string; eager?: boolean }) {
  // Remembers which picture failed, so moving on to the next card tries again.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (!src || failedSrc === src) {
    return (
      <span className="card-missing" role="img" aria-label={`${name}, geen afbeelding beschikbaar`}>
        <strong>{name}</strong>
        {code && <span>{code}</span>}
        <small>Nog geen afbeelding</small>
      </span>
    );
  }
  return <img src={src} alt={name} loading={eager ? "eager" : "lazy"} onError={() => setFailedSrc(src)} />;
}
