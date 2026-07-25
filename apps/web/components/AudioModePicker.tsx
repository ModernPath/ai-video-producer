// REQ-ASM-015 (USER 2026-07-25): "how do I select do I use the tracks own audio, music or mixed?"
// It existed only as an `audio: native/music/mix` dropdown in the Output panel — jargon, two
// gestures (pick + Set), and nowhere near the player where you hear the difference. This is one
// click per mode, in plain language, rendered under the clip player AND in the Music panel.
import { setAudioModeAction } from "../app/actions";
import { SubmitButton } from "./SubmitButton";

export type AudioMixMode = "native" | "music" | "mix";

const MODES: Array<{ value: AudioMixMode; label: string; hint: string; needsTrack: boolean }> = [
  { value: "native", label: "Take audio", hint: "Only what the video model generated — dialogue, effects, room tone.", needsTrack: false },
  { value: "music", label: "Music only", hint: "The project track replaces the take audio everywhere.", needsTrack: true },
  { value: "mix", label: "Both", hint: "Take audio stays up front; the track plays under it, ducked.", needsTrack: true },
];

export function AudioModePicker({
  projectId, mode, hasTrack, compact,
}: {
  projectId: string;
  mode: AudioMixMode;
  hasTrack: boolean;
  compact?: boolean;
}) {
  return (
    <form action={setAudioModeAction} style={{ display: "grid", gap: 6 }}>
      <input type="hidden" name="projectId" value={projectId} />
      <p className="mono muted" style={{ fontSize: 9, letterSpacing: ".1em" }}>
        SOUND IN THE EXPORT {compact ? "" : "· applies to the whole film"}
      </p>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
        {MODES.map((m) => {
          const active = mode === m.value;
          const blocked = m.needsTrack && !hasTrack;
          return (
            <SubmitButton
              key={m.value}
              small
              name="mode"
              value={m.value}
              disabled={active || blocked}
              title={blocked ? `${m.hint} — attach a track first (Music panel)` : m.hint}
              pendingLabel="…"
              style={{
                background: active ? "var(--accent)" : "var(--panel-2)",
                color: active ? "#12151b" : "var(--ink)",
                border: `1px solid ${active ? "var(--accent)" : "var(--line)"}`,
                borderRadius: 6, fontSize: 10.5, padding: "3px 9px",
                opacity: blocked ? 0.4 : 1, cursor: active || blocked ? "default" : "pointer",
              }}
            >
              {active ? "✓ " : ""}{m.label}
            </SubmitButton>
          );
        })}
      </div>
      {!compact && (
        <p className="muted" style={{ fontSize: 10.5 }}>{MODES.find((m) => m.value === mode)?.hint}</p>
      )}
      {!hasTrack && (
        <p className="mono muted" style={{ fontSize: 9.5 }}>no track attached — “Music only” and “Both” need one</p>
      )}
    </form>
  );
}
