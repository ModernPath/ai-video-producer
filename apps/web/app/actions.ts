"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, inArray } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { config, fullFrameAnimationTemplates, type FullFrameAnimationTemplate } from "@avd/shared/config";
import { organization } from "@avd/plt/schema";
import { project } from "@avd/prj/schema";
import { runNextGeneration } from "@avd/gen";
import {
  createShot, materializeGenerationOutput, requestFrame, requestTake, selectFrame, selectTake,
} from "@avd/stb";
import { db } from "../lib/db";

const PRINCIPAL = "user:dev"; // auth lands in Phase 5 (ADR-005)

/** Dev tenancy: a single local org until PLT auth slice lands.
 * Resolved BY NAME — `limit 1` without order returned arbitrary rows once
 * integration tests left other orgs behind (USER BUG: entities landed in test orgs). */
export async function devOrgId(): Promise<string> {
  const d = db();
  const [existing] = await d.select().from(organization).where(eq(organization.name, config.platform.devOrgName)).limit(1);
  if (existing) return existing.id;
  const id = uuidv7();
  await d.insert(organization).values({ id, name: config.platform.devOrgName });
  return id;
}

export async function createProjectAction(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const aspectRatio = formData.get("aspectRatio") === "9:16" ? "9:16" : "16:9";
  const idea = String(formData.get("idea") ?? "").trim();
  const commandId = String(formData.get("commandId") || uuidv7()); // per-render id → replay-safe (REQ-PRJ-002)
  const { createProject } = await import("@avd/prj/service");
  const id = await createProject(db(), {
    organizationId: await devOrgId(),
    title,
    aspectRatio,
    commandId,
    ...(idea ? { idea } : {}),
  });
  redirect(`/p/${id}`);
}

export async function createShotAction(formData: FormData) {
  const projectId = String(formData.get("projectId"));
  const [p] = await db().select().from(project).where(eq(project.id, projectId));
  if (!p) return;
  await createShot(db(), {
    organizationId: p.organizationId,
    projectId,
    title: String(formData.get("title") ?? "Untitled shot").trim() || "Untitled shot",
    durationS: Number(formData.get("durationS") ?? config.shot.defaultSeconds),
    direction: {
      synopsis: String(formData.get("synopsis") ?? ""),
      subject: String(formData.get("subject") ?? ""),
      action: String(formData.get("action") ?? ""),
      ...(String(formData.get("camera") ?? "").trim() ? { camera: String(formData.get("camera")) } : {}),
      ...(String(formData.get("mood") ?? "").trim() ? { mood: String(formData.get("mood")) } : {}),
    },
  });
  revalidatePath(`/p/${projectId}`);
}

/**
 * Dispatch generations: queue mode sends pg-boss jobs to apps/worker (REQ-GEN-016);
 * inline mode keeps single-process dev ergonomics (WORKER_MODE unset).
 */
async function drainQueueAndMaterialize(generationIds: string[]) {
  const { queueMode, createBoss, GEN_QUEUE } = await import("@avd/shared/queue");
  if (queueMode() === "queue") {
    const boss = await createBoss();
    for (const id of generationIds) await boss.send(GEN_QUEUE, { generationId: id });
    return;
  }
  const d = db();
  for (let i = 0; i < generationIds.length; i++) await runNextGeneration(d);
  for (const id of generationIds) await materializeGenerationOutput(d, id);
}

export async function generateFrameAction(formData: FormData) {
  const projectId = String(formData.get("projectId"));
  const [p] = await db().select().from(project).where(eq(project.id, projectId));
  if (!p) return;
  // REQ-GEN-008 / BR-GEN-002: the per-shot gesture yields candidatesDefault alternatives to pick from.
  const { requestFrameBatch } = await import("@avd/stb");
  const genIds = await requestFrameBatch(db(), {
    shotId: String(formData.get("shotId")),
    slot: "start",
    principal: PRINCIPAL,
    aspectRatio: p.aspectRatio,
  });
  await drainQueueAndMaterialize(genIds);
  revalidatePath(`/p/${projectId}`);
}

export async function generateTakeAction(formData: FormData) {
  const projectId = String(formData.get("projectId"));
  const [p] = await db().select().from(project).where(eq(project.id, projectId));
  if (!p) return;
  const genId = await requestTake(db(), {
    shotId: String(formData.get("shotId")),
    principal: PRINCIPAL,
    aspectRatio: p.aspectRatio,
  });
  await drainQueueAndMaterialize([genId]);
  revalidatePath(`/p/${projectId}`);
}

