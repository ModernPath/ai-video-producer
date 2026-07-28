/**
 * REQ-STB-067 (USER 2026-07-28) — run a whole continuity chain, one shot at a time, to the end.
 *
 * "generate whole chain does not work, it just creates the next clip … can't it loop for all the
 * subclips, and when subclip video completes, it takes the last frame and puts that to next clip".
 *
 * It could not. The old loop lived in a server action and called `drainQueueAndMaterialize`, which
 * in QUEUE mode enqueues and returns — so no take existed to hand a frame from, the next shot hit
 * the REQ-STB-055 out-of-order guard, and a bare `catch` swallowed it. One shot per click. Inline
 * mode ran the generation synchronously, which is why dev and every integration test were fine and
 * only the deployed app was broken.
 *
 * Waiting for a video is measured in minutes, so the loop belongs where waiting is allowed: the
 * worker. This module is the orchestration ONLY — every effect is injected, so the order of
 * operations (the actual subject of the bug) is unit-testable with no database and no provider.
 */

export interface ChainDeps {
  /** The whole chain containing this shot, head first (see `chainGenerationPlan`). */
  plan: (shotId: string) => Promise<Array<{ shotId: string; title: string }>>;
  selectedTakeId: (shotId: string) => Promise<string | null>;
  /** Enqueue a take for this shot; returns the generation id. */
  requestTake: (shotId: string) => Promise<string>;
  /** Run that generation to completion. This is the part that takes minutes. */
  runGeneration: (generationId: string) => Promise<"succeeded" | "failed">;
  /** Turn the finished generation into a take (and select it — REQ-STB-034). */
  materialize: (generationId: string) => Promise<void>;
  /** Push this shot's selected take's LAST FRAME onto whatever continues from it (REQ-STB-054). */
  handoff: (shotId: string) => Promise<void>;
}

export interface ChainStep {
  shotId: string;
  title: string;
  status: "generated" | "skipped" | "failed";
}

export async function runChain(deps: ChainDeps, shotId: string): Promise<ChainStep[]> {
  const steps = await deps.plan(shotId);
  const out: ChainStep[] = [];

  for (const step of steps) {
    // Already has a chosen take: never re-buy it. This is also what makes the job safe to retry —
    // a worker restart resumes where it stopped instead of paying for the chain twice.
    if (await deps.selectedTakeId(step.shotId)) {
      out.push({ shotId: step.shotId, title: step.title, status: "skipped" });
      // Still hand its frame on: the follower needs a start frame whether or not WE generated this.
      await deps.handoff(step.shotId);
      continue;
    }

    const generationId = await deps.requestTake(step.shotId);
    const result = await deps.runGeneration(generationId);
    if (result !== "succeeded") {
      // Stop. Every shot after this one would start from a frame that does not exist, so carrying
      // on would buy takes that silently defeat the chain — the exact waste REQ-STB-055 exists for.
      out.push({ shotId: step.shotId, title: step.title, status: "failed" });
      return out;
    }

    await deps.materialize(generationId);
    // The whole point of a chain: this take's last frame becomes the next shot's first.
    await deps.handoff(step.shotId);
    out.push({ shotId: step.shotId, title: step.title, status: "generated" });
  }

  return out;
}

/**
 * REQ-STB-067 — `runChain` wired to the real database, generator and materializer.
 *
 * Lives here rather than in the worker so the composition is testable from STB's own suite and so
 * a second caller (a CLI, a retry) cannot assemble the steps in a different order.
 */
export async function runChainForShot(
  db: import("@avd/shared/db").Db,
  input: { shotId: string; principal: string; aspectRatio: "16:9" | "9:16" }
): Promise<ChainStep[]> {
  const { eq } = await import("drizzle-orm");
  const { shot } = await import("./schema");
  const { chainGenerationPlan, handoffTailFrame } = await import("./continuity");
  const { requestTake } = await import("./takes");
  const { materializeGenerationOutput } = await import("./materialize");
  const { runGenerationById } = await import("@avd/gen");

  return runChain(
    {
      plan: (shotId) => chainGenerationPlan(db, { shotId }),
      selectedTakeId: async (shotId) => {
        const [row] = await db.select().from(shot).where(eq(shot.id, shotId));
        return row?.selectedTakeId ?? null;
      },
      requestTake: (shotId) =>
        requestTake(db, { shotId, principal: input.principal, aspectRatio: input.aspectRatio }),
      runGeneration: async (generationId) => {
        const res = await runGenerationById(db, generationId);
        return res?.status === "succeeded" ? "succeeded" : "failed";
      },
      materialize: async (generationId) => {
        await materializeGenerationOutput(db, generationId);
      },
      // Best-effort, exactly as `selectTake` treats it: a failed handoff must not abort a chain
      // whose takes are already bought and good.
      handoff: async (shotId) => {
        await handoffTailFrame(db, { shotId }).catch(() => []);
      },
    },
    input.shotId
  );
}
