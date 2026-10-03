// Shown the moment a link is tapped, while the next page is still coming from the
// server (used by the loading.tsx files). Shaped like the page that is on its way.
export default function PageLoading({ kind }: { kind: "card" | "grid" | "list" }) {
  return (
    <div className="skel-page" aria-busy="true" aria-label="Laden">
      <div className="skel skel-back" />
      <div className="skel skel-title" />
      {kind === "card" && (
        <>
          <div className="skel skel-card" />
          <div className="skel skel-line" />
          <div className="skel skel-line short" />
        </>
      )}
      {kind === "grid" && (
        <div className="grid">
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="skel skel-tile" />
          ))}
        </div>
      )}
      {kind === "list" && (
        <div className="list">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="skel skel-row" />
          ))}
        </div>
      )}
    </div>
  );
}