export async function selectFrameAction(formData: FormData) {
  await selectFrame(db(), {
    shotId: String(formData.get("shotId")),
    frameCandidateId: String(formData.get("frameCandidateId")),
  });
  revalidatePath(`/p/${String(formData.get("projectId"))}`);
}

export async function selectTakeAction(formData: FormData) {
  await selectTake(db(), {
    shotId: String(formData.get("shotId")),
    takeId: String(formData.get("takeId")),
  });
  revalidatePath(`/p/${String(formData.get("projectId"))}`);
}

export async function exportAction(formData: FormData) {
  const projectId = String(formData.get("projectId"));
  const { createSnapshot, queueExport, runNextExport } = await import("@avd/asm");
  const [p] = await db().select().from(project).where(eq(project.id, projectId));
  if (!p) return;
  const excludeRaw = String(formData.get("excludeShotIds") ?? "").trim();
  const captionsChoice = String(formData.get("captions") ?? "");
  const snapshotId = await createSnapshot(db(), {
    projectId, principal: PRINCIPAL,
    burnCaptions: ["lyrics", "lyrics-animated", "dialogue"].includes(captionsChoice), // REQ-ASM-009
    ...(captionsChoice === "dialogue" ? { captionSource: "dialogue" as const } : {}), // REQ-GEN-021
    ...(captionsChoice === "lyrics-animated" ? { captionStyle: "animated" as const } : {}), // REQ-ANM-003 slice 2
    ...(excludeRaw ? { excludeShotIds: excludeRaw.split(",") } : {}),
  });
  const jobId = await queueExport(db(), { projectId, snapshotId, principal: PRINCIPAL });
  const { queueMode, createBoss, EXPORT_QUEUE } = await import("@avd/shared/queue");
  if (queueMode() === "queue") {
    const boss = await createBoss();
    await boss.send(EXPORT_QUEUE, { exportJobId: jobId });
  } else {
    await runNextExport(db(), { organizationId: p.organizationId });
  }
  revalidatePath(`/p/${projectId}`);
  // USER 2026-07-24 ("how do I even play the video"): land on the EXPORTS section, where the
  // newest export now plays inline — the finished film should be impossible to miss.
  redirect(`/p/${projectId}#exports`);
}

export async function draftScriptAction(formData: FormData) {
  const projectId = String(formData.get("projectId"));
  const { draftScript, materializeGenerationOutput } = await import("@avd/stb");
  const genId = await draftScript(db(), { projectId, principal: PRINCIPAL });
  await drainQueueAndMaterialize([genId]);
  void materializeGenerationOutput; // materialized in drain
  revalidatePath(`/p/${projectId}/script`);
}

export async function proposePlanAction(formData: FormData) {
  const projectId = String(formData.get("projectId"));
  const { proposeShotPlan } = await import("@avd/stb");
  const genId = await proposeShotPlan(db(), { projectId, principal: PRINCIPAL });
  await drainQueueAndMaterialize([genId]);
  revalidatePath(`/p/${projectId}/script`);
}

export async function applyPlanAction(formData: FormData) {
  const projectId = String(formData.get("projectId"));
  const { applyShotPlan } = await import("@avd/stb");
  const shotIds = await applyShotPlan(db(), { proposalId: String(formData.get("proposalId")), principal: PRINCIPAL });
  // REQ-STB-017: one gesture — apply the plan AND generate first frames from the authored image scripts.
  if (formData.get("generateFrames") === "1") {
    const [p] = await db().select().from(project).where(eq(project.id, projectId));
    if (p) {
      const { requestAnimationTake } = await import("@avd/stb");
      const { shot: shotTable } = await import("@avd/stb/schema");
      const rows = await db().select().from(shotTable).where(inArray(shotTable.id, shotIds));
      const animByShot = new Map(rows.map((r) => [r.id, r.animation as { text?: string } | null]));
      const genIds: string[] = [];
      for (const shotId of shotIds) {
        const anim = animByShot.get(shotId) as { text?: string; template?: FullFrameAnimationTemplate } | null;
        if (anim?.text) {
          // REQ-STB-024: pure-graphic shot — render the free animation take instead of buying a frame
          genIds.push(await requestAnimationTake(db(), { shotId, text: anim.text, template: anim.template ?? "title", principal: PRINCIPAL, aspectRatio: p.aspectRatio }));
        } else {
          genIds.push(await requestFrame(db(), { shotId, slot: "start", principal: PRINCIPAL, aspectRatio: p.aspectRatio }));
        }
      }
      await drainQueueAndMaterialize(genIds);
    }
  }
  revalidatePath(`/p/${projectId}`);
  redirect(`/p/${projectId}`);
}

