// REQ-STB-060 — the music drawer: brief, track, transcript, sync.
//
// Moved out of page.tsx VERBATIM. The props are destructured in the signature precisely so the
// JSX below needed no rewriting — extracting StagePanel by prefixing identifiers corrupted seven
// pieces of user-visible text ('use whole cast' became 'use whole props.cast').
import React from "react";
import { project } from "@avd/prj/schema";
import {
  applySyncAction,
  generateMusicTrackAction,
  musicBriefAction,
  transcribeTrackAction,
  uploadTrackAction,
} from "../../../actions";
import { AudioModePicker } from "../../../../components/AudioModePicker";
import { Markdown } from "../../../../components/Markdown";
import { SubmitButton } from "../../../../components/SubmitButton";
import { config, priceTable, styleCards } from "@avd/shared/config";
import { getMusicBrief, listShots } from "@avd/stb";
import { input, sub, Section } from "./ui";
import { suggestSyncDurations } from "@avd/stb/music-sync";

export interface MusicPanelProps {
  /** The project row. Named `p` because that is what it is called in the JSX moved from page.tsx. */
  p: typeof project.$inferSelect;
  activeKinds: Set<string>;
  id: string;
  music: Awaited<ReturnType<typeof getMusicBrief>>;
  sync: ReturnType<typeof suggestSyncDurations> | null;
}

export function MusicPanel({ p, activeKinds, id, music, sync }: MusicPanelProps) {
  return (
    <>
      <Section
        title="MUSIC BRIEF"
        action={
          <>
            <form action={musicBriefAction}>
              <input type="hidden" name="projectId" value={id} />
              <SubmitButton small primary={!music} disabled={activeKinds.has("music_brief")} pendingLabel="Briefing…">
                {music ? "Regenerate" : "Generate brief"}
              </SubmitButton>
            </form>
            {music?.prompt && (
              <form action={generateMusicTrackAction}>
                <input type="hidden" name="projectId" value={id} />
                <SubmitButton small primary disabled={activeKinds.has("music")} title="Runs the brief through lyria-3-pro — full song, attaches as the project track" pendingLabel="♫ Generating…">
                  ♫ Track ≈ ${priceTable.musicPerTrackUsd.toFixed(2)}
                </SubmitButton>
              </form>
            )}
          </>
        }
      >
        {music ? (
          <div style={{ ...sub, fontSize: 11.5 }}><Markdown>{music.prompt}</Markdown></div>
        ) : (
          <p className="muted" style={{ fontSize: 12 }}>No brief yet — generate one from the project and script.</p>
        )}
      </Section>

      <Section title="SOUND">
        <AudioModePicker projectId={id} mode={p.audioMixMode as "native" | "music" | "mix"} hasTrack={Boolean(music?.activeTrackAssetId)} />
      </Section>

      <Section title="TRACK">
        {music?.activeTrackAssetId ? (
          <div style={{ display: "grid", gap: 8 }}>
            <span className="mono" style={{ fontSize: 10.5, color: "var(--ok)" }}>attached ✓ — the animatic and music/mix exports use it</span>
            <audio controls src={`/api/assets/${music.activeTrackAssetId}`} style={{ width: "100%", height: 32 }} />
            <form action={transcribeTrackAction}>
              <input type="hidden" name="projectId" value={id} />
              <SubmitButton small disabled={activeKinds.has("transcript")} title="MM:SS-timestamped lyrics/sections — drives lyric-synced cuts" pendingLabel="⏱ Transcribing…">⏱ Transcribe</SubmitButton>
            </form>
          </div>
        ) : (
          <p className="muted" style={{ fontSize: 11.5 }}>No track yet — generate one above, or attach your own.</p>
        )}
        <form action={uploadTrackAction} style={{ display: "grid", gap: 6, marginTop: 10, borderTop: "1px solid var(--line)", paddingTop: 10 }}>
          <input type="hidden" name="projectId" value={id} />
          <input type="file" name="track" accept="audio/mpeg,audio/wav" className="mono" style={{ fontSize: 10.5, color: "var(--ink-2)" }} />
          <SubmitButton small pendingLabel="Uploading…">{music?.activeTrackAssetId ? "Replace track" : "Attach track"}</SubmitButton>
        </form>
      </Section>

      {music?.transcript && (
        <Section title="TRACK TRANSCRIPT · MM:SS">
          <pre className="mono" style={{ whiteSpace: "pre-wrap", fontSize: 10.5, lineHeight: 1.7, ...sub, margin: 0 }}>{music.transcript}</pre>
        </Section>
      )}

      {sync && sync.suggestions.length > 0 && (
        <Section title="♪ MUSIC SYNC">
          <p className="muted" style={{ fontSize: 11.5, marginBottom: 8 }}>
            {sync.suggestions.length} shot duration{sync.suggestions.length > 1 ? "s" : ""} would land on a section change.
          </p>
          <form action={applySyncAction}>
            <input type="hidden" name="projectId" value={id} />
            <input type="hidden" name="changes" value={JSON.stringify(sync.suggestions.map((g) => ({ shotId: g.shotId, toS: g.toS })))} />
            <SubmitButton small primary pendingLabel="Applying…">♪ Apply {sync.suggestions.length} change{sync.suggestions.length > 1 ? "s" : ""}</SubmitButton>
          </form>
        </Section>
      )}
    </>
  );
}
