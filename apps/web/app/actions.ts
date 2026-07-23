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

/** Dev-inline worker: run queue + materialize immediately (real worker app in Phase 2+). */
async function drainQueueAndMaterialize(generationIds: string[]) {
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
  const snapshotId = await createSnapshot(db(), { projectId, principal: PRINCIPAL });
  await queueExport(db(), { projectId, snapshotId, principal: PRINCIPAL });
  await runNextExport(db(), { organizationId: p.organizationId }); // dev-inline worker
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