/** Batch: generate a start frame for every shot lacking one (docs/features/storyboard.md). */
export async function generateMissingFramesAction(formData: FormData) {
  const projectId = String(formData.get("projectId"));
  const [p] = await db().select().from(project).where(eq(project.id, projectId));
  if (!p) return;
  const { listShots, listCandidates } = await import("@avd/stb");
  const shots = await listShots(db(), projectId);
  const genIds: string[] = [];
  for (const s of shots) {
    const { frames } = await listCandidates(db(), s.id);
    if (frames.length === 0) {
      genIds.push(await requestFrame(db(), { shotId: s.id, slot: "start", principal: PRINCIPAL, aspectRatio: p.aspectRatio }));
    }
  }
  await drainQueueAndMaterialize(genIds);
  revalidatePath(`/p/${projectId}`);
}

export async function musicBriefAction(formData: FormData) {
  const projectId = String(formData.get("projectId"));
  const { requestMusicBrief } = await import("@avd/stb");
  const genId = await requestMusicBrief(db(), { projectId, principal: PRINCIPAL });
  await drainQueueAndMaterialize([genId]);
  revalidatePath(`/p/${projectId}/script`);
}

export async function uploadTrackAction(formData: FormData) {
  const projectId = String(formData.get("projectId"));
  const file = formData.get("track") as File | null;
  if (!file || file.size === 0) return;
  const [p] = await db().select().from(project).where(eq(project.id, projectId));
  if (!p) return;
  const { uploadBytesDirect } = await import("@avd/ast");
  const { attachMusicTrack } = await import("@avd/stb");
  const assetId = await uploadBytesDirect(db(), {
    organizationId: p.organizationId,
    projectId,
    kind: "audio",
    mime: file.type || "audio/mpeg",
    bytes: new Uint8Array(await file.arrayBuffer()),
  });
  await attachMusicTrack(db(), { projectId, assetId });
  revalidatePath(`/p/${projectId}/script`);
}

export async function createEntityAction(formData: FormData) {
  const { uploadBytesDirect, createEntity } = await import("@avd/ast");
  const orgId = await devOrgId();
  const files = formData.getAll("refs").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return;
  const refAssetIds: string[] = [];
  for (const f of files) {
    refAssetIds.push(await uploadBytesDirect(db(), {
      organizationId: orgId, projectId: null, kind: "image",
      mime: f.type || "image/png", bytes: new Uint8Array(await f.arrayBuffer()),
    }));
  }
  await createEntity(db(), {
    organizationId: orgId,
    kind: (String(formData.get("kind")) || "character") as "company" | "product" | "person" | "character",
    name: String(formData.get("name") ?? "").trim() || "Unnamed",
    description: String(formData.get("description") ?? "").trim(),
    refAssetIds,
  });
  revalidatePath("/library");
}

/**
 * REQ-STB-048 (USER 2026-07-27: "Maybe allow either adding an image for character or generate it?")
 * — cast a character the plan asked for.
 *
 * INV-AST-004 forces the order: an entity needs a reference image to exist, so an upload is used
 * directly and otherwise a portrait is generated first and the cast member created from it. Either
 * way the member exists only WITH a reference, which is the whole mechanism of consistency.
 */
