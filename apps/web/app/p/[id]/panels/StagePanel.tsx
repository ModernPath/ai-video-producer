// REQ-STB-060 — the stage: one shot, everything you can do to it.
//
// This was 439 lines of JSX inside a `for` loop inside the 1,211-line page.tsx — the single
// largest thing in `apps/web`, and unreachable by any test because rendering it needed the page,
// which needed the database. Every prop below was already computed in that loop; naming them is
// the whole change. Three defects that reached the user live in this panel (REQ-STB-045/057/058),
// which is why it is extracted first: REQ-STB-061 renders THIS.
import React from "react";
import Link from "next/link";
import { config, fullFrameAnimationTemplates, priceTable } from "@avd/shared/config";
import { chainLabels, chainFor, handoffState, generationBlocker } from "@avd/stb/chain";
import { buildTimeline } from "@avd/stb/timeline";
import { estimateTake } from "@avd/gen";
import { shotStatus } from "@avd/stb/board";
import { listCandidates, listShots } from "@avd/stb";
import { listProjectEntities } from "@avd/ast";
import { getMusicBrief } from "@avd/stb";
import { suggestSyncDurations } from "@avd/stb/music-sync";
import { ZoomImage } from "../../../../components/ZoomImage";
import { ABCompare } from "../../../../components/ABCompare";
import { ClipPlayer } from "../../../../components/ClipPlayer";
import { AudioModePicker } from "../../../../components/AudioModePicker";
import { SubmitButton } from "../../../../components/SubmitButton";
import { btn, btnPrimary, card, input, label, sub, tiny } from "./ui";
import {
  animationTakeAction,
  cancelGenerationAction,
  generateChainAction,
  generateFrameAction,
  generateTakeAction,
  overlayTakeAction,
  refreshHandoffAction,
  removeCandidateAction,
  removeShotAction,
  retakeAction,
  retryGenerationAction,
  saveScriptsAndGenerateAction,
  selectFrameAction,
  selectTakeAction,
  setContinuityAction,
  updateShotDurationAction,
  updateShotRefsAction,
} from "../../../actions";

/** Row + derived values for ONE shot. Everything here was a local in the page's per-shot loop. */
export interface StagePanelProps {
  shot: Awaited<ReturnType<typeof listShots>>[number];
  index: number;
  projectId: string;
  shotCount: number;
  cost: number;
  /** The shot's `direction` JSON, already widened. */
  dd: { synopsis?: string; subject?: string; action?: string; camera?: string; mood?: string; dialogue?: string; audioNotes?: string };
  cands: Awaited<ReturnType<typeof listCandidates>>;
  busy: { frame: number; take: number };
  status: ReturnType<typeof shotStatus>;
  selectedTake: Awaited<ReturnType<typeof listCandidates>>["takes"][number] | undefined;
  selFrame: Awaited<ReturnType<typeof listCandidates>>["frames"][number] | undefined;
  autoImage: string;
  autoVideo: string;
  castRefs: string[];
  effectiveRefs: string[];
  chain: ReturnType<typeof chainFor>;
  handoff: ReturnType<typeof handoffState>;
  blocked: ReturnType<typeof generationBlocker>;
  est: ReturnType<typeof estimateTake>;
  estDiffers: boolean;
  cast: Awaited<ReturnType<typeof listProjectEntities>>;
  music: Awaited<ReturnType<typeof getMusicBrief>>;
  sync: ReturnType<typeof suggestSyncDurations> | null;
  shotLabels: Map<string, string>;
  takeCondFrame: Map<string, string | null>;
  shots: Awaited<ReturnType<typeof listShots>>;
  activeByShot: Map<string, { frame: number; take: number }>;
  activeRowsByShot: Map<string, Array<{ id: string; kind: string; since: Date }>>;
  failedByShot: Map<string, { id: string; kind: string; errorCode: string | null; errorDetail: string | null; target: unknown }>;
  timeline: ReturnType<typeof buildTimeline>;
  timelineByShot: Map<string, ReturnType<typeof buildTimeline>["blocks"][number]>;
  /** From the PROJECT row — in page.tsx this read `p.audioMixMode`, where `p` was the project. */
  audioMixMode: string | null;
}

