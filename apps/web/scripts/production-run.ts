/**
 * Golden-path production driver — runs a REAL full production server-side, staged so a
 * human (or the loop) can review between paid steps. Run from apps/web:
 * MUSIC-FIRST order (BACKLOG 2026-07-24: sync suggestions must shape durations BEFORE takes
 * are bought; the plan prompt also aligns boundaries to the transcript when it exists):
 *   npx tsx scripts/production-run.ts setup "Title" "idea text" [archetype] [entityName]
 *   npx tsx scripts/production-run.ts draft  <projectId>          (script only)
 *   npx tsx scripts/production-run.ts music  <projectId>          (brief -> Lyria track -> transcript)
 *   npx tsx scripts/production-run.ts plan   <projectId>          (propose shots FROM the transcript)
 *   npx tsx scripts/production-run.ts apply  <projectId>          (frames + free animation takes)
 *   npx tsx scripts/production-run.ts sync   <projectId>          (apply exact-hit duration suggestions)
 *   npx tsx scripts/production-run.ts takes  <projectId>          (select frame -> take -> select, per filmed shot)
 *   npx tsx scripts/production-run.ts export <projectId>          (snapshot + ffmpeg export, music mix)
 *   npx tsx scripts/production-run.ts reshoot <projectId> <shotTitle>  (fresh frame + take under current prompts)
 *   npx tsx scripts/production-run.ts retry  <projectId>          (retry newest failed generation, retry_of provenance)
 *   npx tsx scripts/production-run.ts frames <projectId> <shotTitle> [count]  (extra frame candidates on one shot)
 * Route note: GEN_VIDEO_ROUTE=omni switches takes to the Interactions adapter (REQ-GEN-023)
 * and widens the duration palette to 4-10s (REQ-STB-029) — set it on every stage's invocation.
 * Uses the same service calls as apps/web/app/actions.ts; inline queue; real providers.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Real providers need the key; the dev server loads .env.local, tsx does not.
if (!process.env.GEMINI_API_KEY) {
  const env = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../../.env"), "utf8");
  const key = env.match(/^GEMINI_API_KEY=(.+)$/m)?.[1]?.trim();
  if (key) process.env.GEMINI_API_KEY = key;
}
delete process.env.MOCK_GEN; // paid run — never mock
delete process.env.WORKER_MODE; // inline drain

const PRINCIPAL = "user:dev";

async function main() {
  const [stage, ...args] = process.argv.slice(2);
  const { createDb } = await import("@avd/shared/db");
  const { db } = createDb();
  const { eq } = await import("drizzle-orm");
  const { project } = await import("@avd/prj/schema");
  const stb = await import("@avd/stb");
  const { runNextGeneration } = await import("@avd/gen");

  async function drain(genIds: string[]) {
    for (let i = 0; i < genIds.length; i++) await runNextGeneration(db);
    for (const id of genIds) await stb.materializeGenerationOutput(db, id);
    const { generation } = await import("@avd/gen/schema");
    for (const id of genIds) {
      const [g] = await db.select().from(generation).where(eq(generation.id, id));
      console.log(`  gen ${g?.kind} -> ${g?.status} $${g?.costUsd ?? 0}${g?.errorCode ? ` (${g.errorCode}: ${g.errorDetail?.slice(0, 120)})` : ""}`);
    }
  }

  async function proj(id: string) {
    const [p] = await db.select().from(project).where(eq(project.id, id));
    if (!p) throw new Error(`project ${id} not found`);
    return p;
  }

  if (stage === "setup") {
    const [title, idea, archetype, entityName] = args;
    if (!title || !idea) throw new Error("usage: setup <title> <idea> [archetype] [entityName]");
    const { v7: uuidv7 } = await import("uuid");
    const { organization } = await import("@avd/plt/schema");
    const { config } = await import("@avd/shared/config");
    const [org] = await db.select().from(organization).where(eq(organization.name, config.platform.devOrgName)).limit(1);
    if (!org) throw new Error("dev org missing");
    const { createProject, setProjectArchetype } = await import("@avd/prj/service");
    const id = await createProject(db, { organizationId: org.id, title, aspectRatio: "16:9", commandId: uuidv7(), idea });
    if (archetype) await setProjectArchetype(db, { projectId: id, archetype });
    if (entityName) {
      const { entity } = await import("@avd/ast/schema");
      const [e] = await db.select().from(entity).where(eq(entity.name, entityName));
      if (!e) throw new Error(`entity ${entityName} not found`);
      const { attachEntities } = await import("@avd/ast");
      await attachEntities(db, { projectId: id, entityIds: [e.id] });
    }
    console.log(`projectId=${id}`);
  } else if (stage === "draft") {
    const p = await proj(args[0]!);
    console.log("drafting script…");
    await drain([await stb.draftScript(db, { projectId: p.id, principal: PRINCIPAL })]);
  } else if (stage === "plan") {
    const p = await proj(args[0]!);
    console.log("proposing shot plan…");
    await drain([await stb.proposeShotPlan(db, { projectId: p.id, principal: PRINCIPAL })]);
    const { shotPlanProposal } = await import("@avd/stb/schema");
    const { desc } = await import("drizzle-orm");
    const [prop] = await db.select().from(shotPlanProposal).where(eq(shotPlanProposal.projectId, p.id)).orderBy(desc(shotPlanProposal.createdAt)).limit(1);
    const { normalizePlannedShots } = await import("@avd/stb/plan-normalize");
    const shots = normalizePlannedShots(prop!.changes);
    console.log(`proposalId=${prop!.id}`);
    for (const s of shots) console.log(`  ${s.durationS}s ${s.animation ? `[anim:${s.animation.template}] ` : ""}${s.title} — ${s.direction.synopsis.slice(0, 90)}`);
  } else if (stage === "sync") {
    const p = await proj(args[0]!);
    const { getMusicBrief } = await import("@avd/stb");
    const { parseSectionTimes, suggestSyncDurations } = await import("@avd/stb/music-sync");
    const brief = await getMusicBrief(db, p.id);
    if (!brief?.transcript) throw new Error("no transcript — run music first");
    const sections = parseSectionTimes(brief.transcript);
    const shots = await stb.listShots(db, p.id);
    const { suggestions } = suggestSyncDurations(shots.map((s) => ({ id: s.id, title: s.title, durationS: Number(s.durationS) })), sections);
    for (const sug of suggestions) {
      await stb.updateShotDuration(db, { shotId: sug.shotId, durationS: sug.toS });
      console.log(`  "${sug.title}": ${sug.fromS}s -> ${sug.toS}s (cut lands on ${sug.boundaryS}s)`);
    }
    console.log(suggestions.length ? `${suggestions.length} duration(s) synced to section boundaries` : "all cuts already land on boundaries (or no exact hits)");
  } else if (stage === "apply") {
    const p = await proj(args[0]!);
    const { shotPlanProposal, shot: shotTable } = await import("@avd/stb/schema");
    const { desc, inArray } = await import("drizzle-orm");
    const [prop] = await db.select().from(shotPlanProposal).where(eq(shotPlanProposal.projectId, p.id)).orderBy(desc(shotPlanProposal.createdAt)).limit(1);
    const shotIds = await stb.applyShotPlan(db, { proposalId: prop!.id, principal: PRINCIPAL });
    const rows = await db.select().from(shotTable).where(inArray(shotTable.id, shotIds));
    const genIds: string[] = [];
    for (const r of rows) {
      const anim = r.animation as { text?: string; template?: "title" | "kinetic" } | null;
      if (anim?.text) {
        genIds.push(await stb.requestAnimationTake(db, { shotId: r.id, text: anim.text, template: anim.template ?? "title", principal: PRINCIPAL, aspectRatio: p.aspectRatio }));
      } else {
        genIds.push(await stb.requestFrame(db, { shotId: r.id, slot: "start", principal: PRINCIPAL, aspectRatio: p.aspectRatio }));
      }
    }
    console.log(`applied ${shotIds.length} shots; generating ${genIds.length} frames/animations…`);
    await drain(genIds);
  } else if (stage === "takes") {
    const p = await proj(args[0]!);
    const shots = await stb.listShots(db, p.id);
    for (const s of shots) {
      const { frames, takes } = await stb.listCandidates(db, s.id);
      if (takes.length > 0) { console.log(`shot "${s.title}": already has a take, skipping`); continue; }
      if (frames.length === 0) { console.log(`shot "${s.title}": no frame (animation shot?), skipping`); continue; }
      await stb.selectFrame(db, { shotId: s.id, frameCandidateId: frames[0]!.id });
      console.log(`shot "${s.title}": frame selected, requesting ${s.durationS}s take…`);
      await drain([await stb.requestTake(db, { shotId: s.id, principal: PRINCIPAL, aspectRatio: p.aspectRatio })]);
    }
    // select every shot's newest take so export sees a full storyboard
    for (const s of shots) {
      const { takes } = await stb.listCandidates(db, s.id);
      if (takes.length > 0 && !s.selectedTakeId) await stb.selectTake(db, { shotId: s.id, takeId: takes[0]!.id });
    }
    console.log("takes complete + selected");
  } else if (stage === "music") {
    const p = await proj(args[0]!);
    console.log("music brief…");
    await drain([await stb.requestMusicBrief(db, { projectId: p.id, principal: PRINCIPAL })]);
    console.log("Lyria track…");
    await drain([await stb.requestMusicTrack(db, { projectId: p.id, principal: PRINCIPAL })]);
    console.log("transcript…");
    await drain([await stb.requestTranscript(db, { projectId: p.id, principal: PRINCIPAL })]);
  } else if (stage === "frames") {
    const p = await proj(args[0]!);
    const shots = await stb.listShots(db, p.id);
    const s = shots.find((x) => x.title === args[1]);
    if (!s) throw new Error(`shot "${args[1]}" not found (have: ${shots.map((x) => x.title).join(", ")})`);
    const count = Number(args[2] ?? 2);
    const ids = await stb.requestFrameBatch(db, { shotId: s.id, slot: "start", principal: PRINCIPAL, aspectRatio: p.aspectRatio, count });
    console.log(`generating ${ids.length} frame candidate(s) for "${s.title}"…`);
    await drain(ids);
    const { generation } = await import("@avd/gen/schema");
    for (const gid of ids) {
      const [g] = await db.select().from(generation).where(eq(generation.id, gid));
      console.log(`  asset ${g?.outputAssetIds?.[0]}`);
    }
  } else if (stage === "retry") {
    const p = await proj(args[0]!);
    const { generation } = await import("@avd/gen/schema");
    const { and, desc } = await import("drizzle-orm");
    const [failed] = await db.select().from(generation)
      .where(and(eq(generation.projectId, p.id), eq(generation.status, "failed")))
      .orderBy(desc(generation.createdAt)).limit(1);
    if (!failed) { console.log("no failed generations"); process.exit(0); }
    console.log(`retrying failed ${failed.kind} (${failed.errorCode})…`);
    const { retryGeneration } = await import("@avd/gen");
    const newId = await retryGeneration(db, { generationId: failed.id, principal: PRINCIPAL });
    await drain([newId]);
    // if it was a take, select it on its shot (skips shots that already have a selection)
    const shots = await stb.listShots(db, p.id);
    for (const s of shots) {
      const { takes } = await stb.listCandidates(db, s.id);
      if (takes.length > 0 && !s.selectedTakeId) {
        await stb.selectTake(db, { shotId: s.id, takeId: takes[takes.length - 1]!.id });
        console.log(`selected fresh take on "${s.title}"`);
      }
    }
  } else if (stage === "reshoot") {
    const p = await proj(args[0]!);
    const title = args[1];
    const shots = await stb.listShots(db, p.id);
    const s = shots.find((x) => x.title === title);
    if (!s) throw new Error(`shot "${title}" not found (have: ${shots.map((x) => x.title).join(", ")})`);
    console.log(`reshooting "${s.title}": fresh frame under current prompt guidelines…`);
    await drain([await stb.requestFrame(db, { shotId: s.id, slot: "start", principal: PRINCIPAL, aspectRatio: p.aspectRatio })]);
    const { frames } = await stb.listCandidates(db, s.id);
    const newest = frames[frames.length - 1]!; // listCandidates orders by creation
    await stb.selectFrame(db, { shotId: s.id, frameCandidateId: newest.id });
    console.log(`new frame ${newest.imageAssetId} selected; requesting ${s.durationS}s take…`);
    await drain([await stb.requestTake(db, { shotId: s.id, principal: PRINCIPAL, aspectRatio: p.aspectRatio })]);
    const { takes } = await stb.listCandidates(db, s.id);
    const newTake = takes[takes.length - 1]!;
    await stb.selectTake(db, { shotId: s.id, takeId: newTake.id });
    console.log(`new take ${newTake.videoAssetId} selected — re-export to pick it up`);
  } else if (stage === "export") {
    const p = await proj(args[0]!);
    const { createSnapshot, queueExport, runNextExport } = await import("@avd/asm");
    // optional 2nd arg: lyrics | lyrics-animated | dialogue (REQ-ASM-009/REQ-ANM-003)
    const cap = args[1];
    const snapshotId = await createSnapshot(db, {
      projectId: p.id, principal: PRINCIPAL,
      ...(cap ? { burnCaptions: true } : {}),
      ...(cap === "dialogue" ? { captionSource: "dialogue" as const } : {}),
      ...(cap === "lyrics-animated" ? { captionStyle: "animated" as const } : {}),
    });
    const jobId = await queueExport(db, { projectId: p.id, snapshotId, principal: PRINCIPAL });
    await runNextExport(db, { organizationId: p.organizationId });
    const { exportJob } = await import("@avd/asm/schema");
    const [j] = await db.select().from(exportJob).where(eq(exportJob.id, jobId));
    console.log(`export ${j?.status} -> asset ${j?.outputAssetId ?? "-"}${j?.errorDetail ? ` (${j.errorDetail.slice(0, 200)})` : ""}`);
  } else {
    throw new Error(`unknown stage ${stage}`);
  }
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