export async function castMemberAction(formData: FormData) {
  const projectId = String(formData.get("projectId"));
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const [p] = await db().select().from(project).where(eq(project.id, projectId));
  if (!p) return;

  const kind = (String(formData.get("kind")) || "character") as "company" | "product" | "person" | "character";
  const description = String(formData.get("description") ?? "").trim();
  const appearance = String(formData.get("appearance") ?? "").trim();
  const file = formData.get("portrait");

  const { castFromPortrait, requestEntityPortrait } = await import("@avd/stb");

  if (file instanceof File && file.size > 0) {
    const { uploadBytesDirect, createEntity, attachEntities, listProjectEntities } = await import("@avd/ast");
    const assetId = await uploadBytesDirect(db(), {
      organizationId: p.organizationId, projectId: null, kind: "image",
      mime: file.type || "image/png", bytes: new Uint8Array(await file.arrayBuffer()),
    });
    const entityId = await createEntity(db(), {
      organizationId: p.organizationId, kind, name,
      description: description || appearance || name, refAssetIds: [assetId],
    });
    const existing = (await listProjectEntities(db(), projectId)).map((e) => e.id);
    await attachEntities(db(), { projectId, entityIds: [...existing, entityId] });
  } else {
    const genId = await requestEntityPortrait(db(), {
      projectId, appearance: appearance || description || name, principal: PRINCIPAL, aspectRatio: p.aspectRatio,
    });
    // Run THIS generation, not "the next queued one". `drainQueueAndMaterialize` uses
    // runNextGeneration, which claims any queued row — with a shot plan already waiting it ran that
    // instead, and casting then read a portrait that had not been generated yet.
    const { runGenerationById } = await import("@avd/gen");
    await runGenerationById(db(), genId);
    await castFromPortrait(db(), { projectId, generationId: genId, name, kind, description });
  }
  revalidatePath(`/p/${projectId}`);
}

/** REQ-STB-051: read the draft plan from several angles and propose an improved one. */
export async function critiquePlanAction(formData: FormData) {
  const projectId = String(formData.get("projectId"));
  const { critiqueAndRevise } = await import("@avd/stb");
  await critiqueAndRevise(db(), { proposalId: String(formData.get("proposalId")), principal: PRINCIPAL });
  revalidatePath(`/p/${projectId}`);
}

export async function setCastAction(formData: FormData) {
  const projectId = String(formData.get("projectId"));
  const { attachEntities } = await import("@avd/ast");
  const entityIds = formData.getAll("entityIds").map(String);
  await attachEntities(db(), { projectId, entityIds });
  revalidatePath(`/p/${projectId}`);
}

/** User req #2: AI-edit an entity reference image; edited result replaces the ref (lineage kept). */
export async function editEntityRefAction(formData: FormData) {
  const entityId = String(formData.get("entityId"));
  const refAssetId = String(formData.get("refAssetId"));
  const instruction = String(formData.get("instruction") ?? "").trim();
  if (!instruction) return;
  const orgId = await devOrgId();
  const { enqueueGeneration, runGenerationById } = await import("@avd/gen");
  const { updateEntityRef } = await import("@avd/ast");
  const { generation } = await import("@avd/gen/schema");

  const genId = await enqueueGeneration(db(), {
    organizationId: orgId, projectId: orgId /* org-library scope */, principal: PRINCIPAL,
    kind: "image_edit", commandId: uuidv7(), target: { assetId: refAssetId, entityId },
    refs: { editSourceAssetId: refAssetId },
    editInput: { instruction, aspectRatio: "16:9" },
  });
  await runGenerationById(db(), genId); // inline: edits are fast; queue-mode arm later
  const [g] = await db().select().from(generation).where(eq(generation.id, genId));
  if (g?.status === "succeeded" && g.outputAssetIds?.[0]) {
    await updateEntityRef(db(), { entityId, oldAssetId: refAssetId, newAssetId: g.outputAssetIds[0] });
  }
  revalidatePath("/library");
}

export async function setAudioModeAction(formData: FormData) {
  const projectId = String(formData.get("projectId"));
  const mode = String(formData.get("mode"));
  if (!["native", "music", "mix"].includes(mode)) return;
  await db().update(project).set({ audioMixMode: mode as "native" | "music" | "mix" }).where(eq(project.id, projectId));
  revalidatePath(`/p/${projectId}`);
}

export async function removeCandidateAction(formData: FormData) {
  const projectId = String(formData.get("projectId"));
  const kind = String(formData.get("kind"));
  const { removeFrameCandidate, removeTake } = await import("@avd/stb");
  if (kind === "frame") await removeFrameCandidate(db(), { frameCandidateId: String(formData.get("id")) });
  else await removeTake(db(), { takeId: String(formData.get("id")) });
  revalidatePath(`/p/${projectId}`);
}