export function StagePanel(props: StagePanelProps) {
  return (
    // REQ-STB-045: the stage swaps ONE panel in place, and every panel has the same element
    // shape — without a key React reuses the DOM and the uncontrolled `defaultValue` prompt
    // boxes keep the previous shot's text (USER: "the image prompt is not retained").
    <div key={props.shot.id} style={{ maxWidth: 1460 }}>
      {/* Shot header — order & removal live where you're looking at the shot */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
        <span className="mono muted" style={{ fontSize: 12 }}>{props.shotLabels.get(props.shot.id) ?? props.shot.position}</span>
        <h2 className="disp" style={{ fontSize: 15 }}>{props.shot.title}</h2>
        <span className="mono muted" style={{ fontSize: 11 }}>{props.shot.durationS}s</span>
        <span className="mono" style={{ fontSize: 10, color: props.status === "generated" ? "var(--ok)" : props.status === "framed" ? "var(--accent)" : "var(--ink-2)" }}>{props.status}</span>
        {(props.shot.animation as { text?: string } | null)?.text && (
          <span className="mono" style={{ fontSize: 9.5, color: "var(--accent)", border: "1px dashed var(--accent)", borderRadius: 4, padding: "1px 6px" }} title="Plan-authored animation shot — renders free via Remotion">✦ animation</span>
        )}
        {(props.busy.frame > 0 || props.busy.take > 0) && <span className="mono gen-pulse" style={{ fontSize: 10 }}>● generating…</span>}
        <div style={{ marginLeft: "auto", display: "flex", gap: 5, alignItems: "center" }}>
          <form action={removeShotAction}>
            <input type="hidden" name="projectId" value={props.projectId} />
            <input type="hidden" name="shotId" value={props.shot.id} />
            {props.shot.selectedTakeId && <input type="hidden" name="confirmPaid" value="1" />}
            <SubmitButton small title={props.shot.selectedTakeId ? "Removes this cut AND its paid take" : "Remove this cut"}>
              ✕ {props.shot.selectedTakeId ? "cut (discards take)" : "cut"}
            </SubmitButton>
          </form>
        </div>
      </div>
      {props.dd.synopsis && <p className="muted" style={{ fontSize: 12.5, marginBottom: 10 }}>{props.dd.synopsis}</p>}

      {/* REQ-STB-040: length editing where the consequence is spelled out — crop is free,
          a shortfall needs a regenerate (USER 2026-07-25). */}
      {(() => {
        const tb = props.timelineByShot.get(props.shot.id);
        if (!tb) return null;
        return (
          <div style={{ ...sub, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 14 }}>
            <span className="mono muted" style={{ fontSize: 9.5 }}>
              {`${Math.floor(tb.startS / 60)}:${String(Math.round(tb.startS % 60)).padStart(2, "0")}`}
              {" → "}
              {`${Math.floor(tb.endS / 60)}:${String(Math.round(tb.endS % 60)).padStart(2, "0")}`}
              {" in the cut"}
            </span>
            {props.timeline.boundaries.length > 0 && (
              <span className="mono" style={{ fontSize: 9.5, color: tb.onBoundary ? "var(--ok)" : "var(--ink-2)" }}
                title={tb.onBoundary ? "This cut lands exactly on a music section change" : "This cut falls mid-section — try a sync suggestion in the Music panel"}>
                {tb.onBoundary ? "♪ on the beat" : "♪ off the beat"}
              </span>
            )}
            <form action={updateShotDurationAction} style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input type="hidden" name="projectId" value={props.projectId} />
              <input type="hidden" name="shotId" value={props.shot.id} />
              <label className="mono muted" style={{ fontSize: 9.5 }}>length</label>
              <input name="durationS" type="number" step="0.5" min={config.shot.minSeconds} max={config.shot.maxSeconds}
                defaultValue={Number(props.shot.durationS)} style={{ ...tiny, width: 62 }} />
              <SubmitButton small pendingLabel="…">Set length</SubmitButton>
            </form>
            {tb.trimmedS > 0 && (
              <span className="mono" style={{ fontSize: 9.5, color: "var(--ok)" }} title="The export normalizes each clip with ffmpeg -t, so the extra footage is simply cropped — no regeneration, no cost">
                ✂ export crops {tb.trimmedS}s of this take · free
              </span>
            )}
            {tb.shortfallS > 0 && (
              <span className="mono" style={{ fontSize: 9.5, color: "#e0763a" }} title="The take has less footage than this length — the clip runs out. Regenerate the take at the new length.">
                ⚠ take is {tb.shortfallS}s short — regenerate to fill
              </span>
            )}
            {!props.shot.selectedTakeId && <span className="mono muted" style={{ fontSize: 9.5 }}>no take yet — length only sets what gets generated</span>}
          </div>
        );
      })()}

      {/* Selected take plays big — this is what the cut will use */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ flex: "1 1 520px", minWidth: 320 }}>
          {props.selectedTake ? (
            // REQ-ASM-014: the clip plays with the project track under it, from its own position
            <ClipPlayer
              videoAssetId={props.selectedTake.videoAssetId}
              musicAssetId={props.music?.activeTrackAssetId ?? null}
              startS={props.timelineByShot.get(props.shot.id)?.startS ?? 0}
              durationS={Number(props.shot.durationS)}
              mixMode={props.audioMixMode as "native" | "music" | "mix"}
              label={`selected take ${props.selectedTake.id.slice(-4)} · ${props.selectedTake.durationActualS ?? props.shot.durationS}s — this is what the export uses`}
            />
          ) : props.selFrame ? (
            <ZoomImage src={`/api/assets/${props.selFrame.imageAssetId}`} alt="start frame"
              style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", borderRadius: 10, border: "1px solid var(--line)" }} />
          ) : (
            <div style={{ width: "100%", aspectRatio: "16/9", borderRadius: 10, border: "1px dashed var(--line)", display: "grid", placeItems: "center" }}>
              <p className="mono muted" style={{ fontSize: 11 }}>no frame yet — generate one below</p>
            </div>
          )}
          {!props.selectedTake && (
            <p className="mono muted" style={{ fontSize: 9.5, marginTop: 5 }}>
              {props.selFrame ? "selected start frame — no take yet" : "planned"}
            </p>
          )}
          {/* REQ-ASM-015: choose take audio / music / both right where you hear it */}
          {props.selectedTake && (
            <div style={{ ...sub, marginTop: 8 }}>
              <AudioModePicker projectId={props.projectId} mode={props.audioMixMode as "native" | "music" | "mix"} hasTrack={Boolean(props.music?.activeTrackAssetId)} compact />
            </div>
          )}
        </div>

        {/* Buy actions sit next to the preview, not two screens away */}
        <div style={{ flex: "0 1 300px", display: "grid", gap: 8 }}>
          <div style={sub}>
            <p className="mono muted" style={{ ...label, marginBottom: 8 }}>GENERATE</p>
            <div style={{ display: "grid", gap: 6 }}>
              {/* REQ-STB-057: a sub-clip already HAS its first frame — the previous take's last.
                  Buying more would only offer a way to break the chain. */}
              {props.shot.continuesFromShotId ? (
                <p className="mono muted" style={{ fontSize: 10, lineHeight: 1.5 }}>
                  ↳ start frame comes from the previous take — no frames to buy
                </p>
              ) : (
                <form action={generateFrameAction}>
                  <input type="hidden" name="projectId" value={props.projectId} />
                  <input type="hidden" name="shotId" value={props.shot.id} />
                  <SubmitButton disabled={props.busy.frame > 0} pendingLabel="Framing…">
                    ＋ {config.frame.candidatesDefault} frames ≈ ${(config.frame.candidatesDefault * priceTable.imagePerImageUsd.standard).toFixed(2)}
                  </SubmitButton>
                </form>
              )}
              <form action={generateTakeAction}>
                <input type="hidden" name="projectId" value={props.projectId} />
                <input type="hidden" name="shotId" value={props.shot.id} />
                <SubmitButton primary disabled={props.busy.take > 0} pendingLabel="Generating take…"
                  {...(props.estDiffers ? { title: `${config.gen.videoRoute} runs this as ${props.est.effectiveSeconds}s (shot says ${Number(props.shot.durationS)}s)` } : {})}>
                  ▸ Take ≈ ${props.est.usd.toFixed(2)}{props.estDiffers ? ` · ${props.est.effectiveSeconds}s` : ""}
                </SubmitButton>
              </form>
            </div>
            <form action={animationTakeAction} style={{ display: "grid", gap: 5, marginTop: 10, borderTop: "1px solid var(--line)", paddingTop: 10 }}>
              <input type="hidden" name="projectId" value={props.projectId} />
              <input type="hidden" name="shotId" value={props.shot.id} />
              <p className="mono muted" style={{ fontSize: 9.5 }}>OR RENDER A GRAPHIC — free, local</p>
              {/* REQ-STB-036: every full-frame template is choosable */}
              <select name="template" defaultValue={((props.shot.animation as { template?: string } | null)?.template) ?? "title"} className="mono" title="title card · kinetic type · stat count-up · quote card · checklist reveal" style={tiny}>
                {fullFrameAnimationTemplates.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <input name="text" required defaultValue={(props.shot.animation as { text?: string } | null)?.text ?? ""} placeholder="✦ headline text…" className="mono" style={tiny} />
              <input name="subtext" defaultValue={(props.shot.animation as { subtext?: string } | null)?.subtext ?? ""} placeholder="subtext · quote author · items a|b|c" className="mono" title="Subtitle (title/stat), attribution (quote), or | separated items (checklist)" style={tiny} />
              <SubmitButton small disabled={props.busy.take > 0} pendingLabel="Rendering…">✦ Animate · free</SubmitButton>
            </form>
          </div>
        </div>
      </div>

      {/* Takes — side by side, big enough to actually judge */}
      <div style={{ ...card, marginTop: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <p className="mono muted" style={label}>TAKES · {props.cands.takes.length}</p>
          <ABCompare takes={props.cands.takes.map((t) => ({ id: t.id, videoAssetId: t.videoAssetId, label: `take ${t.id.slice(-4)}${t.retakeOf ? " (retake)" : ""}` }))} />
          {props.busy.take > 0 && <span className="mono gen-pulse" style={{ fontSize: 10 }}>● generating video…</span>}
        </div>
        {props.cands.takes.length === 0 ? (
          <p className="muted" style={{ fontSize: 11.5 }}>No takes yet.</p>
        ) : (
          <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 4 }}>
            {props.cands.takes.map((t) => {
              const isSel = props.shot.selectedTakeId === t.id;
              const cond = props.takeCondFrame.get(t.generationId);
              const staleFrame = cond && props.selFrame && cond !== props.selFrame.imageAssetId;
              return (
                <div key={t.id} style={{ flex: "0 0 268px", display: "grid", gap: 6 }}>
                  <video src={`/api/assets/${t.videoAssetId}`} controls playsInline preload="metadata"
                    style={{ width: "100%", aspectRatio: "16/9", borderRadius: 8, background: "#000", border: isSel ? "2px solid var(--accent)" : "1px solid var(--line)" }} />
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span className="mono muted" style={{ fontSize: 9.5 }}>take {t.id.slice(-4)} · {t.durationActualS ?? props.shot.durationS}s</span>
                    {isSel ? (
                      <span className="mono" style={{ fontSize: 9.5, color: "var(--accent)" }}>✓ selected</span>
                    ) : (
                      <>
                        <form action={selectTakeAction}>
                          <input type="hidden" name="projectId" value={props.projectId} />
                          <input type="hidden" name="shotId" value={props.shot.id} />
                          <input type="hidden" name="takeId" value={t.id} />
                          <SubmitButton small pendingLabel="…">Use this</SubmitButton>
                        </form>
                        <form action={removeCandidateAction}>
                          <input type="hidden" name="projectId" value={props.projectId} />
                          <input type="hidden" name="kind" value="take" />
                          <input type="hidden" name="id" value={t.id} />
                          <button type="submit" className="mono" title="Remove take (asset kept)" style={{ background: "none", border: "1px solid var(--line)", borderRadius: 5, color: "var(--ink-2)", fontSize: 9, padding: "1px 6px", cursor: "pointer" }}>✕</button>
                        </form>
                      </>
                    )}
                    {staleFrame && (
                      <span className="mono muted" title="Generated from a previously selected start frame (INV-STB-006 — preserved, not regenerated)" style={{ fontSize: 9, border: "1px dashed var(--line)", borderRadius: 4, padding: "0 5px" }}>older frame</span>
                    )}
                  </div>
                  <form action={retakeAction} style={{ display: "flex", gap: 4 }}>
                    <input type="hidden" name="projectId" value={props.projectId} />
                    <input type="hidden" name="takeId" value={t.id} />
                    <input name="instruction" required placeholder="retake: slower camera…" className="mono" style={{ ...tiny, flex: 1, minWidth: 0 }} />
                    <SubmitButton small disabled={props.busy.take > 0} title="Adjusted take, conditioned like this one (same price)" pendingLabel="…">↻</SubmitButton>
                  </form>
                  <form action={overlayTakeAction} style={{ display: "flex", gap: 4 }}>
                    <input type="hidden" name="projectId" value={props.projectId} />
                    <input type="hidden" name="takeId" value={t.id} />
                    <input name="text" required placeholder="overlay text…" className="mono" style={{ ...tiny, flex: 1, minWidth: 0 }} />
                    <SubmitButton small disabled={props.busy.take > 0} title="Composite an animated lower-third onto this take — free, local" pendingLabel="…">✦</SubmitButton>
                  </form>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Start frames */}
      <div style={{ ...card, marginTop: 12 }}>
        <p className="mono muted" style={{ ...label, marginBottom: 8 }}>
          {/* REQ-STB-057: a sub-clip's first frame is DECIDED by the previous take — there is
              nothing to pick, and picking would break the chain it exists to preserve. */}
          {props.handoff === "current"
            ? "START FRAME · handed over from the previous take — not a choice"
            : props.handoff === "stale"
              ? "START FRAME · NOT from the previous take yet"
              : props.handoff === "waiting"
                ? "START FRAME · waiting for the previous take"
                : "START FRAMES · pick 1 — only the selected frame conditions the video model"}
          {props.busy.frame > 0 && <span className="gen-pulse"> ● generating image…</span>}
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {(props.shot.continuesFromShotId
            ? props.cands.frames.filter((f) => f.id === props.shot.selectedStartFrameId)
            : props.cands.frames
          ).map((f) => (
            <div key={f.id} style={{ display: "grid", gap: 4, justifyItems: "start" }}>
              <form action={selectFrameAction}>
                <input type="hidden" name="projectId" value={props.projectId} />
                <input type="hidden" name="shotId" value={props.shot.id} />
                <input type="hidden" name="frameCandidateId" value={f.id} />
                <button type="submit" style={{ all: "unset", cursor: "pointer", display: "block" }} title="Use this frame">
                  <div style={{ width: 158, aspectRatio: "16/9", borderRadius: 7, overflow: "hidden", position: "relative", background: "#0a0c10", border: props.shot.selectedStartFrameId === f.id ? "2px solid var(--accent)" : "1px solid var(--line)" }}>
                    <ZoomImage src={`/api/assets/${f.imageAssetId}?thumb=1`} alt={`frame ${f.id.slice(-4)}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    {props.shot.selectedStartFrameId === f.id && (
                      <span style={{ position: "absolute", right: 5, top: 5, width: 15, height: 15, borderRadius: "50%", background: "var(--accent)", color: "#12151b", fontSize: 10, fontWeight: 700, display: "grid", placeItems: "center" }}>✓</span>
                    )}
                  </div>
                </button>
              </form>
              {props.shot.selectedStartFrameId !== f.id && (
                <form action={removeCandidateAction}>
                  <input type="hidden" name="projectId" value={props.projectId} />
                  <input type="hidden" name="kind" value="frame" />
                  <input type="hidden" name="id" value={f.id} />
                  <button type="submit" className="mono" title="Remove candidate (asset kept)" style={{ background: "none", border: "1px solid var(--line)", borderRadius: 5, color: "var(--ink-2)", fontSize: 9, padding: "1px 6px", cursor: "pointer" }}>✕ remove</button>
                </form>
              )}
            </div>
          ))}
          {props.cands.frames.length === 0 && <p className="muted" style={{ fontSize: 11.5 }}>No frames yet.</p>}
        </div>
      </div>

      {/* REQ-GEN-034: what is in flight on this shot, how long it has been, and a way out.
          Before this, a run under the 30-minute sweep window had no exit at all. */}
      {(props.activeRowsByShot.get(props.shot.id) ?? []).length > 0 && (
        <div style={{ ...sub, marginTop: 12, display: "grid", gap: 6 }}>
          {(props.activeRowsByShot.get(props.shot.id) ?? []).map((g) => {
            const mins = Math.floor((Date.now() - new Date(g.since).getTime()) / 60_000);
            const slow = mins >= 3;
            return (
              <form key={g.id} action={cancelGenerationAction} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <input type="hidden" name="projectId" value={props.projectId} />
                <input type="hidden" name="generationId" value={g.id} />
                <span className="mono gen-pulse" style={{ fontSize: 10.5 }}>● {g.kind} running</span>
                <span className="mono muted" style={{ fontSize: 10 }}>
                  {mins < 1 ? "just started" : `${mins} min`}
                </span>
                {slow && (
                  <span className="mono" style={{ fontSize: 10, color: "#e0763a" }}>
                    longer than expected — cancel and try again if it is not moving
                  </span>
                )}
                <SubmitButton small pendingLabel="Cancelling…">✕ cancel</SubmitButton>
              </form>
            );
          })}
        </div>
      )}

      {/* REQ-STB-054: the continuity chain — a sub-clip of the shot before it, starting from
          that take's last frame. Shown where the dependency matters, on the shot itself. */}
      {(() => {
        const prev = props.shots[props.index - 1];
        const continues = props.shot.continuesFromShotId;
        const source = continues ? props.shots.find((x) => x.id === continues) : undefined;
        const srcHasTake = source ? Boolean(source.selectedTakeId) : false;
        if (!prev && !continues) return null;
        return (
          <form action={setContinuityAction} style={{ ...sub, marginTop: 12, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", borderColor: continues ? "var(--accent)" : "var(--line)" }}>
            <input type="hidden" name="projectId" value={props.projectId} />
            <input type="hidden" name="shotId" value={props.shot.id} />
            <p className="mono muted" style={{ ...label, margin: 0 }}>
              CONTINUITY{props.chain ? ` · ${props.chain.index + 1} of ${props.chain.length}` : ""}
            </p>
            {continues ? (
              <>
                <span style={{ fontSize: 11.5 }}>
                  ↳ sub-clip of <b>{source?.title ?? "a removed shot"}</b>
                  <span className="mono muted" style={{ fontSize: 10, marginLeft: 6 }}>
                    {props.shot.selectedStartFrameId
                      ? "starts from its last frame"
                      : srcHasTake ? "waiting for the handoff" : "starts once that shot has a chosen take"}
                  </span>
                </span>
                <input type="hidden" name="continuesFromShotId" value="" />
                <SubmitButton small pendingLabel="…">✕ break the chain</SubmitButton>
                {props.blocked && (
                  <span className="mono" style={{ fontSize: 10, color: "#e0763a", flexBasis: "100%" }}>{props.blocked}</span>
                )}
                {props.handoff === "stale" && (
                  <span style={{ flexBasis: "100%", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 4 }}>
                    <span className="mono" style={{ fontSize: 10, color: "#e0763a" }}>
                      This shot still starts from an older frame — the handoff will not overwrite one you chose.
                    </span>
                    <SubmitButton small primary formAction={refreshHandoffAction}
                      title="Cuts the last frame of the source take and makes it this shot's start frame, replacing the current one"
                      pendingLabel="Taking the last frame…">↻ use its last frame now</SubmitButton>
                  </span>
                )}
                <input type="hidden" name="sourceShotId" value={props.shot.continuesFromShotId ?? ""} />
              </>
            ) : (
              <>
                <span className="mono muted" style={{ fontSize: 10.5 }}>
                  same moment as <b>{prev!.title}</b>? Its last frame becomes this shot&apos;s first — poses,
                  wardrobe and props carry over exactly.
                </span>
                <input type="hidden" name="continuesFromShotId" value={prev!.id} />
                <SubmitButton small pendingLabel="…">↳ continue that shot</SubmitButton>
              </>
            )}
            {/* REQ-STB-055: only the HEAD offers this — a chain must be generated from its start,
                because each shot's first frame is the previous take's last. */}
            {/* REQ-STB-060's known defect: extracting this panel by prefixing identifiers
                corrupted user-visible text. Two more survived here — the label read "Generate
                the props.chain (10 props.shots)" on the deployed app (USER 2026-07-28). */}
            {props.chain && props.chain.index === 0 && (
              <SubmitButton small primary formAction={generateChainAction}
                title="Runs in the background: generates each shot in order and hands each take's last frame to the next. Watch the rail fill in — you can leave this page."
                pendingLabel={`Starting ${props.chain.length} shots…`}>
                ▸ Generate the chain ({props.chain.length} shots)
              </SubmitButton>
            )}
          </form>
        );
      })()}

      {/* REQ-GEN-027: name the failure on the shot it happened to, with one click to retry. */}
      {(() => {
        const f = props.failedByShot.get(props.shot.id);
        if (!f || (props.activeByShot.get(props.shot.id)?.take ?? 0) > 0 || (props.activeByShot.get(props.shot.id)?.frame ?? 0) > 0) return null;
        const orphaned = f.errorCode === "orphaned";
        return (
          <section style={{ ...card, marginTop: 12, borderColor: "#7a4b3a" }}>
            <p className="mono" style={{ fontSize: 10.5, color: "#e0763a" }}>
              {f.kind} failed · {f.errorCode}
            </p>
            <p className="muted" style={{ fontSize: 10.5, marginTop: 4 }}>
              {orphaned
                ? "This run was interrupted before it finished — usually the dev server restarting mid-generation. Nothing was charged."
                : (f.errorDetail?.slice(0, 220) ?? "Failures are never charged.")}
            </p>
            <form action={retryGenerationAction} style={{ marginTop: 8 }}>
              <input type="hidden" name="projectId" value={props.projectId} />
              <input type="hidden" name="generationId" value={f.id} />
              <SubmitButton small pendingLabel="Retrying…">↻ Retry this {f.kind}</SubmitButton>
            </form>
          </section>
        );
      })()}

      {/* Prompts */}
      <form action={saveScriptsAndGenerateAction} style={{ ...card, marginTop: 12 }}>
        <input type="hidden" name="projectId" value={props.projectId} />
        <input type="hidden" name="shotId" value={props.shot.id} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 5 }}>
              <p className="mono muted" style={label}>IMAGE SCRIPT {props.shot.imagePrompt ? "· custom" : "· auto"}</p>
              {props.effectiveRefs.map((rid) => (
                <ZoomImage key={rid} src={`/api/assets/${rid}?thumb=1`} alt="reference" style={{ width: 20, height: 20, borderRadius: 4, objectFit: "cover", border: "1px solid var(--line)" }} />
              ))}
            </div>
            <textarea name="imagePrompt" rows={4} defaultValue={props.shot.imagePrompt ?? ""} placeholder={props.autoImage}
              style={{ width: "100%", background: "var(--stage)", border: "1px solid var(--line)", borderRadius: 6, padding: "6px 8px", color: "var(--ink)", fontSize: 11, fontFamily: "var(--mono)", resize: "vertical" }} />
          </div>
          <div>
            <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 5 }}>
              <p className="mono muted" style={label}>VIDEO SCRIPT {props.shot.videoPrompt ? "· custom" : "· auto"}</p>
              {props.selFrame && <ZoomImage src={`/api/assets/${props.selFrame.imageAssetId}?thumb=1`} alt="start frame" style={{ width: 20, height: 20, borderRadius: 4, objectFit: "cover", border: "1px solid var(--accent)" }} />}
              {props.effectiveRefs.map((rid) => (
                <ZoomImage key={rid} src={`/api/assets/${rid}?thumb=1`} alt="reference" style={{ width: 20, height: 20, borderRadius: 4, objectFit: "cover", border: "1px solid var(--line)" }} />
              ))}
            </div>
            <textarea name="videoPrompt" rows={4} defaultValue={props.shot.videoPrompt ?? ""} placeholder={props.autoVideo}
              style={{ width: "100%", background: "var(--stage)", border: "1px solid var(--line)", borderRadius: 6, padding: "6px 8px", color: "var(--ink)", fontSize: 11, fontFamily: "var(--mono)", resize: "vertical" }} />
          </div>
        </div>
        {/* REQ-GEN-028 / REQ-STB-046: the words spoken in this shot. The video model performs
            them; without this the plan described someone speaking but never said what. */}
        <div style={{ marginTop: 10 }}>
          <p className="mono muted" style={{ ...label, marginBottom: 4 }}>SPOKEN LINE {props.dd.dialogue ? "" : "· none"}</p>
          <input name="dialogue" defaultValue={props.dd.dialogue ?? ""} placeholder="the exact words spoken in this shot — leave empty for a silent shot"
            style={{ width: "100%", background: "var(--stage)", border: "1px solid var(--line)", borderRadius: 6, padding: "6px 8px", color: "var(--ink)", fontSize: 11, fontFamily: "var(--mono)" }} />
        </div>

        <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button type="submit" name="generate" value="none" style={btn}>Save</button>
          <button type="submit" name="generate" value="frame" disabled={props.busy.frame > 0 || Boolean(props.shot.continuesFromShotId)} title={props.shot.continuesFromShotId ? "This sub-clip starts from the previous take\u2019s last frame — generating one would replace it and break the chain." : undefined} style={{ ...btnPrimary, opacity: props.busy.frame > 0 || props.shot.continuesFromShotId ? 0.45 : 1 }}>Save &amp; generate frame</button>
          <button type="submit" name="generate" value="take" disabled={props.busy.take > 0 || Boolean(props.blocked)} title={props.blocked ?? undefined} style={{ ...btnPrimary, opacity: props.busy.take > 0 || props.blocked ? 0.45 : 1 }}>Save &amp; generate take</button>
          <span className="mono muted" style={{ fontSize: 9 }}>empty = auto · custom text sent verbatim</span>
        </div>
        {props.cast.length > 0 && (
          <details style={{ marginTop: 8 }}>
            <summary className="mono muted" style={{ fontSize: 10, cursor: "pointer" }}>
              refs for this shot: {props.shot.refAssetIds === null ? "whole cast (default)" : `${props.effectiveRefs.length} selected`} · edit
            </summary>
          </details>
        )}
      </form>
      {props.cast.length > 0 && (
        <form action={updateShotRefsAction} style={{ ...card, marginTop: 8, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <input type="hidden" name="projectId" value={props.projectId} />
          <input type="hidden" name="shotId" value={props.shot.id} />
          <p className="mono muted" style={label}>REFS FOR THIS SHOT</p>
          {props.cast.map((e) => e.refAssetIds.map((rid) => (
            <label key={rid} className="mono muted" style={{ display: "flex", gap: 5, alignItems: "center", fontSize: 10 }}>
              <input type="checkbox" name="refAssetIds" value={rid} defaultChecked={(props.shot.refAssetIds ?? props.castRefs).includes(rid)} />
              <ZoomImage src={`/api/assets/${rid}?thumb=1`} alt={`${e.name} ref`} style={{ width: 24, height: 24, borderRadius: 4, objectFit: "cover", border: "1px solid var(--line)" }} />
              {e.name}
            </label>
          )))}
          <SubmitButton small pendingLabel="Saving…">Save refs</SubmitButton>
          <SubmitButton small name="reset" value="1" pendingLabel="…">use whole cast</SubmitButton>
        </form>
      )}
    </div>
  );
}
