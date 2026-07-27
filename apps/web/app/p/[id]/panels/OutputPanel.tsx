// REQ-STB-060 — the output drawer: look & sound, export, recent generations.
//
// Moved out of page.tsx VERBATIM. The props are destructured in the signature precisely so the
// JSX below needed no rewriting — extracting StagePanel by prefixing identifiers corrupted seven
// pieces of user-visible text ('use whole cast' became 'use whole props.cast').
import React from "react";
import { project } from "@avd/prj/schema";
import {
  exportAction,
  generateMissingFramesAction,
  retryGenerationAction,
  setProjectStyleAction,
} from "../../../actions";
import { AudioModePicker } from "../../../../components/AudioModePicker";
import { SubmitButton } from "../../../../components/SubmitButton";
import { boardProgress } from "@avd/stb/board";
import { generation } from "@avd/gen/schema";
import { getMusicBrief, listShots } from "@avd/stb";
import { input, tiny, Section } from "./ui";
import { listEntities, listProjectEntities, listStyleKits } from "@avd/ast";

export interface OutputPanelProps {
  /** The project row. Named `p` because that is what it is called in the JSX moved from page.tsx. */
  p: typeof project.$inferSelect;
  captionSelect: React.ReactNode;
  id: string;
  kits: Awaited<ReturnType<typeof listStyleKits>>;
  music: Awaited<ReturnType<typeof getMusicBrief>>;
  progress: ReturnType<typeof boardProgress>;
  recentGens: Array<typeof generation.$inferSelect>;
}

export function OutputPanel({ p, captionSelect, id, kits, music, progress, recentGens }: OutputPanelProps) {
  return (
    <>
      <Section title="LOOK & SOUND">
        <div style={{ display: "grid", gap: 10 }}>
          {kits.length > 0 && (
            <form action={setProjectStyleAction} style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input type="hidden" name="projectId" value={id} />
              <select name="styleKitId" defaultValue={p.styleKitId ?? ""} className="mono" title="Style kit — appended to every frame and take of this project" style={{ ...tiny, flex: 1 }}>
                <option value="">style: none</option>
                {kits.map((k) => <option key={k.id} value={k.id}>style: {k.name}</option>)}
              </select>
              <SubmitButton small pendingLabel="…">Set</SubmitButton>
            </form>
          )}
          <AudioModePicker projectId={id} mode={p.audioMixMode as "native" | "music" | "mix"} hasTrack={Boolean(music?.activeTrackAssetId)} />
          <form action={generateMissingFramesAction}>
            <input type="hidden" name="projectId" value={id} />
            <SubmitButton small pendingLabel="Generating…">＋ Frames for every unframed shot</SubmitButton>
          </form>
        </div>
      </Section>

      <Section title="EXPORT">
        <form action={exportAction} style={{ display: "grid", gap: 8 }}>
          <input type="hidden" name="projectId" value={id} />
          {!progress.ready && <input type="hidden" name="excludeShotIds" value={progress.pending.join(",")} />}
          {captionSelect}
          <SubmitButton primary disabled={progress.generated === 0} pendingLabel="Exporting…">
            {progress.ready ? "Export cut" : `Export ${progress.generated} · skip ${progress.total - progress.generated}`}
          </SubmitButton>
          <span className="mono muted" style={{ fontSize: 9.5 }}>results appear under “The film” in the rail</span>
        </form>
      </Section>

      {recentGens.length > 0 && (
        <Section title="RECENT GENERATIONS">
          {recentGens.map((g) => (
            <div key={g.id} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <p className="mono muted" style={{ fontSize: 10 }}>
                {g.kind} · {g.status} · ${g.costUsd ?? "—"}{g.retryOf ? " · retry" : ""}{g.status === "failed" && g.errorCode ? ` · ${g.errorCode}` : ""}
              </p>
              {g.status === "failed" && (
                <form action={retryGenerationAction}>
                  <input type="hidden" name="projectId" value={id} />
                  <input type="hidden" name="generationId" value={g.id} />
                  <SubmitButton small pendingLabel="…">↻ retry</SubmitButton>
                </form>
              )}
            </div>
          ))}
        </Section>
      )}
    </>
  );
}