/** REQ-STB-019: remove a shot (cut) from the storyboard; paid takes need explicit confirm. */
export async function removeShotAction(formData: FormData) {
  const projectId = String(formData.get("projectId"));
  const { removeShot } = await import("@avd/stb");
  await removeShot(db(), {
    shotId: String(formData.get("shotId")),
    confirmPaid: formData.get("confirmPaid") === "1", // INV-STB-007
  });
  revalidatePath(`/p/${projectId}`);
}

/** REQ-ASM-007: share a succeeded export via public token link. */
export async function createShareLinkAction(formData: FormData) {
  const projectId = String(formData.get("projectId"));
  const { createShareLink } = await import("@avd/asm");
  await createShareLink(db(), { exportJobId: String(formData.get("exportJobId")) });
  revalidatePath(`/p/${projectId}`);
}

/** REQ-STB-016: per-shot reference-image subset (null = whole-cast default). */
export async function updateShotRefsAction(formData: FormData) {
  const projectId = String(formData.get("projectId"));
  const { updateShotRefs } = await import("@avd/stb");
  const reset = formData.get("reset") === "1";
  await updateShotRefs(db(), {
    shotId: String(formData.get("shotId")),
    refAssetIds: reset ? null : formData.getAll("refAssetIds").map(String),
  });
  revalidatePath(`/p/${projectId}`);
}

/** REQ-PRJ-003: archive lifecycle — archived projects hide from the list and block generation/export. */
export async function archiveProjectAction(formData: FormData) {
  const { archiveProject } = await import("@avd/prj/service");
  await archiveProject(db(), { projectId: String(formData.get("projectId")) });
  revalidatePath("/");
}

export async function unarchiveProjectAction(formData: FormData) {
  const { unarchiveProject } = await import("@avd/prj/service");
  await unarchiveProject(db(), { projectId: String(formData.get("projectId")) });
  revalidatePath("/");
}

/** REQ-AST-007: style kits — create org-level, select per project. */
export async function createStyleKitAction(formData: FormData) {
  const { createStyleKit } = await import("@avd/ast");
  const name = String(formData.get("name") ?? "").trim();
  const prompt = String(formData.get("prompt") ?? "").trim();
  if (!name || !prompt) return;
  await createStyleKit(db(), { organizationId: await devOrgId(), name, prompt });
  revalidatePath("/library");
}

export async function setProjectStyleAction(formData: FormData) {
  const projectId = String(formData.get("projectId"));
  const { setProjectStyleKit } = await import("@avd/prj/service");
  const raw = String(formData.get("styleKitId") ?? "");
  await setProjectStyleKit(db(), { projectId, styleKitId: raw || null });
  revalidatePath(`/p/${projectId}`);
}

/** REQ-STB-026: directing archetype for the project (docs/87). */
export async function setArchetypeAction(formData: FormData) {
  const projectId = String(formData.get("projectId"));
  const { setProjectArchetype } = await import("@avd/prj/service");
  const raw = String(formData.get("archetype") ?? "");
  await setProjectArchetype(db(), { projectId, archetype: raw || null });
  revalidatePath(`/p/${projectId}`); // the script route redirects here now (REQ-STB-037)
}

/** REQ-PRJ-006: set the film's target runtime — it was displayed but never editable. */
export async function setTargetDurationAction(formData: FormData) {
  const projectId = String(formData.get("projectId"));
  const seconds = Number(formData.get("seconds"));
  if (!Number.isFinite(seconds) || seconds <= 0) return;
  const { setProjectTargetDuration } = await import("@avd/prj/service");
  await setProjectTargetDuration(db(), { projectId, targetDurationS: seconds });
  revalidatePath(`/p/${projectId}`);
}

/**
 * SR-DIR-008 (USER 2026-07-26: "how do I test my Kaurismäki shortfilm?") — compile the project's
 * own prompt into a Style Card via grounded research and store it. One text call, no generation
 * ledger row, nothing billed for images or video.
 */
