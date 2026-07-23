"use client";
// docs/features/shot-editor.md: "A/B compare two takes side by side" (REQ-STB-021).
import { useEffect, useRef, useState } from "react";

interface TakeOpt {
  id: string;
  videoAssetId: string;
  label: string;
}

export function ABCompare({ takes }: { takes: TakeOpt[] }) {
  const [open, setOpen] = useState(false);
  const [aId, setAId] = useState(takes[0]?.id ?? "");
  const [bId, setBId] = useState(takes[1]?.id ?? "");
  const aRef = useRef<HTMLVideoElement>(null);
  const bRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (takes.length < 2) return null;
  const a = takes.find((t) => t.id === aId) ?? takes[0]!;
  const b = takes.find((t) => t.id === bId) ?? takes[1]!;

  const playBoth = () => {
    for (const v of [aRef.current, bRef.current]) {
      if (v) {
        v.currentTime = 0;
        void v.play();
      }
    }
  };

  const sel = (value: string, onChange: (v: string) => void) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="mono"
      style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 6, padding: "4px 7px", color: "var(--ink)", fontSize: 11 }}
    >
      {takes.map((t) => (
        <option key={t.id} value={t.id}>{t.label}</option>
      ))}
    </select>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mono"
        title="Compare two takes side by side"
        style={{ background: "none", border: "1px solid var(--line)", borderRadius: 6, padding: "3px 8px", color: "var(--ink-2)", fontSize: 10, cursor: "pointer" }}
      >
        ⇆ A/B compare
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="A/B take comparison (Escape closes)"
          style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(5,6,9,.92)", display: "grid", placeItems: "center", padding: 24 }}
        >
          <div style={{ maxWidth: "94vw" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
              <p className="mono muted" style={{ fontSize: 11 }}>A/B COMPARE</p>
              {sel(a.id, setAId)}
              <span className="mono muted">vs</span>
              {sel(b.id, setBId)}
              <button type="button" onClick={playBoth} className="mono" style={{ background: "var(--accent)", border: "none", borderRadius: 6, padding: "4px 12px", color: "#12151b", fontWeight: 600, fontSize: 11, cursor: "pointer" }}>▶ play both</button>
              <button type="button" onClick={() => setOpen(false)} className="mono" style={{ marginLeft: "auto", background: "none", border: "1px solid var(--line)", borderRadius: 6, padding: "4px 10px", color: "var(--ink)", fontSize: 11, cursor: "pointer" }}>✕ close</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[{ t: a, ref: aRef }, { t: b, ref: bRef }].map(({ t, ref }, i) => (
                <figure key={i} style={{ margin: 0 }}>
                  <video ref={ref} src={`/api/assets/${t.videoAssetId}`} controls playsInline style={{ width: "100%", borderRadius: 8, border: "1px solid var(--line)", background: "#000" }} />
                  <figcaption className="mono muted" style={{ fontSize: 10, marginTop: 4 }}>{i === 0 ? "A" : "B"} · {t.label}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
