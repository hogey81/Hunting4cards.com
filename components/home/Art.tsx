// Small illustrations for the home tiles. Drawn for this app; no official artwork.

export function CardsArt() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden="true">
      <g transform="rotate(14 96 70)">
        <rect x="70" y="18" width="40" height="56" rx="7" fill="#3478BD" />
        <circle cx="90" cy="46" r="10" fill="none" stroke="#fff" strokeOpacity=".5" strokeWidth="3" />
      </g>
      <g transform="rotate(4 76 70)">
        <rect x="50" y="16" width="40" height="56" rx="7" fill="#F5C73A" />
        <circle cx="70" cy="44" r="10" fill="none" stroke="#fff" strokeOpacity=".6" strokeWidth="3" />
      </g>
      <g transform="rotate(-8 50 70)">
        <rect x="28" y="20" width="40" height="56" rx="7" fill="#C8332A" />
        <circle cx="48" cy="48" r="10" fill="none" stroke="#fff" strokeOpacity=".6" strokeWidth="3" />
        <path d="M38 48h20" stroke="#fff" strokeOpacity=".6" strokeWidth="3" />
      </g>
    </svg>
  );
}

export function ChartArt({ down = false }: { down?: boolean }) {
  const up = ["#C8332A", "#E0822F", "#F5C73A", "#3478BD"];
  return (
    <svg viewBox="0 0 120 80" aria-hidden="true">
      {up.map((c, i) => (
        <polyline
          key={c}
          points={down ? `${10 + i * 6},${12 + i * 7} 45,${40 + i * 7} 70,${28 + i * 7} 115,${62 + i * 5}` : `${10 + i * 6},${70 - i * 3} 45,${40 + i * 7} 70,${54 + i * 5} 115,${10 + i * 7}`}
          fill="none"
          stroke={c}
          strokeWidth="6"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}

export function SetsArt() {
  const colors = ["#C8332A", "#F5C73A", "#3478BD", "#44904A", "#8E4FAE", "#E0822F"];
  return (
    <svg viewBox="0 0 120 80" aria-hidden="true">
      {colors.map((c, i) => (
        <rect key={c} x={48 + (i % 3) * 24} y={14 + Math.floor(i / 3) * 30} width="20" height="26" rx="4" fill={c} transform={`rotate(${i % 2 ? 6 : -6} ${58 + (i % 3) * 24} ${27 + Math.floor(i / 3) * 30})`} />
      ))}
    </svg>
  );
}

export function JapanArt() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden="true">
      <rect x="54" y="12" width="52" height="66" rx="8" fill="#fff" stroke="#DDD7CB" strokeWidth="2" transform="rotate(8 80 45)" />
      <circle cx="80" cy="44" r="15" fill="#C8332A" transform="rotate(8 80 45)" />
    </svg>
  );
}

export function SearchArt() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden="true">
      <rect x="30" y="34" width="84" height="30" rx="15" fill="#1B1B22" />
      <text x="72" y="54" textAnchor="middle" fontFamily="system-ui, sans-serif" fontSize="14" fontWeight="800" fill="#F5C73A">PBL 048</text>
    </svg>
  );
}
