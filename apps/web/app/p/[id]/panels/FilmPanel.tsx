// REQ-STB-060 — the film: newest export, animatic, exports list.
//
// Moved out of page.tsx VERBATIM. The props are destructured in the signature precisely so the
// JSX below needed no rewriting — extracting StagePanel by prefixing identifiers corrupted seven
// pieces of user-visible text ('use whole cast' became 'use whole props.cast').
import React from "react";
import type { RailShot } from "../../../../components/Workspace";
import {
  applySyncAction,
  createShareLinkAction,
  retryExportAction,
} from "../../../actions";
import { AnimaticPlayer } from "../../../../components/AnimaticPlayer";
import { SubmitButton } from "../../../../components/SubmitButton";
import { boardProgress } from "@avd/stb/board";
import { card, input, label, sub, Section } from "./ui";
import { exportJob, shareLink } from "@avd/asm/schema";
import { getMusicBrief, listShots } from "@avd/stb";
import { suggestSyncDurations } from "@avd/stb/music-sync";

export interface FilmPanelProps {
  exportSnapshots: Map<string, Array<{ shotId: string; title: string }>>;
  exports_: Array<typeof exportJob.$inferSelect>;
  id: string;
  music: Awaited<ReturnType<typeof getMusicBrief>>;
  newestExport: typeof exportJob.$inferSelect | undefined;
  progress: ReturnType<typeof boardProgress>;
  railShots: RailShot[];
  shareByJob: Map<string, typeof shareLink.$inferSelect>;
  shots: Awaited<ReturnType<typeof listShots>>;
  sync: ReturnType<typeof suggestSyncDurations> | null;
}

export function FilmPanel({ exportSnapshots, exports_, id, music, newestExport, progress, railShots, shareByJob, shots, sync }: FilmPanelProps) {
  return (
    <div style={{ maxWidth: 1180 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
        <h2 className="disp" style={{ fontSize: 15 }}>The film</h2>
        {newestExport && (
          <span className="mono muted" style={{ fontSize: 9.5 }}>newest export · #{newestExport.id.slice(-6)}</span>
        )}
        <div style={{ marginLeft: "auto" }}>
          {/* USER 2026-07-25: the animatic belongs next to the cut, not in a corner of the header */}
          <AnimaticPlayer
            shots={railShots.map((s) => ({ id: s.id, durationS: s.durationS, frameAssetId: s.thumbAssetId, title: `${s.label}. ${s.title}` }))}
            musicAssetId={music?.activeTrackAssetId}
          />
        </div>
      </div>
      {newestExport?.outputAssetId ? (
        <video src={`/api/assets/${newestExport.outputAssetId}`} controls playsInline preload="metadata"
          style={{ width: "100%", borderRadius: 10, border: "1px solid var(--line)", background: "#000" }} />
      ) : (
        <div style={{ ...sub, display: "grid", gap: 8, placeItems: "center", padding: 40, textAlign: "center" }}>
          <p className="muted" style={{ fontSize: 12.5 }}>
            No export yet. {progress.generated > 0 ? "Hit Export cut in the command bar — or preview the animatic first." : "Generate takes for your shots, then export."}
          </p>
          <AnimaticPlayer
            shots={railShots.map((s) => ({ id: s.id, durationS: s.durationS, frameAssetId: s.thumbAssetId, title: `${s.label}. ${s.title}` }))}
            musicAssetId={music?.activeTrackAssetId}
          />
        </div>
      )}
      <p className="mono muted" style={{ fontSize: 9.5, marginTop: 6 }}>
        {progress.ready ? "every shot has a take — exports are full length" : `${progress.total - progress.generated} shot(s) without a take are skipped in an export (INV-ASM-002)`}
      </p>

      {sync && sync.suggestions.length > 0 && (
        <section style={{ ...card, marginTop: 14, borderColor: "var(--accent)" }}>
          <p className="mono" style={{ ...label, color: "var(--accent)", marginBottom: 6 }}>
            ♪ MUSIC SYNC — section changes at {sync.boundaries.map((b) => `${Math.floor(b / 60)}:${String(b % 60).padStart(2, "0")}`).join(", ")}
          </p>
          {sync.suggestions.map((g) => (
            <p key={g.shotId} style={{ fontSize: 12, margin: "2px 0" }}>
              <b>{g.title}</b>: {g.fromS}s → {g.toS}s <span className="muted">(cut lands on the change at {Math.floor(g.boundaryS / 60)}:{String(g.boundaryS % 60).padStart(2, "0")})</span>
            </p>
          ))}
          <form action={applySyncAction} style={{ marginTop: 8 }}>
            <input type="hidden" name="projectId" value={id} />
            <input type="hidden" name="changes" value={JSON.stringify(sync.suggestions.map((g) => ({ shotId: g.shotId, toS: g.toS })))} />
            <SubmitButton small primary pendingLabel="Applying…">♪ Apply {sync.suggestions.length} duration change{sync.suggestions.length > 1 ? "s" : ""}</SubmitButton>
          </form>
          <p className="mono muted" style={{ fontSize: 9, marginTop: 6 }}>existing takes keep their length — regenerate after changing durations</p>
        </section>
      )}

      {exports_.length > 0 && (
        <Section title="EXPORTS · newest first">
          {exports_.map((e) => (
            <div key={e.id} style={{ display: "flex", gap: 12, alignItems: "center", padding: "5px 0", fontSize: 12, flexWrap: "wrap" }}>
              <span className="mono muted">#{e.id.slice(-6)}</span>
              <span className="mono" style={{ color: e.status === "succeeded" ? "var(--ok)" : e.status === "failed" ? "#e0763a" : "var(--accent)" }}>
                {e.status}{e.progressStage && e.status === "running" ? ` · ${e.progressStage}` : ""}
              </span>
              {e.status === "succeeded" && e.outputAssetId && (
                <>
                  <a href={`/api/assets/${e.outputAssetId}`} download="final.mp4" className="mono" style={{ color: "var(--accent)" }}>⇓ download</a>
                  {(() => { const link = shareByJob.get(e.id); return link ? (
                    <a href={`/s/${link.token}`} target="_blank" className="mono" style={{ color: "var(--accent)" }}>⧉ share link</a>
                  ) : (
                    <form action={createShareLinkAction}>
                      <input type="hidden" name="projectId" value={id} />
                      <input type="hidden" name="exportJobId" value={e.id} />
                      <SubmitButton small pendingLabel="…">⧉ share</SubmitButton>
                    </form>
                  ); })()}
                </>
              )}
              {e.status === "failed" && (
                <>
                  <span className="muted">{e.errorDetail?.slice(0, 70)}</span>
                  <form action={retryExportAction}>
                    <input type="hidden" name="projectId" value={id} />
                    <input type="hidden" name="exportJobId" value={e.id} />
                    <SubmitButton small pendingLabel="…">↻ retry</SubmitButton>
                  </form>
                </>
              )}
              {(() => { const ex = exportSnapshots.get(e.snapshotId) ?? []; return ex.length > 0 ? (
                <span className="mono muted" style={{ fontSize: 9.5 }}>skipped: {ex.map((x) => x.title).join(", ")}</span>
              ) : null; })()}
            </div>
          ))}
        </Section>
      )}
    </div>
  );
}
