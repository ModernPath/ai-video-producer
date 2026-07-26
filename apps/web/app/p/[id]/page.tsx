// REQ-STB-037 (USER 2026-07-25 UX review) — ONE workspace for the whole film.
// Before: a storyboard page and a separate script studio, each an endless vertical scroll; music
// and script were unreachable while editing the board, export lived at the top, the finished film
// at the very bottom. Now: sticky command bar · shot rail · one focused shot on stage · a drawer
// holding script / music / cast / output. All mutations are still the same server actions.
import { ZoomImage } from "../../../components/ZoomImage";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq, inArray } from "drizzle-orm";
import { config, fullFrameAnimationTemplates, priceTable, styleCards } from "@avd/shared/config";
import { project } from "@avd/prj/schema";
import { generation } from "@avd/gen/schema";
import { exportJob, shareLink, storyboardSnapshot } from "@avd/asm/schema";
import { scriptVersion, shotPlanProposal } from "@avd/stb/schema";
import { getMusicBrief, listCandidates, listShots } from "@avd/stb";
import { boardProgress, shotStatus } from "@avd/stb/board";
import { buildTimeline } from "@avd/stb/timeline";
import { normalizePlannedShots } from "@avd/stb/plan-normalize";
import { assembleFramePrompt, assembleTakePrompt, estimateTake } from "@avd/gen";
import { listEntities, listProjectEntities, listStyleKits } from "@avd/ast";
import { asset } from "@avd/ast/schema";
import { costMeterUsd } from "@avd/prj/service";
import { parseSectionTimes, suggestSyncDurations } from "@avd/stb/music-sync";
import {
  animationTakeAction, applyPlanAction, applySyncAction, createShareLinkAction, createShotAction,
  draftScriptAction, exportAction, generateFrameAction, generateMissingFramesAction,
  generateMusicTrackAction, generateTakeAction, moveShotTo, musicBriefAction, overlayTakeAction, proposePlanAction,
  removeCandidateAction, removeShotAction, retakeAction, retryExportAction,
  retryGenerationAction, saveScriptsAndGenerateAction, selectFrameAction, selectTakeAction,
  setArchetypeAction, setProjectStyleAction, transcribeTrackAction,
  updateBriefAction, updateShotDurationAction, updateShotRefsAction, uploadTrackAction,
} from "../../actions";
import { CastBar } from "../../../components/CastBar";
import { ABCompare } from "../../../components/ABCompare";
import { AnimaticPlayer } from "../../../components/AnimaticPlayer";
import { LiveRefresh } from "../../../components/LiveRefresh";
import { Markdown } from "../../../components/Markdown";
import { SubmitButton } from "../../../components/SubmitButton";
import { AudioModePicker } from "../../../components/AudioModePicker";
import { ClipPlayer } from "../../../components/ClipPlayer";
import { Workspace, type DrawerTab, type RailShot } from "../../../components/Workspace";
import { db } from "../../../lib/db";

export const dynamic = "force-dynamic";