export async function compileStyleCardAction(formData: FormData) {
  const projectId = String(formData.get("projectId"));
  const brief = String(formData.get("brief") ?? "").trim();
  if (!brief) return;
  const { compileStyleCard } = await import("@avd/gen/style-compiler");
  const { setProjectStyleCard, setProjectTargetDuration } = await import("@avd/prj/service");
  const { parseRequestedDurationS } = await import("@avd/prj/brief-duration");
  const card = await compileStyleCard(brief);
  await setProjectStyleCard(db(), { projectId, card });
  // REQ-PRJ-006: "1-minute feature film" is a runtime request, not just style — honour it here
  // rather than leaving the project on the 30s it was created with.
  const requested = parseRequestedDurationS(brief);
  if (requested !== null) await setProjectTargetDuration(db(), { projectId, targetDurationS: requested });
  revalidatePath(`/p/${projectId}`);
}

/** REQ-STB-025: apply lyric-sync duration suggestions (JSON [{shotId,toS}] in one field). */
export async function applySyncAction(formData: FormData) {
  const projectId = String(formData.get("projectId"));
  const changes = JSON.parse(String(formData.get("changes") ?? "[]")) as Array<{ shotId: string; toS: number }>;
  const { updateShotDuration } = await import("@avd/stb");
  for (const c of changes) await updateShotDuration(db(), { shotId: c.shotId, durationS: c.toS });
  revalidatePath(`/p/${projectId}`);
}

/**
 * REQ-STB-038: move a shot to an arbitrary position (USER 2026-07-25 "how can I actually change the
 * order of the clips?"). Drag in the rail or on the timeline sends one positional move; the ↑↓
 * buttons send toIndex too, so every path shares this action.
 */
export async function moveShotAction(formData: FormData) {
  const projectId = String(formData.get("projectId"));
  const shotId = String(formData.get("shotId"));
  const toIndex = Number(formData.get("toIndex"));
  if (!Number.isFinite(toIndex)) return;
  const { moveShotToIndex } = await import("@avd/stb");
  await moveShotToIndex(db(), { shotId, toIndex });
  revalidatePath(`/p/${projectId}`);
}

/**
 * REQ-STB-038 — same move, callable directly from the client shell with args (Next.js `.bind`
 * pattern) so a drag doesn't have to synthesize a form.
 */
export async function moveShotTo(projectId: string, shotId: string, toIndex: number) {
  const { moveShotToIndex } = await import("@avd/stb");
  await moveShotToIndex(db(), { shotId, toIndex });
  revalidatePath(`/p/${projectId}`);
}

/**
 * REQ-STB-040: set one shot's length from the timeline (USER 2026-07-25 "being able to edit the
 * length of clips (+regenerate or crop)"). Shortening is free — the export normalizes every clip
 * with ffmpeg `-t durationS`, so a shorter shot simply crops its take. Lengthening past the take's
 * real footage is surfaced as a shortfall in the UI; the user then chooses to regenerate.
 */
export async function updateShotDurationAction(formData: FormData) {
  const projectId = String(formData.get("projectId"));
  const shotId = String(formData.get("shotId"));
  const durationS = Number(formData.get("durationS"));
  const { updateShotDuration } = await import("@avd/stb");
  await updateShotDuration(db(), { shotId, durationS }); // INV-STB-001 enforced in the service
  revalidatePath(`/p/${projectId}`);
}

/** REQ-ANM-002: composite a lower-third overlay onto an existing take (free). */
export async function overlayTakeAction(formData: FormData) {
  const projectId = String(formData.get("projectId"));
  const text = String(formData.get("text") ?? "").trim();
  if (!text) return;
  const [p] = await db().select().from(project).where(eq(project.id, projectId));
  if (!p) return;
  const { requestAnimationOverlay } = await import("@avd/stb");
  const genId = await requestAnimationOverlay(db(), {
    takeId: String(formData.get("takeId")),
    text,
    principal: PRINCIPAL,
    aspectRatio: p.aspectRatio,
  });
  await drainQueueAndMaterialize([genId]);
  revalidatePath(`/p/${projectId}`);
}

/** REQ-GEN-020: transcribe the attached track (MM:SS) for lyric-synced timing. */
export async function transcribeTrackAction(formData: FormData) {
  const projectId = String(formData.get("projectId"));
  const { requestTranscript } = await import("@avd/stb");
  const genId = await requestTranscript(db(), { projectId, principal: PRINCIPAL });
  await drainQueueAndMaterialize([genId]);
  revalidatePath(`/p/${projectId}/script`);
}

