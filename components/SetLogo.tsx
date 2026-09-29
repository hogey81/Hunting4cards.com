"use client";

import { useState } from "react";

// The set logo, falling back to the set symbol and then to the set code
// when TCGdex has no image (or it fails to load). With code null it shows nothing.
export default function SetLogo({ sources, code, className }: { sources: (string | null)[]; code: string | null; className?: string }) {
  const urls = sources.filter((s): s is string => !!s);
  const [index, setIndex] = useState(0);
  if (index >= urls.length) return code ? <span className="set-logo-code">{code}</span> : null;
  return <img src={urls[index]} alt="" className={className} onError={() => setIndex((i) => i + 1)} />;
}