const card: React.CSSProperties = { border: "1px solid var(--line)", background: "var(--panel)", borderRadius: 10, padding: 14 };
const sub: React.CSSProperties = { border: "1px solid var(--line)", background: "var(--stage)", borderRadius: 9, padding: 12 };
const btn: React.CSSProperties = { background: "var(--panel-2)", border: "1px solid var(--line)", borderRadius: 7, padding: "6px 12px", color: "var(--ink)", fontSize: 12, fontWeight: 600, cursor: "pointer" };
const btnPrimary: React.CSSProperties = { ...btn, background: "var(--accent)", border: "1px solid var(--accent)", color: "#12151b" };
const input: React.CSSProperties = { background: "var(--stage)", border: "1px solid var(--line)", borderRadius: 7, padding: "7px 9px", color: "var(--ink)", fontSize: 12 };
const label: React.CSSProperties = { fontSize: 10, letterSpacing: ".1em" };
const tiny: React.CSSProperties = { background: "var(--stage)", border: "1px solid var(--line)", borderRadius: 5, padding: "2px 6px", color: "var(--ink)", fontSize: 10 };

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section style={{ ...card, marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <p className="mono muted" style={label}>{title}</p>
        {action && <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>{action}</div>}
      </div>
      {children}
    </section>
  );
}

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = db();
  const [p] = await d.select().from(project).where(eq(project.id, id));
  if (!p) notFound();

  const shots = await listShots(d, id);
  const candidatesByShot = new Map(
    await Promise.all(shots.map(async (s) => [s.id, await listCandidates(d, s.id)] as const))
  );
  const cost = await costMeterUsd(d, id); // INV-PRJ-004: succeeded+running only
  const { dailySpendUsd } = await import("@avd/gen");
  const spentToday = await dailySpendUsd(d, p.organizationId);
  const recentGens = await d.select().from(generation).where(eq(generation.projectId, id)).orderBy(desc(generation.createdAt)).limit(6);
  const activeGens = await d
    .select()
    .from(generation)
    .where(and(eq(generation.projectId, id), inArray(generation.status, ["queued", "running"])));
  const activeByShot = new Map<string, { frame: number; take: number }>();
  for (const g of activeGens) {
    const shotId = (g.target as { shotId?: string }).shotId;
    if (!shotId) continue;
    const e = activeByShot.get(shotId) ?? { frame: 0, take: 0 };
    if (g.kind === "frame" || g.kind === "image_edit") e.frame++;
    if (g.kind === "take" || g.kind === "retake" || g.kind === "animation") e.take++;
    activeByShot.set(shotId, e);
  }
  // REQ-STB-035: the text/music lanes lock + pulse while they run.
  const textKinds = ["script", "shot_plan", "music_brief", "music", "transcript"] as const;
  const activeKinds = new Set(activeGens.filter((g) => (textKinds as readonly string[]).includes(g.kind)).map((g) => g.kind));
  const kindLabel: Record<string, string> = { script: "script", shot_plan: "shot plan", music_brief: "music brief", music: "music track", transcript: "transcript" };

  const allTakes = [...candidatesByShot.values()].flatMap((c) => c.takes);
  const takeGens = allTakes.length
    ? await d.select().from(generation).where(inArray(generation.id, allTakes.map((t) => t.generationId)))
    : [];
  const takeCondFrame = new Map(
    takeGens.map((g) => [g.id, ((g.promptSnapshot as { refs?: { startFrameAssetId?: string } }).refs?.startFrameAssetId) ?? null])
  );

  const progress = boardProgress(shots.map((s) => ({ id: s.id, selectedTakeId: s.selectedTakeId })));
  const music = await getMusicBrief(d, id);
  const sync = music?.transcript
    ? suggestSyncDurations(shots.map((s) => ({ id: s.id, title: s.title, durationS: Number(s.durationS) })), parseSectionTimes(music.transcript))
    : null;
  const orgEntities = await listEntities(d, p.organizationId);
  const kits = await listStyleKits(d, p.organizationId);
  const activeStylePrompt = kits.find((k) => k.id === p.styleKitId)?.prompt;
  const cast = await listProjectEntities(d, id);
  const castIds = new Set(cast.map((e) => e.id));

  const versions = await d.select().from(scriptVersion).where(eq(scriptVersion.projectId, id)).orderBy(desc(scriptVersion.version));
  const latestScript = versions[0];
  const proposals = await d.select().from(shotPlanProposal).where(eq(shotPlanProposal.projectId, id)).orderBy(desc(shotPlanProposal.createdAt)).limit(3);
  const failedGens = await d
    .select()
    .from(generation)
    .where(and(eq(generation.projectId, id), eq(generation.status, "failed"), inArray(generation.kind, [...textKinds])))
    .orderBy(desc(generation.createdAt))
    .limit(1);
  const lastFailure = failedGens[0];

  const exports_ = await d.select().from(exportJob).where(eq(exportJob.projectId, id)).orderBy(desc(exportJob.createdAt)).limit(6);
  const shareRows = exports_.length
    ? await d.select().from(shareLink).where(inArray(shareLink.exportJobId, exports_.map((e) => e.id)))
    : [];
  const shareByJob = new Map(shareRows.filter((r) => !r.revokedAt).map((r) => [r.exportJobId, r]));
  const snaps = exports_.length
    ? await d.select().from(storyboardSnapshot).where(inArray(storyboardSnapshot.id, exports_.map((e) => e.snapshotId)))
    : [];
  const exportSnapshots = new Map(snaps.map((s) => [s.id, (s.excluded ?? []) as Array<{ shotId: string; title: string }>]));
  const newestExport = exports_.find((e) => e.status === "succeeded" && e.outputAssetId);

  // ── REQ-STB-039: the cut on the track's time axis ───────────────────────
  const [trackAsset] = music?.activeTrackAssetId
    ? await d.select().from(asset).where(eq(asset.id, music.activeTrackAssetId))
    : [];
  const trackDurationS = trackAsset?.durationS ? Number(trackAsset.durationS) : null;
  const timeline = buildTimeline({
    shots: shots.map((s) => {
      const sel = candidatesByShot.get(s.id)!.takes.find((t) => t.id === s.selectedTakeId);
      return {
        id: s.id,
        title: s.title,
        durationS: Number(s.durationS),
        takeActualS: sel ? Number(sel.durationActualS ?? s.durationS) : null,
      };
    }),
    sectionTimesS: music?.transcript ? parseSectionTimes(music.transcript) : [],
    trackDurationS,
  });
  const timelineByShot = new Map(timeline.blocks.map((b) => [b.id, b]));

  // ── Rail ────────────────────────────────────────────────────────────────
  const railShots: RailShot[] = shots.map((s) => {
    const cands = candidatesByShot.get(s.id)!;
    const frame = cands.frames.find((f) => f.id === s.selectedStartFrameId) ?? cands.frames[0];
    const a = activeByShot.get(s.id);
    return {
      id: s.id,
      position: s.position,
      title: s.title,
      durationS: Number(s.durationS),
      status: shotStatus({ selectedTakeId: s.selectedTakeId, frameCount: cands.frames.length }),
      thumbAssetId: frame?.imageAssetId ?? null,
      busy: Boolean(a && (a.frame > 0 || a.take > 0)),
      isAnimation: Boolean((s.animation as { text?: string } | null)?.text),
    };
  });

  const captionSelect = (
    <select name="captions" className="mono" title="Burned captions: lyrics uses the track transcript; dialogue transcribes the export's own audio" style={{ ...tiny, padding: "4px 6px" }}>
      <option value="">captions: off</option>
      <option value="lyrics">captions: lyrics</option>
      <option value="lyrics-animated">captions: lyrics · animated</option>
      <option value="dialogue">captions: dialogue</option>
    </select>
  );

  // ── Command bar ─────────────────────────────────────────────────────────
  const commandBar = (
    <>
      <Link href="/" className="mono muted" style={{ fontSize: 11 }} title="All projects">←</Link>
      <div style={{ minWidth: 0 }}>
        <h1 className="disp" style={{ fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 320 }}>{p.title}</h1>
        <p className="mono muted" style={{ fontSize: 9.5 }}>
          {p.aspectRatio} · {p.targetDurationS}s · {progress.generated}/{progress.total} generated · route {config.gen.videoRoute}
        </p>
      </div>
      <span className="mono" style={{ fontSize: 11 }} title="This project's spend · today's org-wide spend vs the daily cap (INV-GEN-004)">
        <b>${Number(cost).toFixed(2)}</b>
        <span className="muted"> · today ${spentToday.toFixed(2)}/${config.gen.quota.dailyUsdPerOrg.toFixed(0)}</span>
      </span>
      <LiveRefresh projectId={id} />
      {activeKinds.size > 0 && (
        <span className="mono gen-pulse" style={{ fontSize: 10 }}>
          ● {[...activeKinds].map((k) => kindLabel[k] ?? k).join(" + ")}…
        </span>
      )}
      <AnimaticPlayer
        shots={railShots.map((s) => ({ id: s.id, durationS: s.durationS, frameAssetId: s.thumbAssetId, title: s.title }))}
        musicAssetId={music?.activeTrackAssetId}
      />
      <form action={exportAction} style={{ display: "flex", gap: 5, alignItems: "center" }} title={progress.ready ? "Export the full cut" : "Takeless shots are skipped explicitly (INV-ASM-002)"}>
        <input type="hidden" name="projectId" value={id} />
        {!progress.ready && <input type="hidden" name="excludeShotIds" value={progress.pending.join(",")} />}
        {captionSelect}
        <SubmitButton primary disabled={progress.generated === 0} pendingLabel="Exporting…">
          {progress.ready ? "Export cut" : `Export ${progress.generated} · skip ${progress.total - progress.generated}`}
        </SubmitButton>
      </form>
    </>
  );

  // ── Stage: one shot ─────────────────────────────────────────────────────
  const stagePanels: Record<string, React.ReactNode> = {};
  for (const s of shots) {
    const dd = s.direction as { synopsis?: string; subject?: string; action?: string; camera?: string; mood?: string; dialogue?: string; audioNotes?: string };
    const cands = candidatesByShot.get(s.id)!;
    const busy = activeByShot.get(s.id) ?? { frame: 0, take: 0 };
    const status = shotStatus({ selectedTakeId: s.selectedTakeId, frameCount: cands.frames.length });
    const selectedTake = cands.takes.find((t) => t.id === s.selectedTakeId);
    const selFrame = cands.frames.find((f) => f.id === s.selectedStartFrameId);
    const entities = cast.map((e) => ({ kind: e.kind, name: e.name, description: e.description }));
    const dirIn = {
      synopsis: dd.synopsis ?? "", subject: dd.subject ?? "", action: dd.action ?? "",
      camera: dd.camera, mood: dd.mood, dialogue: dd.dialogue, audioNotes: dd.audioNotes,
    };
    const autoImage = assembleFramePrompt({ aspectRatio: p.aspectRatio, entities, direction: dirIn, stylePrompt: activeStylePrompt });
    const autoVideo = assembleTakePrompt({ aspectRatio: p.aspectRatio, durationSeconds: Number(s.durationS), entities, direction: dirIn, stylePrompt: activeStylePrompt });
    const castRefs = cast.flatMap((e) => e.refAssetIds);
    const effectiveRefs = s.refAssetIds ?? castRefs;
    const est = estimateTake(Number(s.durationS));
    const estDiffers = est.effectiveSeconds !== Number(s.durationS);

    stagePanels[s.id] = (
      <div style={{ maxWidth: 1460 }}>
        {/* Shot header — order & removal live where you're looking at the shot */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
          <span className="mono muted" style={{ fontSize: 12 }}>{s.position}</span>
          <h2 className="disp" style={{ fontSize: 15 }}>{s.title}</h2>
          <span className="mono muted" style={{ fontSize: 11 }}>{s.durationS}s</span>
          <span className="mono" style={{ fontSize: 10, color: status === "generated" ? "var(--ok)" : status === "framed" ? "var(--accent)" : "var(--ink-2)" }}>{status}</span>
          {(s.animation as { text?: string } | null)?.text && (
            <span className="mono" style={{ fontSize: 9.5, color: "var(--accent)", border: "1px dashed var(--accent)", borderRadius: 4, padding: "1px 6px" }} title="Plan-authored animation shot — renders free via Remotion">✦ animation</span>
          )}
          {(busy.frame > 0 || busy.take > 0) && <span className="mono gen-pulse" style={{ fontSize: 10 }}>● generating…</span>}
          <div style={{ marginLeft: "auto", display: "flex", gap: 5, alignItems: "center" }}>
            <form action={removeShotAction}>
              <input type="hidden" name="projectId" value={id} />
              <input type="hidden" name="shotId" value={s.id} />
              {s.selectedTakeId && <input type="hidden" name="confirmPaid" value="1" />}
              <SubmitButton small title={s.selectedTakeId ? "Removes this cut AND its paid take" : "Remove this cut"}>
                ✕ {s.selectedTakeId ? "cut (discards take)" : "cut"}
              </SubmitButton>
            </form>
          </div>
        </div>
        {dd.synopsis && <p className="muted" style={{ fontSize: 12.5, marginBottom: 10 }}>{dd.synopsis}</p>}

        {/* REQ-STB-040: length editing where the consequence is spelled out — crop is free,
            a shortfall needs a regenerate (USER 2026-07-25). */}
        {(() => {
          const tb = timelineByShot.get(s.id);
          if (!tb) return null;
          return (
            <div style={{ ...sub, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 14 }}>
              <span className="mono muted" style={{ fontSize: 9.5 }}>
                {`${Math.floor(tb.startS / 60)}:${String(Math.round(tb.startS % 60)).padStart(2, "0")}`}
                {" → "}
                {`${Math.floor(tb.endS / 60)}:${String(Math.round(tb.endS % 60)).padStart(2, "0")}`}
                {" in the cut"}
              </span>
              {timeline.boundaries.length > 0 && (
                <span className="mono" style={{ fontSize: 9.5, color: tb.onBoundary ? "var(--ok)" : "var(--ink-2)" }}
                  title={tb.onBoundary ? "This cut lands exactly on a music section change" : "This cut falls mid-section — try a sync suggestion in the Music panel"}>
                  {tb.onBoundary ? "♪ on the beat" : "♪ off the beat"}
                </span>
              )}
              <form action={updateShotDurationAction} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input type="hidden" name="projectId" value={id} />
                <input type="hidden" name="shotId" value={s.id} />
                <label className="mono muted" style={{ fontSize: 9.5 }}>length</label>
                <input name="durationS" type="number" step="0.5" min={config.shot.minSeconds} max={config.shot.maxSeconds}
                  defaultValue={Number(s.durationS)} style={{ ...tiny, width: 62 }} />
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
              {!s.selectedTakeId && <span className="mono muted" style={{ fontSize: 9.5 }}>no take yet — length only sets what gets generated</span>}
            </div>
          );
        })()}

        {/* Selected take plays big — this is what the cut will use */}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div style={{ flex: "1 1 520px", minWidth: 320 }}>
            {selectedTake ? (
              // REQ-ASM-014: the clip plays with the project track under it, from its own position
              <ClipPlayer
                videoAssetId={selectedTake.videoAssetId}
                musicAssetId={music?.activeTrackAssetId ?? null}
                startS={timelineByShot.get(s.id)?.startS ?? 0}
                durationS={Number(s.durationS)}
                mixMode={p.audioMixMode as "native" | "music" | "mix"}
                label={`selected take ${selectedTake.id.slice(-4)} · ${selectedTake.durationActualS ?? s.durationS}s — this is what the export uses`}
              />
            ) : selFrame ? (
              <ZoomImage src={`/api/assets/${selFrame.imageAssetId}`} alt="start frame"
                style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", borderRadius: 10, border: "1px solid var(--line)" }} />
            ) : (
              <div style={{ width: "100%", aspectRatio: "16/9", borderRadius: 10, border: "1px dashed var(--line)", display: "grid", placeItems: "center" }}>
                <p className="mono muted" style={{ fontSize: 11 }}>no frame yet — generate one below</p>
              </div>
            )}
            {!selectedTake && (
              <p className="mono muted" style={{ fontSize: 9.5, marginTop: 5 }}>
                {selFrame ? "selected start frame — no take yet" : "planned"}
              </p>
            )}
            {/* REQ-ASM-015: choose take audio / music / both right where you hear it */}
            {selectedTake && (
              <div style={{ ...sub, marginTop: 8 }}>
                <AudioModePicker projectId={id} mode={p.audioMixMode as "native" | "music" | "mix"} hasTrack={Boolean(music?.activeTrackAssetId)} compact />
              </div>
            )}
          </div>

          {/* Buy actions sit next to the preview, not two screens away */}
          <div style={{ flex: "0 1 300px", display: "grid", gap: 8 }}>
            <div style={sub}>
              <p className="mono muted" style={{ ...label, marginBottom: 8 }}>GENERATE</p>
              <div style={{ display: "grid", gap: 6 }}>
                <form action={generateFrameAction}>
                  <input type="hidden" name="projectId" value={id} />
                  <input type="hidden" name="shotId" value={s.id} />
                  <SubmitButton disabled={busy.frame > 0} pendingLabel="Framing…">
                    ＋ {config.frame.candidatesDefault} frames ≈ ${(config.frame.candidatesDefault * priceTable.imagePerImageUsd.standard).toFixed(2)}
                  </SubmitButton>
                </form>
                <form action={generateTakeAction}>
                  <input type="hidden" name="projectId" value={id} />
                  <input type="hidden" name="shotId" value={s.id} />
                  <SubmitButton primary disabled={busy.take > 0} pendingLabel="Generating take…"
                    {...(estDiffers ? { title: `${config.gen.videoRoute} runs this as ${est.effectiveSeconds}s (shot says ${Number(s.durationS)}s)` } : {})}>
                    ▸ Take ≈ ${est.usd.toFixed(2)}{estDiffers ? ` · ${est.effectiveSeconds}s` : ""}
                  </SubmitButton>
                </form>
              </div>
              <form action={animationTakeAction} style={{ display: "grid", gap: 5, marginTop: 10, borderTop: "1px solid var(--line)", paddingTop: 10 }}>
                <input type="hidden" name="projectId" value={id} />
                <input type="hidden" name="shotId" value={s.id} />
                <p className="mono muted" style={{ fontSize: 9.5 }}>OR RENDER A GRAPHIC — free, local</p>
                {/* REQ-STB-036: every full-frame template is choosable */}
                <select name="template" defaultValue={((s.animation as { template?: string } | null)?.template) ?? "title"} className="mono" title="title card · kinetic type · stat count-up · quote card · checklist reveal" style={tiny}>
                  {fullFrameAnimationTemplates.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <input name="text" required defaultValue={(s.animation as { text?: string } | null)?.text ?? ""} placeholder="✦ headline text…" className="mono" style={tiny} />
                <input name="subtext" defaultValue={(s.animation as { subtext?: string } | null)?.subtext ?? ""} placeholder="subtext · quote author · items a|b|c" className="mono" title="Subtitle (title/stat), attribution (quote), or | separated items (checklist)" style={tiny} />
                <SubmitButton small disabled={busy.take > 0} pendingLabel="Rendering…">✦ Animate · free</SubmitButton>
              </form>
            </div>
          </div>
        </div>

        {/* Takes — side by side, big enough to actually judge */}
        <div style={{ ...card, marginTop: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <p className="mono muted" style={label}>TAKES · {cands.takes.length}</p>
            <ABCompare takes={cands.takes.map((t) => ({ id: t.id, videoAssetId: t.videoAssetId, label: `take ${t.id.slice(-4)}${t.retakeOf ? " (retake)" : ""}` }))} />
            {busy.take > 0 && <span className="mono gen-pulse" style={{ fontSize: 10 }}>● generating video…</span>}
          </div>
          {cands.takes.length === 0 ? (
            <p className="muted" style={{ fontSize: 11.5 }}>No takes yet.</p>
          ) : (
            <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 4 }}>
              {cands.takes.map((t) => {
                const isSel = s.selectedTakeId === t.id;
                const cond = takeCondFrame.get(t.generationId);
                const staleFrame = cond && selFrame && cond !== selFrame.imageAssetId;
                return (
                  <div key={t.id} style={{ flex: "0 0 268px", display: "grid", gap: 6 }}>
                    <video src={`/api/assets/${t.videoAssetId}`} controls playsInline preload="metadata"
                      style={{ width: "100%", aspectRatio: "16/9", borderRadius: 8, background: "#000", border: isSel ? "2px solid var(--accent)" : "1px solid var(--line)" }} />
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span className="mono muted" style={{ fontSize: 9.5 }}>take {t.id.slice(-4)} · {t.durationActualS ?? s.durationS}s</span>
                      {isSel ? (
                        <span className="mono" style={{ fontSize: 9.5, color: "var(--accent)" }}>✓ selected</span>
                      ) : (
                        <>
                          <form action={selectTakeAction}>
                            <input type="hidden" name="projectId" value={id} />
                            <input type="hidden" name="shotId" value={s.id} />
                            <input type="hidden" name="takeId" value={t.id} />
                            <SubmitButton small pendingLabel="…">Use this</SubmitButton>
                          </form>
                          <form action={removeCandidateAction}>
                            <input type="hidden" name="projectId" value={id} />
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
                      <input type="hidden" name="projectId" value={id} />
                      <input type="hidden" name="takeId" value={t.id} />
                      <input name="instruction" required placeholder="retake: slower camera…" className="mono" style={{ ...tiny, flex: 1, minWidth: 0 }} />
                      <SubmitButton small disabled={busy.take > 0} title="Adjusted take, conditioned like this one (same price)" pendingLabel="…">↻</SubmitButton>
                    </form>
                    <form action={overlayTakeAction} style={{ display: "flex", gap: 4 }}>
                      <input type="hidden" name="projectId" value={id} />
                      <input type="hidden" name="takeId" value={t.id} />
                      <input name="text" required placeholder="overlay text…" className="mono" style={{ ...tiny, flex: 1, minWidth: 0 }} />
                      <SubmitButton small disabled={busy.take > 0} title="Composite an animated lower-third onto this take — free, local" pendingLabel="…">✦</SubmitButton>
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
            START FRAMES · pick 1 — only the selected frame conditions the video model
            {busy.frame > 0 && <span className="gen-pulse"> ● generating image…</span>}
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {cands.frames.map((f) => (
              <div key={f.id} style={{ display: "grid", gap: 4, justifyItems: "start" }}>
                <form action={selectFrameAction}>
                  <input type="hidden" name="projectId" value={id} />
                  <input type="hidden" name="shotId" value={s.id} />
                  <input type="hidden" name="frameCandidateId" value={f.id} />
                  <button type="submit" style={{ all: "unset", cursor: "pointer", display: "block" }} title="Use this frame">
                    <div style={{ width: 158, aspectRatio: "16/9", borderRadius: 7, overflow: "hidden", position: "relative", background: "#0a0c10", border: s.selectedStartFrameId === f.id ? "2px solid var(--accent)" : "1px solid var(--line)" }}>
                      <ZoomImage src={`/api/assets/${f.imageAssetId}?thumb=1`} alt={`frame ${f.id.slice(-4)}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      {s.selectedStartFrameId === f.id && (
                        <span style={{ position: "absolute", right: 5, top: 5, width: 15, height: 15, borderRadius: "50%", background: "var(--accent)", color: "#12151b", fontSize: 10, fontWeight: 700, display: "grid", placeItems: "center" }}>✓</span>
                      )}
                    </div>
                  </button>
                </form>
                {s.selectedStartFrameId !== f.id && (
                  <form action={removeCandidateAction}>
                    <input type="hidden" name="projectId" value={id} />
                    <input type="hidden" name="kind" value="frame" />
                    <input type="hidden" name="id" value={f.id} />
                    <button type="submit" className="mono" title="Remove candidate (asset kept)" style={{ background: "none", border: "1px solid var(--line)", borderRadius: 5, color: "var(--ink-2)", fontSize: 9, padding: "1px 6px", cursor: "pointer" }}>✕ remove</button>
                  </form>
                )}
              </div>
            ))}
            {cands.frames.length === 0 && <p className="muted" style={{ fontSize: 11.5 }}>No frames yet.</p>}
          </div>
        </div>

        {/* Prompts */}
        <form action={saveScriptsAndGenerateAction} style={{ ...card, marginTop: 12 }}>
          <input type="hidden" name="projectId" value={id} />
          <input type="hidden" name="shotId" value={s.id} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 5 }}>
                <p className="mono muted" style={label}>IMAGE SCRIPT {s.imagePrompt ? "· custom" : "· auto"}</p>
                {effectiveRefs.map((rid) => (
                  <ZoomImage key={rid} src={`/api/assets/${rid}?thumb=1`} alt="reference" style={{ width: 20, height: 20, borderRadius: 4, objectFit: "cover", border: "1px solid var(--line)" }} />
                ))}
              </div>
              <textarea name="imagePrompt" rows={4} defaultValue={s.imagePrompt ?? ""} placeholder={autoImage}
                style={{ width: "100%", background: "var(--stage)", border: "1px solid var(--line)", borderRadius: 6, padding: "6px 8px", color: "var(--ink)", fontSize: 11, fontFamily: "var(--mono)", resize: "vertical" }} />
            </div>
            <div>
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 5 }}>
                <p className="mono muted" style={label}>VIDEO SCRIPT {s.videoPrompt ? "· custom" : "· auto"}</p>
                {selFrame && <ZoomImage src={`/api/assets/${selFrame.imageAssetId}?thumb=1`} alt="start frame" style={{ width: 20, height: 20, borderRadius: 4, objectFit: "cover", border: "1px solid var(--accent)" }} />}
                {effectiveRefs.map((rid) => (
                  <ZoomImage key={rid} src={`/api/assets/${rid}?thumb=1`} alt="reference" style={{ width: 20, height: 20, borderRadius: 4, objectFit: "cover", border: "1px solid var(--line)" }} />
                ))}
              </div>
              <textarea name="videoPrompt" rows={4} defaultValue={s.videoPrompt ?? ""} placeholder={autoVideo}
                style={{ width: "100%", background: "var(--stage)", border: "1px solid var(--line)", borderRadius: 6, padding: "6px 8px", color: "var(--ink)", fontSize: 11, fontFamily: "var(--mono)", resize: "vertical" }} />
            </div>
          </div>
          <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button type="submit" name="generate" value="none" style={btn}>Save</button>
            <button type="submit" name="generate" value="frame" disabled={busy.frame > 0} style={{ ...btnPrimary, opacity: busy.frame > 0 ? 0.45 : 1 }}>Save &amp; generate frame</button>
            <button type="submit" name="generate" value="take" disabled={busy.take > 0} style={{ ...btnPrimary, opacity: busy.take > 0 ? 0.45 : 1 }}>Save &amp; generate take</button>
            <span className="mono muted" style={{ fontSize: 9 }}>empty = auto · custom text sent verbatim</span>
          </div>
          {cast.length > 0 && (
            <details style={{ marginTop: 8 }}>
              <summary className="mono muted" style={{ fontSize: 10, cursor: "pointer" }}>
                refs for this shot: {s.refAssetIds === null ? "whole cast (default)" : `${effectiveRefs.length} selected`} · edit
              </summary>
            </details>
          )}
        </form>
        {cast.length > 0 && (
          <form action={updateShotRefsAction} style={{ ...card, marginTop: 8, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <input type="hidden" name="projectId" value={id} />
            <input type="hidden" name="shotId" value={s.id} />
            <p className="mono muted" style={label}>REFS FOR THIS SHOT</p>
            {cast.map((e) => e.refAssetIds.map((rid) => (
              <label key={rid} className="mono muted" style={{ display: "flex", gap: 5, alignItems: "center", fontSize: 10 }}>
                <input type="checkbox" name="refAssetIds" value={rid} defaultChecked={(s.refAssetIds ?? castRefs).includes(rid)} />
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

  // ── Stage: the film ─────────────────────────────────────────────────────
  const filmPanel = (
    <div style={{ maxWidth: 1180 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
        <h2 className="disp" style={{ fontSize: 15 }}>The film</h2>
        {newestExport && (
          <span className="mono muted" style={{ fontSize: 9.5 }}>newest export · #{newestExport.id.slice(-6)}</span>
        )}
        <div style={{ marginLeft: "auto" }}>
          {/* USER 2026-07-25: the animatic belongs next to the cut, not in a corner of the header */}
          <AnimaticPlayer
            shots={railShots.map((s) => ({ id: s.id, durationS: s.durationS, frameAssetId: s.thumbAssetId, title: s.title }))}
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
            shots={railShots.map((s) => ({ id: s.id, durationS: s.durationS, frameAssetId: s.thumbAssetId, title: s.title }))}
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

  const addShotPanel = (
    <div style={{ maxWidth: 620 }}>
      <h2 className="disp" style={{ fontSize: 15, marginBottom: 10 }}>Add a shot</h2>
      <form action={createShotAction} style={{ ...card, display: "grid", gap: 8 }}>
        <input type="hidden" name="projectId" value={id} />
        <input name="title" placeholder="Shot title" required style={input} />
        <input name="synopsis" placeholder="What happens (synopsis)" style={input} />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input name="subject" placeholder="Subject" style={{ ...input, flex: "1 1 140px" }} />
          <input name="action" placeholder="Action" style={{ ...input, flex: "1 1 140px" }} />
          <input name="durationS" type="number" step="0.5" min={config.shot.minSeconds} max={config.shot.maxSeconds} defaultValue={config.shot.defaultSeconds} title="Duration in seconds" style={{ ...input, width: 84 }} />
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <SubmitButton primary pendingLabel="Adding…">Add shot</SubmitButton>
          <span className="mono muted" style={{ fontSize: 9.5 }}>appends to the end — reorder with ↑↓ on the shot</span>
        </div>
      </form>
    </div>
  );

  // ── Drawer panels ───────────────────────────────────────────────────────
  const scriptPanel = (
    <>
      {lastFailure && (
        <section style={{ ...card, marginBottom: 12, borderColor: "#7a4b3a" }}>
          <p className="mono" style={{ fontSize: 10.5, color: "#e0763a" }}>{lastFailure.kind} failed · {lastFailure.errorCode}: {lastFailure.errorDetail?.slice(0, 200)}</p>
          <p className="muted" style={{ fontSize: 10.5, marginTop: 4 }}>
            {lastFailure.kind === "music"
              ? "The music model blocked this brief — regenerate the brief, then the track. Failures are never charged."
              : "Adjust the prompt and try again — failures are never charged."}
          </p>
        </section>
      )}
      <Section title="VIDEO PROMPT — feeds script, shots & music">
        <form action={updateBriefAction} style={{ display: "grid", gap: 8 }}>
          <input type="hidden" name="projectId" value={id} />
          <textarea name="idea" rows={3} defaultValue={String((p.brief as Record<string, unknown>)?.idea ?? "")}
            placeholder="e.g. a sunrise launch film for our energy drink — bold, kinetic, city waking up"
            style={{ width: "100%", background: "var(--stage)", border: "1px solid var(--line)", borderRadius: 7, padding: "8px 10px", color: "var(--ink)", fontSize: 12, resize: "vertical" }} />
          <SubmitButton small pendingLabel="Saving…">Save prompt</SubmitButton>
        </form>
        <form action={setArchetypeAction} style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 8 }}>
          <input type="hidden" name="projectId" value={id} />
          <select name="archetype" defaultValue={p.archetype ?? ""} className="mono" title="Directing archetype (docs/87) — injects the recipe into script, shot plan and music prompts" style={{ ...tiny, flex: 1 }}>
            <option value="">directing: freeform</option>
            {Object.entries(styleCards).map(([k, a]) => <option key={k} value={k}>directing: {a.name}</option>)}
          </select>
          <SubmitButton small pendingLabel="…">Set</SubmitButton>
        </form>
      </Section>

      <Section
        title={latestScript ? `SCRIPT · v${latestScript.version} · ${versions.length} version${versions.length > 1 ? "s" : ""}` : "SCRIPT"}
        action={
          <>
            <form action={draftScriptAction}>
              <input type="hidden" name="projectId" value={id} />
              <SubmitButton small primary={!latestScript} disabled={activeKinds.has("script")} pendingLabel="Drafting…">
                {latestScript ? "Redraft" : "Draft script"}
              </SubmitButton>
            </form>
            <form action={proposePlanAction}>
              <input type="hidden" name="projectId" value={id} />
              <SubmitButton small primary disabled={!latestScript || activeKinds.has("shot_plan")} pendingLabel="Planning…">
                Break into shots
              </SubmitButton>
            </form>
          </>
        }
      >
        {latestScript ? (
          <div style={{ fontSize: 12.5 }}><Markdown>{latestScript.content}</Markdown></div>
        ) : (
          <p className="muted" style={{ fontSize: 12 }}>No script yet — draft one from the video prompt.</p>
        )}
      </Section>

      {proposals.map((prop) => {
        const planned = normalizePlannedShots(prop.changes);
        return (
          <Section
            key={prop.id}
            title={`SHOT PLAN · ${prop.status}`}
            action={prop.status === "proposed" ? (
              <form action={applyPlanAction} style={{ display: "flex", gap: 6 }}>
                <input type="hidden" name="projectId" value={id} />
                <input type="hidden" name="proposalId" value={prop.id} />
                <SubmitButton small title="Replaces shots with no takes; shots with takes are kept (INV-STB-007)" pendingLabel="…">Apply {planned.length}</SubmitButton>
                <SubmitButton small primary name="generateFrames" value="1" title="Apply and generate the first frames" pendingLabel="…">Apply + frames</SubmitButton>
              </form>
            ) : undefined}
          >
            <div style={{ display: "grid", gap: 5 }}>
              {planned.map((s, i) => (
                <div key={i} style={{ display: "flex", gap: 8, fontSize: 11.5, borderTop: "1px solid var(--line)", paddingTop: 5 }}>
                  <span className="mono muted">{i + 1}</span>
                  <b style={{ flex: "0 0 auto" }}>{s.title}</b>
                  <span className="muted" style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.direction.synopsis}</span>
                  <span className="mono muted" style={{ marginLeft: "auto" }}>{s.durationS}s</span>
                </div>
              ))}
            </div>
          </Section>
        );
      })}
    </>
  );

  const musicPanel = (
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

  const castPanel = (
    <>
      <CastBar
        projectId={id}
        entities={orgEntities.map((e) => ({ id: e.id, kind: e.kind, name: e.name, refAssetIds: e.refAssetIds, hasProfile: Boolean(e.profile) }))}
        castIds={castIds}
        note="checked members (and their profiles) feed every prompt"
      />
      <p className="mono muted" style={{ fontSize: 9.5, marginTop: 10 }}>
        Per-shot reference overrides live on each shot, under its prompts.
      </p>
    </>
  );

  const outputPanel = (
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

  const drawerPanels: Record<DrawerTab, React.ReactNode> = {
    script: scriptPanel,
    music: musicPanel,
    cast: castPanel,
    output: outputPanel,
  };

  return (
    <Workspace
      projectId={id}
      shots={railShots}
      commandBar={commandBar}
      stagePanels={stagePanels}
      filmPanel={filmPanel}
      addShotPanel={addShotPanel}
      drawerPanels={drawerPanels}
      timeline={timeline}
      onMove={moveShotTo.bind(null, id)}
      drawerBadges={{
        script: latestScript ? `v${latestScript.version}` : "—",
        music: music?.activeTrackAssetId ? "♫" : music ? "brief" : "—",
        cast: String(cast.length),
        output: exports_.length ? String(exports_.length) : "—",
      }}
    />
  );
}
