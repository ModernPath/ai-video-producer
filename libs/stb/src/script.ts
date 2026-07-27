// REQ-STB-059 — the script: draft, read, critique and redraft.

import { and, eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import type { Db } from "@avd/shared/db";
import { config } from "@avd/shared/config";
import { enqueueGeneration } from "@avd/gen";
import { scriptVersion, shot, shotPlanProposal } from "./schema";
import { normalizePlannedShots } from "./plan-normalize";
import { normalizePlannedCast } from "./casting";
import { StbValidationError, getProjectOrThrow, projectCard, recipeFor, resolveCast } from "./common";

export async function draftScript(db: Db, input: { projectId: string; principal: string; instruction?: string }) {
  const p = await getProjectOrThrow(db, input.projectId);
  const cast = await resolveCast(db, input.projectId); // REQ-STB-012
  return enqueueGeneration(db, {
    organizationId: p.organizationId,
    projectId: p.id,
    principal: input.principal,
    kind: "script",
    commandId: uuidv7(),
    target: { projectId: p.id },
    textInput: {
      projectTitle: p.title,
      brief: (p.brief ?? {}) as Record<string, unknown>,
      targetDurationSeconds: Number(p.targetDurationS),
      instruction: input.instruction,
      entities: cast.entities,
      ...recipeFor(p),
    },
  });
}

export async function latestScript(db: Db, projectId: string) {
  const versions = await db.select().from(scriptVersion).where(eq(scriptVersion.projectId, projectId));
  return versions.sort((a, b) => b.version - a.version)[0] ?? null;
}

/**
 * REQ-STB-052 (USER 2026-07-27: "shouldn't it be run for the script?") — critique the SCRIPT and
 * redraft it, before it is broken into shots.
 *
 * The earlier place to catch a fault. Runtime, structure and who is in the film are decided here;
 * finding them in the shot plan means finding them after they have been split across ten shots.
 * Result is a new script VERSION, so the original stays in the history and nothing is overwritten.
 */
export async function critiqueAndRedraftScript(
  db: Db,
  input: { projectId: string; principal: string }
): Promise<{ versionId: string; issues: number } | null> {
  const p = await getProjectOrThrow(db, input.projectId);
  const current = await latestScript(db, input.projectId);
  if (!current?.content?.trim()) throw new StbValidationError("validation_failed", "There is no script to critique yet");
  const card = await projectCard(db, input.projectId);
  const targetDurationS = Math.round(Number(p.targetDurationS));

  const { SCRIPT_LENSES, assembleScriptCritiquePrompt, assembleScriptRedraftPrompt, mergeCritiques } = await import("./critique");
  const { textJson } = await import("@avd/gen/text-json");

  // Read in parallel and in isolation — reviewers who talk converge, and then there is one reviewer.
  const critiques = await Promise.all(
    SCRIPT_LENSES.map(async (lens) => ({
      lens: lens.id,
      issues: (await textJson<{ issues?: unknown[] }>(
        assembleScriptCritiquePrompt({ lens, scriptText: current.content, card: card ?? undefined, targetDurationS }), {}
      )).issues ?? [],
    }))
  );
  const issues = mergeCritiques(critiques as never);
  if (!issues.length) return { versionId: current.id, issues: 0 }; // nothing to answer; do not invent a redraft

  const { createGeminiProvider, mockProvider, mockEnabled: mocked } = await import("@avd/gen");
  const provider = mocked() ? mockProvider : createGeminiProvider();
  const { modelRoutes } = await import("@avd/shared/config");
  const res = await provider.generateText({
    model: modelRoutes.script,
    prompt: assembleScriptRedraftPrompt({ scriptText: current.content, issues, card: card ?? undefined, targetDurationS }),
  });
  const text = (res.text ?? "").trim();
  if (!text) return null; // a redraft we cannot read is not an improvement

  const id = uuidv7();
  await db.insert(scriptVersion).values({
    id,
    projectId: input.projectId,
    version: current.version + 1,
    content: text,
    source: "revised",
    generationId: null,
  });
  return { versionId: id, issues: issues.length };
}

/**
 * REQ-STB-051 — critique the draft plan from several angles, then revise it.
 *
 * USER 2026-07-27: "script planning could include some more iterations of adding critique steps
 * from few angles and improve." The mechanical grader runs first and free; the lenses read the plan
 * independently for what no rule can catch; the revision has to answer all of it at once. Result is
 * a NEW proposal, so the original stays on the record and nothing is applied behind the user's back.
 */
export async function critiqueAndRevise(
  db: Db,
  input: { proposalId: string; principal: string }
): Promise<{ proposalId: string; issues: number } | null> {
  const [proposal] = await db.select().from(shotPlanProposal).where(eq(shotPlanProposal.id, input.proposalId));
  if (!proposal) throw new StbValidationError("not_found", "Proposal not found");
  const shots = normalizePlannedShots(proposal.changes);
  if (!shots.length) return null;
  const card = await projectCard(db, proposal.projectId);

  const { assembleCritiquePrompt, mergeCritiques, CRITIQUE_LENSES } = await import("./critique");
  const { textJson } = await import("@avd/gen/text-json");
  const { reviewPlan, assembleDirectorPassPrompt } = await import("./director-pass");

  // Lenses read in PARALLEL and in isolation — one shared conversation would let them converge on
  // a single opinion, which is the opposite of why there are several.
  const critiques = await Promise.all(
    CRITIQUE_LENSES.map(async (lens) => ({
      lens: lens.id,
      issues: (await textJson<{ issues?: unknown[] }>(assembleCritiquePrompt({ lens, shots, card: card ?? undefined }), {})).issues ?? [],
    }))
  );
  const merged = mergeCritiques(critiques as never);
  const mechanical = reviewPlan(shots, card ?? undefined);
  if (!merged.length && !mechanical.length) return { proposalId: input.proposalId, issues: 0 }; // already sound

  const revision = await textJson<unknown>(
    [
      assembleDirectorPassPrompt({ shots, notes: mechanical, card: card ?? undefined }),
      ``,
      `The plan was also read by ${CRITIQUE_LENSES.length} reviewers. Every issue below must be resolved too:`,
      ...merged.map((i) => `- [${i.severity}] (${i.lens}) ${i.shotTitle}: ${i.note}`),
    ].join("\n"),
    null
  );
  const revised = normalizePlannedShots(revision);
  if (!revised.length) return null; // a revision we cannot read is not an improvement

  const id = uuidv7();
  await db.insert(shotPlanProposal).values({
    id,
    projectId: proposal.projectId,
    scriptVersionId: proposal.scriptVersionId,
    changes: { shots: revised, cast: normalizePlannedCast(proposal.changes) },
    generationId: null,
  });
  return { proposalId: id, issues: merged.length + mechanical.length };
}
