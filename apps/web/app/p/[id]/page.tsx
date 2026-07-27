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
import { castingGaps, normalizePlannedCast } from "@avd/stb/casting"; // REQ-STB-048
import { chainFor, chainLabels, generationBlocker, handoffState } from "@avd/stb/chain"; // REQ-STB-055/056/058
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
  cancelGenerationAction, castMemberAction, compileStyleCardAction, critiquePlanAction, critiqueScriptAction, generateChainAction, refreshHandoffAction, setArchetypeAction, setContinuityAction, setProjectStyleAction, setTargetDurationAction, transcribeTrackAction,
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
import { btn, btnPrimary, card, input, label, sub, tiny, Section } from "./panels/ui";
import { StagePanel } from "./panels/StagePanel";

export const dynamic = "force-dynamic";



export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = db();
  const [p] = await d.select().from(project).where(eq(project.id, id));
  if (!p) notFound();

  // REQ-GEN-027 (USER 2026-07-26 "two videos seem stuck"): recovery used to require dispatching
  // NEW work, which the person staring at a stuck shot never does. Reading the project heals it.
  const { sweepStuckGenerations } = await import("@avd/gen");
  await sweepStuckGenerations(d, id); // this project only

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
  // REQ-GEN-034: the in-flight rows themselves, so a stuck one can be cancelled by id.
  const activeRowsByShot = new Map<string, Array<{ id: string; kind: string; since: Date }>>();
  for (const g of activeGens) {
    const shotId = (g.target as { shotId?: string }).shotId;
    if (!shotId) continue;
    activeRowsByShot.set(shotId, [...(activeRowsByShot.get(shotId) ?? []),
      { id: g.id, kind: g.kind, since: g.startedAt ?? g.createdAt }]);
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
  const briefIdea = String((p.brief as Record<string, unknown>)?.idea ?? "").trim();
  const { getProjectStyleCard } = await import("@avd/prj/service");
  const projectCard = await getProjectStyleCard(d, id); // SR-DIR-008
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

  // REQ-GEN-027: a failed take or frame used to be INVISIBLE — the banner only covered text kinds,
  // so a shot simply stopped saying "working" and showed nothing at all.
  const failedVisual = await d
    .select()
    .from(generation)
    .where(and(eq(generation.projectId, id), eq(generation.status, "failed"),
      inArray(generation.kind, ["frame", "take", "retake", "animation", "image_edit"])))
    .orderBy(desc(generation.createdAt))
    .limit(20);
  const failedByShot = new Map<string, typeof failedVisual[number]>();
  for (const g of failedVisual) {
    const shotId = (g.target as { shotId?: string }).shotId;
    if (shotId && !failedByShot.has(shotId)) failedByShot.set(shotId, g); // newest per shot
  }

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
  // REQ-STB-056: display numbers where a chain reads as one shot with sub-clips (4, 4.1, 4.2).
  const shotLabels = chainLabels(shots.map((x) => ({
    id: x.id, title: x.title, position: x.position,
    continuesFromShotId: x.continuesFromShotId, selectedTakeId: x.selectedTakeId,
  })));

  const timeline = buildTimeline({
    shots: shots.map((s) => {
      const sel = candidatesByShot.get(s.id)!.takes.find((t) => t.id === s.selectedTakeId);
      return {
        id: s.id,
        title: `${shotLabels.get(s.id) ?? s.position}. ${s.title}`, // REQ-STB-056
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
      label: shotLabels.get(s.id) ?? String(s.position),
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
        shots={railShots.map((s) => ({ id: s.id, durationS: s.durationS, frameAssetId: s.thumbAssetId, title: `${s.label}. ${s.title}` }))}
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
  for (const [i, s] of shots.entries()) {
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
    // REQ-STB-055: where this shot sits in its continuity chain, and whether it can be generated yet.
    const chainShots = shots.map((x) => ({ id: x.id, title: x.title, position: x.position, continuesFromShotId: x.continuesFromShotId, selectedTakeId: x.selectedTakeId }));
    const chain = chainFor(chainShots, s.id);
    // REQ-STB-058: did this shot's start frame ACTUALLY come from the source take, or is it an
    // older frame the automatic handoff refused to overwrite?
    const contSource = s.continuesFromShotId ? shots.find((x) => x.id === s.continuesFromShotId) : undefined;
    const sourceTake = contSource
      ? candidatesByShot.get(contSource.id)?.takes.find((t) => t.id === contSource.selectedTakeId)
      : undefined;
    const startFrameGenerationId = cands.frames.find((f) => f.id === s.selectedStartFrameId)?.generationId ?? null;
    const handoff = handoffState({
      hasSource: Boolean(s.continuesFromShotId),
      sourceTakeGenerationId: sourceTake?.generationId ?? null,
      startFrameGenerationId,
    });
    const blocked = generationBlocker(chainShots, s.id);
    const est = estimateTake(Number(s.durationS));
    const estDiffers = est.effectiveSeconds !== Number(s.durationS);

    stagePanels[s.id] = (
      // REQ-STB-045: the key stays HERE. Without it React reuses the DOM across shots and the
      // uncontrolled prompt boxes keep the previous shot's text.
      <StagePanel
        key={s.id}
        shot={s}
        index={i}
        projectId={id}
        shotCount={shots.length}
        cost={cost}
        dd={dd}
        cands={cands}
        busy={busy}
        status={status}
        selectedTake={selectedTake}
        selFrame={selFrame}
        autoImage={autoImage}
        autoVideo={autoVideo}
        castRefs={castRefs}
        effectiveRefs={effectiveRefs}
        chain={chain}
        handoff={handoff}
        blocked={blocked}
        est={est}
        estDiffers={estDiffers}
        cast={cast}
        music={music}
        sync={sync}
        shotLabels={shotLabels}
        takeCondFrame={takeCondFrame}
        shots={shots}
        activeByShot={activeByShot}
        activeRowsByShot={activeRowsByShot}
        failedByShot={failedByShot}
        timeline={timeline}
        timelineByShot={timelineByShot}
        audioMixMode={p.audioMixMode}
      />
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
          <select name="archetype" defaultValue={p.archetype ?? ""} className="mono" title="Directing style — injects the recipe into script, shot plan, music and picture prompts" style={{ ...tiny, flex: 1 }}>
            {/* Honest state: with a compiled card active the picker used to read "freeform". */}
            <option value="">{projectCard ? `directing: ✦ ${projectCard.name} (compiled)` : "directing: freeform"}</option>
            {Object.entries(styleCards).map(([k, a]) => <option key={k} value={k}>directing: {a.name}</option>)}
          </select>
          <SubmitButton small pendingLabel="…">Set</SubmitButton>
        </form>

        {/* REQ-PRJ-006: the runtime was shown in the header but nowhere editable. */}
        <form action={setTargetDurationAction} style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 8 }}>
          <input type="hidden" name="projectId" value={id} />
          <label className="mono muted" style={{ fontSize: 10 }}>runtime</label>
          <input name="seconds" type="number" min={config.project.minTargetSeconds} max={config.project.maxTargetSeconds}
            defaultValue={Math.round(Number(p.targetDurationS))} style={{ ...tiny, width: 66 }} />
          <span className="mono muted" style={{ fontSize: 10 }}>s — what the shot plan aims for</span>
          <SubmitButton small pendingLabel="…">Set</SubmitButton>
        </form>

        {/* SR-DIR-008: compile the prompt above into a seventh, project-specific card. */}
        <form action={compileStyleCardAction} style={{ marginTop: 8 }}>
          <input type="hidden" name="projectId" value={id} />
          <input type="hidden" name="brief" value={String((p.brief as Record<string, unknown>)?.idea ?? "")} />
          <SubmitButton small disabled={!briefIdea} pendingLabel="Researching the style…">
            ✦ Direct from my prompt {briefIdea ? "· free" : "· save a prompt first"}
          </SubmitButton>
          <p className="mono muted" style={{ fontSize: 9, marginTop: 4 }}>
            Names a director, film or genre in your prompt? This researches it and compiles the look into craft
            direction — framing, camera, palette, pacing, and what the style refuses.
          </p>
        </form>

        {projectCard && (
          <div style={{ ...sub, marginTop: 8, borderColor: "var(--accent)" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
              <p className="mono" style={{ fontSize: 11, fontWeight: 700 }}>✦ {projectCard.name}</p>
              <span className="mono muted" style={{ fontSize: 9 }}>compiled from your prompt · overrides the picker</span>
            </div>
            {projectCard.provenance.references.length > 0 && (
              <p className="mono muted" style={{ fontSize: 9, marginTop: 3 }}>
                researched: {projectCard.provenance.references.join(" · ")} — kept for reference only, never sent to an image model
              </p>
            )}
            <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "2px 10px", margin: "7px 0 0", fontSize: 10.5 }}>
              <dt className="mono muted">camera</dt>
              <dd style={{ margin: 0 }}>{projectCard.camera.allowedMovements.join(", ")} · {projectCard.camera.preferredSizes.join("/")}</dd>
              <dt className="mono muted">pacing</dt>
              <dd style={{ margin: 0 }}>{projectCard.pacing.durationWindowS.join("–")}s per shot{projectCard.structure.shotCountHint ? ` · ${projectCard.structure.shotCountHint.join("–")} shots` : ""}</dd>
              <dt className="mono muted">palette</dt>
              <dd style={{ margin: 0, display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: projectCard.palette.accent, border: "1px solid var(--line)" }} />
                <span style={{ width: 10, height: 10, borderRadius: 2, background: projectCard.palette.background, border: "1px solid var(--line)" }} />
                <span className="muted">{projectCard.palette.notes}</span>
              </dd>
              {projectCard.humour && (<><dt className="mono muted">humour</dt><dd style={{ margin: 0 }}>{projectCard.humour}</dd></>)}
              <dt className="mono muted">refuses</dt>
              <dd style={{ margin: 0 }}>{projectCard.antiNotes.join(" · ")}</dd>
            </dl>
          </div>
        )}
      </Section>

      <Section
        title={latestScript ? `SCRIPT · v${latestScript.version} · ${versions.length} version${versions.length > 1 ? "s" : ""}` : "SCRIPT"}
        action={
          <>
            {latestScript && (
              // REQ-STB-052: catch runtime, structure and casting faults HERE, before the script
              // is broken into shots and the fault is split across ten of them.
              <form action={critiqueScriptAction}>
                <input type="hidden" name="projectId" value={id} />
                <SubmitButton small disabled={activeKinds.has("script")}
                  title="Four reviewers read the script — runtime, story, cast, voice — and write an improved version"
                  pendingLabel="Reviewing…">↻ Critique &amp; improve</SubmitButton>
              </form>
            )}
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
        // REQ-STB-048: who this plan needs on screen that the project has not cast yet.
        const gaps = castingGaps(normalizePlannedCast(prop.changes), cast.map((e) => ({ name: e.name, refAssetIds: e.refAssetIds })));
        return (
          <Section
            key={prop.id}
            title={`SHOT PLAN · ${prop.status}`}
            action={prop.status === "proposed" ? (
              <form action={applyPlanAction} style={{ display: "flex", gap: 6 }}>
                <input type="hidden" name="projectId" value={id} />
                <input type="hidden" name="proposalId" value={prop.id} />
                <SubmitButton small formAction={critiquePlanAction}
                  title="Four reviewers read this plan — pacing, continuity, casting, story — and propose a fixed one"
                  pendingLabel="Reviewing…">↻ Critique &amp; improve</SubmitButton>
                <SubmitButton small title="Replaces shots with no takes; shots with takes are kept (INV-STB-007)" pendingLabel="…">Apply {planned.length}</SubmitButton>
                <SubmitButton small primary name="generateFrames" value="1" title="Apply and generate the first frames" pendingLabel="…">Apply + frames</SubmitButton>
              </form>
            ) : undefined}
          >
            {gaps.length > 0 && (
              <div style={{ ...sub, marginBottom: 10, borderColor: "var(--accent)" }}>
                <p className="mono" style={{ fontSize: 10.5, marginBottom: 2 }}>
                  ✦ CASTING — {gaps.length} {gaps.length === 1 ? "entry has" : "entries have"} no reference image
                </p>
                <p className="mono muted" style={{ fontSize: 9.5, marginBottom: 8 }}>
                  Without one, the image model re-invents them in every shot — a face becomes a different face,
                  a room becomes a different room. Generate a reference from the description, or upload your own.
                </p>
                {gaps.map((c) => (
                  <form key={c.name} action={castMemberAction} encType="multipart/form-data"
                    style={{ display: "grid", gap: 5, borderTop: "1px solid var(--line)", paddingTop: 7, marginTop: 7 }}>
                    <input type="hidden" name="projectId" value={id} />
                    <input type="hidden" name="name" value={c.name} />
                    <input type="hidden" name="kind" value={c.kind} />
                    <input type="hidden" name="description" value={c.description} />
                    <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
                      <b style={{ fontSize: 12 }}>{c.name}</b>
                      <span className="mono muted" style={{ fontSize: 9.5 }}>{c.kind}</span>
                    </div>
                    <textarea name="appearance" rows={2} defaultValue={c.appearance}
                      style={{ width: "100%", background: "var(--stage)", border: "1px solid var(--line)", borderRadius: 6, padding: "5px 7px", color: "var(--ink)", fontSize: 10.5, fontFamily: "var(--mono)", resize: "vertical" }} />
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <SubmitButton small primary pendingLabel="Generating…">✦ Generate {c.kind === "location" ? "scene plate" : "portrait"} ≈ $0.07</SubmitButton>
                      <label className="mono muted" style={{ fontSize: 9.5, display: "flex", gap: 5, alignItems: "center" }}>
                        or upload
                        <input type="file" name="portrait" accept="image/*" style={{ fontSize: 9.5, maxWidth: 180 }} />
                      </label>
                    </div>
                  </form>
                ))}
              </div>
            )}

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
