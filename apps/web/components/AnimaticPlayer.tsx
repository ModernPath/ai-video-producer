"use client";
// REQ-ASM-009 — client-side animatic: selected frames × shot durations. Zero server cost.
import { useEffect, useRef, useState } from "react";
import { buildCues, cueAtTime, type AnimaticShot } from "@avd/asm/animatic";

export function AnimaticPlayer({ shots, musicAssetId }: { shots: AnimaticShot[]; musicAssetId?: string | null }) {
  const [open, setOpen] = useState(false);
  const [t, setT] = useState(0);
  const raf = useRef<number | null>(null);
  const startedAt = useRef(0);
  const cues = buildCues(shots);
  const cue = cueAtTime(cues, t);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!open) return;
    startedAt.current = performance.now();
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      void audioRef.current.play().catch(() => {});
    }
    const tick = (now: number) => {
      const elapsed = (now - startedAt.current) / 1000;
      setT(elapsed);
      if (elapsed < cues.total) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      audioRef.current?.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return; // don't hijack typing (found via E2E)
      if (e.code === "Space" && !open && cues.items.length) {
        e.preventDefault();
        setOpen(true);
      }
      if (e.code === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, cues.items.length]);

  if (!cues.items.length) return null;

  return (
    <>
      <button
        onClick={() => { setT(0); setOpen(true); }}
        style={{ background: "transparent", border: "1px solid var(--line)", borderRadius: 7, padding: "6px 12px", color: "var(--ink)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
        title="Play animatic (space)"
      >
        ▶ Animatic <span className="mono" style={{ fontWeight: 400, color: "var(--ink-2)" }}>{cues.total.toFixed(0)}s</span>
      </button>

      {open && musicAssetId && <audio ref={audioRef} src={`/api/assets/${musicAssetId}`} />}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(8,10,14,.92)", zIndex: 50, display: "grid", placeItems: "center" }}
        >
          <div style={{ width: "min(960px, 92vw)" }} onClick={(e) => e.stopPropagation()}>
            {cue ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/assets/${cue.frameAssetId}`}
                  alt={cue.title}
                  style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", borderRadius: 10, border: "1px solid var(--line)" }}
                />
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 12 }}>
                  <span className="mono" style={{ fontSize: 12, color: "var(--accent)" }}>{cue.title}</span>
                  <span className="mono muted" style={{ fontSize: 12, marginLeft: "auto" }}>
                    {Math.min(t, cues.total).toFixed(1)}s / {cues.total.toFixed(0)}s
                  </span>
                </div>
                <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
                  {cues.items.map((c) => {
                    const fill = Math.max(0, Math.min(1, (t - c.startS) / c.durationS));
                    return (
                      <div key={c.shotId} style={{ flex: c.durationS, height: 4, borderRadius: 2, background: "var(--line)", overflow: "hidden" }}>
                        <div style={{ width: `${fill * 100}%`, height: "100%", background: "var(--accent)" }} />
                      </div>
                    );
                  })}
                </div>
                {cues.skipped.length > 0 && (
                  <p className="mono muted" style={{ fontSize: 11, marginTop: 8 }}>skipped (no frame): {cues.skipped.join(", ")}</p>
                )}
              </>
            ) : (
              <div style={{ textAlign: "center" }}>
                <p className="disp" style={{ fontSize: 20 }}>End of animatic</p>
                <button
                  onClick={() => { setT(0); startedAt.current = performance.now(); }}
                  style={{ marginTop: 12, background: "var(--accent)", color: "#12151b", border: "none", borderRadius: 7, padding: "7px 14px", fontWeight: 600, cursor: "pointer" }}
                >
                  ↺ Replay
                </button>
                <button onClick={() => setOpen(false)} style={{ marginLeft: 8, background: "transparent", border: "1px solid var(--line)", borderRadius: 7, padding: "7px 14px", color: "var(--ink)", cursor: "pointer" }}>
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
