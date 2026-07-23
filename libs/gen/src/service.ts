// REQ-GEN-001 (provenance before execution) + REQ-GEN-007 + REQ-GEN-013 + REQ-GEN-015 (config guard)
// + REQ-PRJ-003 (BR-PRJ-003 archived-project enqueue guard).
import { and, eq, inArray, sql } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import type { Db } from "@avd/shared/db";
import { getProjectStatus } from "@avd/prj/service";
import { config, type FrameQuality, type GenerationKind } from "@avd/shared/config";
import {
  PROMPT_TEMPLATE_VERSION, assembleEditPrompt, assembleFramePrompt, assembleMusicBriefPrompt, assembleScriptPrompt, assembleShotPlanPrompt,
  assembleTakePrompt, type EditPromptInput, type TakePromptInput, type TextPromptInput,
} from "./prompt";
import { resolveModel } from "./routing";
import { generation } from "./schema";

export function mockEnabled(): boolean {
  return process.env.MOCK_GEN === "1";
}

export interface EnqueueInput {
  organizationId: string;
  projectId: string;
  principal: string;
  kind: GenerationKind;
  commandId: string;
  target: Record<string, unknown>;
  quality?: FrameQuality | undefined;
  promptInput?: TakePromptInput | undefined;   // media kinds
  textInput?: TextPromptInput | undefined;     // script / shot_plan / music_brief kinds
  refs?: { startFrameAssetId?: string; entityRefAssetIds?: string[]; editSourceAssetId?: string } | undefined; // REQ-GEN-009/012 + REQ-AST-006
  editInput?: EditPromptInput | undefined; // image_edit kinds
}

export class GenConfigError extends Error {}

export class GenEnqueueError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

/** INV-GEN-004: billed spend (succeeded+running) for the current UTC day. Shared by the quota guard and the UI budget meter. */
export async function dailySpendUsd(db: Db, organizationId: string): Promise<number> {
  const [row] = await db
    .select({ spent: sql<string>`coalesce(sum(${generation.costUsd}), 0)` })
    .from(generation)
    .where(and(
      eq(generation.organizationId, organizationId),
      inArray(generation.status, ["succeeded", "running"]),
      sql`${generation.createdAt} >= date_trunc('day', now())`
    ));
  return Number(row?.spent ?? 0);
}

export async function enqueueGeneration(db: Db, input: EnqueueInput): Promise<string> {
  if (!mockEnabled() && !process.env.GEMINI_API_KEY) {
    throw new GenConfigError("Generation is not configured: set GEMINI_API_KEY or MOCK_GEN=1"); // REQ-GEN-015
  }
  // BR-PRJ-003 — archived projects block new generation enqueues (status read via PRJ's own service).
  if ((await getProjectStatus(db, input.projectId)) === "archived") {
    throw new GenEnqueueError("project_archived", "Project is archived; new generations are blocked");
  }
  const id = uuidv7();
  // INV-GEN-004: daily per-org spend cap — checked before any provider work.
  const spentToday = await dailySpendUsd(db, input.organizationId);
  const overQuota = spentToday >= config.gen.quota.dailyUsdPerOrg;
  let prompt: string;
  if (input.kind === "image_edit") prompt = assembleEditPrompt(input.editInput!);
  else if (input.kind === "frame") prompt = assembleFramePrompt(input.promptInput!);
  else if (input.kind === "take" || input.kind === "retake") prompt = assembleTakePrompt(input.promptInput!);
  else if (input.kind === "shot_plan") prompt = assembleShotPlanPrompt(input.textInput!);
  else if (input.kind === "music_brief") prompt = assembleMusicBriefPrompt(input.textInput!); // was falling through to the SCRIPT prompt (QA 2026-07-23)
  else if (input.kind === "music") prompt = input.textInput!.scriptText ?? ""; // REQ-GEN-019: brief verbatim
  else prompt = assembleScriptPrompt(input.textInput!);

  await db.insert(generation).values({
    id,
    organizationId: input.organizationId,
    projectId: input.projectId,
    kind: input.kind,
    target: input.target,
    modelId: resolveModel(input.kind, input.quality ?? "standard"), // INV/BR: config-only routing
    promptSnapshot: {
      prompt,
      templateVersion: PROMPT_TEMPLATE_VERSION,
      refAssetIds: [
        ...(input.refs?.startFrameAssetId ? [input.refs.startFrameAssetId] : []),
        ...(input.refs?.editSourceAssetId ? [input.refs.editSourceAssetId] : []),
        ...(input.refs?.entityRefAssetIds ?? []),
      ], // INV-GEN-001
      refs: input.refs ?? {},
      input: input.promptInput ?? input.textInput ?? input.editInput,
    },
    params: { durationSeconds: input.promptInput?.durationSeconds, quality: input.quality ?? "standard" },
    // INV-GEN-004: over-quota enqueues fail immediately — visible in the UI, never billed
    ...(overQuota
      ? {
          status: "failed" as const,
          errorCode: "quota_exceeded",
          errorDetail: `Daily spend cap $${config.gen.quota.dailyUsdPerOrg} reached for this organization (spent $${spentToday.toFixed(2)} today) — resets at midnight UTC`,
        }
      : {}),
    commandId: input.commandId,
    principal: input.principal,
  });
  return id;
}