/** REQ-ANM-001: free Remotion animation take (title card) for a shot. */
export async function animationTakeAction(formData: FormData) {
  const projectId = String(formData.get("projectId"));
  const text = String(formData.get("text") ?? "").trim();
  if (!text) return;
  const [p] = await db().select().from(project).where(eq(project.id, projectId));
  if (!p) return;
  const { requestAnimationTake } = await import("@avd/stb");
  const genId = await requestAnimationTake(db(), {
    shotId: String(formData.get("shotId")),
    text,
    // REQ-STB-036: the picker offers the full template set; unknown values fall back to title
    template: (fullFrameAnimationTemplates as readonly string[]).includes(String(formData.get("template")))
      ? (String(formData.get("template")) as FullFrameAnimationTemplate)
      : "title",
    ...(String(formData.get("subtext") ?? "").trim() ? { subtext: String(formData.get("subtext")).trim() } : {}),
    principal: PRINCIPAL,
    aspectRatio: p.aspectRatio,
  });
  await drainQueueAndMaterialize([genId]);
  revalidatePath(`/p/${projectId}`);
}

/** REQ-GEN-019: run the music brief through Lyria; the track attaches on completion. */
export async function generateMusicTrackAction(formData: FormData) {
  const projectId = String(formData.get("projectId"));
  const { requestMusicTrack } = await import("@avd/stb");
  const genId = await requestMusicTrack(db(), { projectId, principal: PRINCIPAL });
  await drainQueueAndMaterialize([genId]);
  revalidatePath(`/p/${projectId}/script`);
  revalidatePath(`/p/${projectId}`);
}

/** REQ-STB-022: reorder shots — animatic and export order follow (SCN-STB-010). */
export async function reorderShotAction(formData: FormData) {
  const projectId = String(formData.get("projectId"));
  const { reorderShot } = await import("@avd/stb");
  await reorderShot(db(), {
    shotId: String(formData.get("shotId")),
    direction: formData.get("direction") === "up" ? "up" : "down",
  });
  revalidatePath(`/p/${projectId}`);
}

/** REQ-STB-020: retake with instruction — new take conditioned like its source, lineage kept. */
export async function retakeAction(formData: FormData) {
  const projectId = String(formData.get("projectId"));
  const instruction = String(formData.get("instruction") ?? "").trim();
  if (!instruction) return;
  const [p] = await db().select().from(project).where(eq(project.id, projectId));
  if (!p) return;
  const { requestRetake } = await import("@avd/stb");
  const genId = await requestRetake(db(), {
    takeId: String(formData.get("takeId")),
    instruction,
    principal: PRINCIPAL,
    aspectRatio: p.aspectRatio,
  });
  await drainQueueAndMaterialize([genId]);
  revalidatePath(`/p/${projectId}`);
}

/** REQ-STB-012: the project's video prompt (brief.idea) — drives script, plan, music, and styling. */
export async function updateBriefAction(formData: FormData) {
  const projectId = String(formData.get("projectId"));
  const idea = String(formData.get("idea") ?? "").trim();
  const [p] = await db().select().from(project).where(eq(project.id, projectId));
  if (!p) return;
  await db().update(project)
    .set({ brief: { ...(p.brief as Record<string, unknown>), idea } })
    .where(eq(project.id, projectId));
  revalidatePath(`/p/${projectId}/script`);
}

export async function retryGenerationAction(formData: FormData) {
  const projectId = String(formData.get("projectId"));
  const { retryGeneration } = await import("@avd/gen");
  const newId = await retryGeneration(db(), { generationId: String(formData.get("generationId")), principal: PRINCIPAL });
  await drainQueueAndMaterialize([newId]);
  revalidatePath(`/p/${projectId}`);
}

export async function retryExportAction(formData: FormData) {
  const projectId = String(formData.get("projectId"));
  const { retryExport, runExportById } = await import("@avd/asm");
  const newJobId = await retryExport(db(), { exportJobId: String(formData.get("exportJobId")), principal: PRINCIPAL });
  const { queueMode, createBoss, EXPORT_QUEUE } = await import("@avd/shared/queue");
  if (queueMode() === "queue") {
    const boss = await createBoss();
    await boss.send(EXPORT_QUEUE, { exportJobId: newJobId });
  } else {
    await runExportById(db(), newJobId);
  }
  revalidatePath(`/p/${projectId}`);
}

