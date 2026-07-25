"use client";
// REQ-STB-039 (USER 2026-07-25): "see the music timing within the clips, like traditional video
// editors do… if I e.g. add new clip, it might outsync the video."
//
// A real time axis under the command bar: clips to scale, music section changes as ticks across
// them, drift called out, click a clip to focus it.
//
// Scaling: the axis follows the CUT, not the track. A 2:55 track against a 0:27 cut squeezed every
// clip into 15% of the width (browser check, Neon Rivers) — so leftover track is only drawn to
// scale up to a third of the cut, then collapses into a labelled tail.
import React, { useState } from "react";
import type { Timeline as TimelineModel } from "@avd/stb/timeline";

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

/** Drop labels that would collide (< 5% of the axis apart). */
function thinLabels(values: number[], span: number): number[] {
  const kept: number[] = [];
  for (const v of values) {
    if (v > span) continue;
    if (kept.length && (v - kept[kept.length - 1]!) / span < 0.05) continue;
    kept.push(v);
  }
  return kept;
}

export function Timeline({
  model, focusedId, onFocus, onMove, statusById,
}: {
  model: TimelineModel;
  focusedId: string | null;
  onFocus: (shotId: string) => void;
  /** REQ-STB-038: drag a clip along the timeline to reorder it. */
  onMove: (shotId: string, toIndex: number) => void | Promise<void>;
  statusById: Record<string, "planned" | "framed" | "generated">;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropIdx, setDropIdx] = useState<number | null>(null);
  const cut = model.cutDurationS || 1;
  const leftover = model.driftS !== null && model.driftS < 0 ? Math.abs(model.driftS) : 0;
  const drawnLeftover = Math.min(leftover, cut * 0.33); // the rest collapses into a tail chip
  const collapsed = leftover - drawnLeftover;
  const span = cut + drawnLeftover;
  const pct = (s: number) => `${(s / span) * 100}%`;
  const hasTrack = model.trackDurationS !== null;
  const overrun = model.driftS !== null && model.driftS > 0 ? model.driftS : 0;

  return (
    <div style={{ borderBottom: "1px solid var(--line)", background: "var(--panel)", padding: "7px 16px 9px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 5, flexWrap: "wrap" }}>
        <p className="mono muted" style={{ fontSize: 9, letterSpacing: ".12em" }}>TIMELINE</p>
        <span className="mono" style={{ fontSize: 10 }}>cut <b>{mmss(model.cutDurationS)}</b></span>
        {hasTrack && (
          <>
            <span className="mono muted" style={{ fontSize: 10 }}>track {mmss(model.trackDurationS!)}</span>
            {overrun >= 0.5 && (
              <span className="mono" style={{ fontSize: 10, color: "#e0763a" }}
                title="The cut runs past the end of the track — the tail plays without music">
                ▲ cut runs {overrun}s past the track
              </span>
            )}
            {leftover >= 0.5 && (
              <span className="mono" style={{ fontSize: 10, color: "var(--accent)" }}
                title="The track is longer than the cut — music/mix exports fade out at the cut end">
                ◂ {leftover}s of track unused
              </span>
            )}
          </>
        )}
        {model.boundaries.length > 0 && (
          <span className="mono muted" style={{ fontSize: 10 }} title="Cuts that do not land on a section change of the track">
            {model.desyncedCount === 0
              ? "✓ every cut on a section change"
              : `${model.desyncedCount}/${model.blocks.length} cuts off the beat`}
          </span>
        )}
        {!hasTrack && <span className="mono muted" style={{ fontSize: 9.5 }}>no track attached — open the Music panel</span>}
      </div>

      {/* clips to scale */}
      <div style={{ position: "relative", display: "flex", height: 30, gap: 2, alignItems: "stretch" }}>
        {model.blocks.map((b, i) => {
          const st = statusById[b.id] ?? "planned";
          const active = focusedId === b.id;
          const share = b.durationS / span;
          return (
            <button
              key={b.id}
              onClick={() => onFocus(b.id)}
              draggable
              onDragStart={(e) => { setDragId(b.id); e.dataTransfer.effectAllowed = "move"; }}
              onDragEnd={() => { setDragId(null); setDropIdx(null); }}
              onDragOver={(e) => {
                if (!dragId || dragId === b.id) return;
                e.preventDefault();
                const r = e.currentTarget.getBoundingClientRect();
                setDropIdx(e.clientX < r.left + r.width / 2 ? i : i + 1); // left/right half → before/after
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (!dragId || dropIdx === null) return;
                const from = model.blocks.findIndex((x) => x.id === dragId);
                const to = dropIdx > from ? dropIdx - 1 : dropIdx; // service counts without the moving clip
                if (to !== from) onMove(dragId, to);
                setDragId(null); setDropIdx(null);
              }}
              title={`${b.title} · ${mmss(b.startS)}–${mmss(b.endS)} (${b.durationS}s)${b.onBoundary ? " · lands on a section change" : ""}${b.shortfallS ? ` · take is ${b.shortfallS}s short` : ""}${b.trimmedS ? ` · export crops ${b.trimmedS}s` : ""} — drag to reorder`}
              style={{
                width: pct(b.durationS), minWidth: 10, flex: "0 0 auto",
                border: `1px solid ${active ? "var(--accent)" : "var(--line)"}`,
                borderLeft: dropIdx === i ? "3px solid var(--accent)" : undefined,
                borderRight: dropIdx === i + 1 ? "3px solid var(--accent)" : undefined,
                borderRadius: 5, cursor: dragId ? "grabbing" : "grab", overflow: "hidden", position: "relative",
                background: st === "generated" ? "rgba(79,175,126,.16)" : st === "framed" ? "rgba(226,163,60,.14)" : "var(--panel-2)",
                boxShadow: active ? "inset 0 0 0 1px var(--accent)" : "none",
                opacity: dragId === b.id ? 0.4 : 1,
                padding: "0 4px", color: "var(--ink)", font: "inherit", textAlign: "left",
              }}
            >
              {/* a title in a 10px block is noise — the rail and the tooltip carry it */}
              {share > 0.05 && (
                <span className="mono" style={{ fontSize: 9, whiteSpace: "nowrap", opacity: 0.9 }}>{b.title}</span>
              )}
              {b.shortfallS > 0 && (
                <span aria-hidden title={`take is ${b.shortfallS}s short`}
                  style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: `${(b.shortfallS / b.durationS) * 100}%`, background: "repeating-linear-gradient(45deg, rgba(224,118,58,.35) 0 3px, transparent 3px 6px)" }} />
              )}
            </button>
          );
        })}

        {drawnLeftover > 0 && (
          <div
            title={`${leftover}s of track with no picture`}
            style={{
              width: pct(drawnLeftover), flex: "0 0 auto", border: "1px dashed var(--line)", borderRadius: 5,
              display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
            }}
          >
            <span className="mono muted" style={{ fontSize: 8.5, whiteSpace: "nowrap" }}>
              {collapsed > 0.5 ? `⋯ +${mmss(leftover)} track` : "track"}
            </span>
          </div>
        )}

        {/* music section changes, over the clips (only those inside the drawn axis) */}
        {model.boundaries.filter((b) => b <= span).map((b) => (
          <span
            key={b}
            aria-hidden
            title={`section change at ${mmss(b)}`}
            style={{ position: "absolute", left: pct(b), top: -3, bottom: -3, width: 1, background: "var(--accent)", opacity: 0.75, pointerEvents: "none" }}
          />
        ))}
      </div>

      {/* ruler — thinned so stamps never collide */}
      <div style={{ position: "relative", height: 12, marginTop: 2 }}>
        {thinLabels(model.boundaries, span).map((b) => (
          <span key={b} className="mono" style={{ position: "absolute", left: pct(b), fontSize: 8, color: "var(--accent)", transform: "translateX(-50%)", whiteSpace: "nowrap" }}>
            {mmss(b)}
          </span>
        ))}
        <span className="mono muted" style={{ position: "absolute", left: 0, fontSize: 8 }}>0:00</span>
        <span className="mono muted" style={{ position: "absolute", right: 0, fontSize: 8 }}>
          {mmss(span)}{collapsed > 0.5 ? ` / ${mmss(model.trackDurationS!)}` : ""}
        </span>
      </div>
    </div>
  );
}
