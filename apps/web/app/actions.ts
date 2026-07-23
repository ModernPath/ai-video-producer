"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { config } from "@avd/shared/config";
import { organization } from "@avd/plt/schema";
import { project } from "@avd/prj/schema";
import { runNextGeneration } from "@avd/gen";
import {
  createShot, materializeGenerationOutput, requestFrame, requestTake, selectFrame, selectTake,
} from "@avd/stb";
import { db } from "../lib/db";

const PRINCIPAL = "user:dev"; // auth lands in Phase 5 (ADR-005)

/** Dev tenancy: a single local org until PLT auth slice lands. */
async function devOrgId(): Promise<string> {
  const d = db();
  const [existing] = await d.select().from(organization).limit(1);
  if (existing) return existing.id;
  const id = uuidv7();
  await d.insert(organization).values({ id, name: "Local Studio" });
  return id;
}

export async function createProjectAction(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const aspectRatio = formData.get("aspectRatio") === "9:16" ? "9:16" : "16:9";
  const id = uuidv7();
  await db().insert(project).values({
    id,
    organizationId: await devOrgId(),
    title,
    aspectRatio,
    targetDurationS: String(config.project.defaultTargetDurationSeconds),
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
      camera: String(formData.get("camera") ?? "") || undefined,
      mood: String(formData.get("mood") ?? "") || undefined,
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
  const genId = await requestFrame(db(), {
    shotId: String(formData.get("shotId")),
    slot: "start",
    principal: PRINCIPAL,
    aspectRatio: p.aspectRatio,
  });
  await drainQueueAndMaterialize([genId]);
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
  const excludeShotIds = excludeRaw ? excludeRaw.split(",") : undefined;
  const snapshotId = await createSnapshot(db(), { projectId, principal: PRINCIPAL, excludeShotIds });
  const jobId = await queueExport(db(), { projectId, snapshotId, principal: PRINCIPAL });
  const { queueMode, createBoss, EXPORT_QUEUE } = await import("@avd/shared/queue");
  if (queueMode() === "queue") {
    const boss = await createBoss();
    await boss.send(EXPORT_QUEUE, { exportJobId: jobId });
  } else {
    await runNextExport(db(), { organizationId: p.organizationId });
  }
  revalidatePath(`/p/${projectId}`);
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
  await applyShotPlan(db(), { proposalId: String(formData.get("proposalId")), principal: PRINCIPAL });
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