/** REQ-STB-013 (USER): per-shot image & video scripts — empty saves back to auto. */
export async function updateShotScriptsAction(formData: FormData) {
  const projectId = String(formData.get("projectId"));
  const { updateShotScripts } = await import("@avd/stb");
  await updateShotScripts(db(), {
    shotId: String(formData.get("shotId")),
    imagePrompt: String(formData.get("imagePrompt") ?? ""),
    videoPrompt: String(formData.get("videoPrompt") ?? ""),
  });
  revalidatePath(`/p/${projectId}`);
}

/** REQ-STB-015 (USER #2): one gesture — persist the edited scripts, then generate from them. */
export async function saveScriptsAndGenerateAction(formData: FormData) {
  const projectId = String(formData.get("projectId"));
  const shotId = String(formData.get("shotId"));
  const kind = String(formData.get("generate")); // "frame" | "take"
  const [p] = await db().select().from(project).where(eq(project.id, projectId));
  if (!p) return;
  const { updateShotScripts, updateShotDialogue } = await import("@avd/stb");
  await updateShotScripts(db(), {
    shotId,
    imagePrompt: String(formData.get("imagePrompt") ?? ""),
    videoPrompt: String(formData.get("videoPrompt") ?? ""),
  });
  // REQ-STB-046: the spoken line saves with the scripts it belongs to, so one Save covers the shot.
  if (formData.has("dialogue")) {
    await updateShotDialogue(db(), { shotId, dialogue: String(formData.get("dialogue") ?? "") });
  }
  if (kind === "frame") {
    const genId = await requestFrame(db(), { shotId, slot: "start", principal: PRINCIPAL, aspectRatio: p.aspectRatio });
    await drainQueueAndMaterialize([genId]);
  } else if (kind === "take") {
    const genId = await requestTake(db(), { shotId, principal: PRINCIPAL, aspectRatio: p.aspectRatio });
    await drainQueueAndMaterialize([genId]);
  }
  revalidatePath(`/p/${projectId}`);
}

/** REQ-AST-010: remove one reference image from an entity (dangling refs included). */
export async function removeEntityRefAction(formData: FormData) {
  const { removeEntityRef } = await import("@avd/ast");
  await removeEntityRef(db(), {
    entityId: String(formData.get("entityId")),
    assetId: String(formData.get("assetId")),
  });
  revalidatePath("/library");
}

/** REQ-AST-010: soft-archive an entity — leaves the library and all project casts. */
export async function archiveEntityAction(formData: FormData) {
  const { archiveEntity } = await import("@avd/ast");
  await archiveEntity(db(), { entityId: String(formData.get("entityId")) });
  revalidatePath("/library");
}

/** REQ-AST-011: upload + append reference images to an existing entity. */
export async function addEntityRefsAction(formData: FormData) {
  const { uploadBytesDirect, addEntityRefs } = await import("@avd/ast");
  const entityId = String(formData.get("entityId"));
  const files = formData.getAll("refs").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return;
  const orgId = await devOrgId();
  const assetIds: string[] = [];
  for (const f of files) {
    assetIds.push(await uploadBytesDirect(db(), {
      organizationId: orgId, projectId: null, kind: "image",
      mime: f.type || "image/png", bytes: new Uint8Array(await f.arrayBuffer()),
    }));
  }
  await addEntityRefs(db(), { entityId, assetIds });
  revalidatePath("/library");
}

/** REQ-AST-012: save the long-form brand/company profile. */
export async function saveEntityProfileAction(formData: FormData) {
  const { updateEntityProfile } = await import("@avd/ast");
  await updateEntityProfile(db(), {
    entityId: String(formData.get("entityId")),
    profile: String(formData.get("profile") ?? ""),
  });
  revalidatePath("/library");
}

/** REQ-GEN-024: research the profile from the web (Google Search grounding + URL context). */
export async function researchEntityProfileAction(formData: FormData) {
  const { researchEntityProfile } = await import("@avd/gen");
  const { updateEntityProfile, listEntities } = await import("@avd/ast");
  const entityId = String(formData.get("entityId"));
  const orgId = await devOrgId();
  const e = (await listEntities(db(), orgId)).find((x) => x.id === entityId);
  if (!e) return;
  const url = String(formData.get("url") ?? "").trim();
  const profile = await researchEntityProfile({ name: e.name, kind: e.kind, ...(url ? { url } : {}) });
  await updateEntityProfile(db(), { entityId, profile });
  revalidatePath("/library");
}
