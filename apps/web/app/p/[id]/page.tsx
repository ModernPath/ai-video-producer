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
import { AddShotPanel } from "./panels/AddShotPanel";
import { CastPanel } from "./panels/CastPanel";
import { CommandBar } from "./panels/CommandBar";
import { FilmPanel } from "./panels/FilmPanel";
import { MusicPanel } from "./panels/MusicPanel";
import { OutputPanel } from "./panels/OutputPanel";
import { ScriptPanel } from "./panels/ScriptPanel";
import { cardFor, isMusicLed, musicLedPlanBlocker } from "@avd/stb/music-led"; // REQ-STB-032

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
  // REQ-STB-032 / ADR-013 — music-led films plan against the real track. Pure and free to compute.
  const planBlocker = musicLedPlanBlocker({
    isMusicLed: isMusicLed(cardFor(p)),
    hasTrack: Boolean(music?.activeTrackAssetId),
    hasTranscript: Boolean(music?.transcript?.trim()),
  });
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
  const commandBar = <CommandBar p={p} activeKinds={activeKinds} captionSelect={captionSelect} cost={cost} id={id} kindLabel={kindLabel} music={music} progress={progress} railShots={railShots} shots={shots} spentToday={spentToday} />;

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
  const filmPanel = <FilmPanel exportSnapshots={exportSnapshots} exports_={exports_} id={id} music={music} newestExport={newestExport} progress={progress} railShots={railShots} shareByJob={shareByJob} shots={shots} sync={sync} />;

  const addShotPanel = <AddShotPanel id={id} />;

  // ── Drawer panels ───────────────────────────────────────────────────────
  const scriptPanel = <ScriptPanel p={p} planBlocker={planBlocker} activeKinds={activeKinds} briefIdea={briefIdea} cast={cast} id={id} lastFailure={lastFailure} latestScript={latestScript} music={music} projectCard={projectCard} proposals={proposals} shots={shots} versions={versions} />;

  const musicPanel = <MusicPanel p={p} activeKinds={activeKinds} id={id} music={music} sync={sync} />;

  const castPanel = <CastPanel castIds={castIds} id={id} orgEntities={orgEntities} />;

  const outputPanel = <OutputPanel p={p} captionSelect={captionSelect} id={id} kits={kits} music={music} progress={progress} recentGens={recentGens} />;

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
