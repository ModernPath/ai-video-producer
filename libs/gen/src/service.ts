// REQ-GEN-001 (provenance before execution) + REQ-GEN-007 + REQ-GEN-013 + REQ-GEN-015 (config guard).
import { v7 as uuidv7 } from "uuid";
import type { Db } from "@avd/shared/db";
import type { FrameQuality, GenerationKind } from "@avd/shared/config";
import {
  PROMPT_TEMPLATE_VERSION, assembleEditPrompt, assembleFramePrompt, assembleScriptPrompt, assembleShotPlanPrompt,
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
  quality?: FrameQuality;
  promptInput?: TakePromptInput;   // media kinds
  textInput?: TextPromptInput;     // script / shot_plan / music_brief kinds
  refs?: { startFrameAssetId?: string; entityRefAssetIds?: string[]; editSourceAssetId?: string }; // REQ-GEN-009/012 + REQ-AST-006
  editInput?: EditPromptInput; // image_edit kinds
}

export class GenConfigError extends Error {}

export async function enqueueGeneration(db: Db, input: EnqueueInput): Promise<string> {
  if (!mockEnabled() && !process.env.GEMINI_API_KEY) {
    throw new GenConfigError("Generation is not configured: set GEMINI_API_KEY or MOCK_GEN=1"); // REQ-GEN-015
  }
  const id = uuidv7();
  let prompt: string;
  if (input.kind === "image_edit") prompt = assembleEditPrompt(input.editInput!);
  else if (input.kind === "frame") prompt = assembleFramePrompt(input.promptInput!);
  else if (input.kind === "take" || input.kind === "retake") prompt = assembleTakePrompt(input.promptInput!);
  else if (input.kind === "shot_plan") prompt = assembleShotPlanPrompt(input.textInput!);
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
    commandId: input.commandId,
    principal: input.principal,
  });
  return id;
}
