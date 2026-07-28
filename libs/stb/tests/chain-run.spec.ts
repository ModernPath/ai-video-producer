// REQ-STB-067 (USER 2026-07-28) — "generate whole chain does not work, it just creates the next
// clip. Can't it do so that it always loops for all the subclips, and when subclip video completes,
// it takes the last frame and puts that to next clip and generates its video etc."
//
// It could not, in production. `generateChainAction` looped correctly but called
// `drainQueueAndMaterialize`, which in QUEUE mode enqueues and returns immediately. So no take
// existed to select, the next shot hit the REQ-STB-055 out-of-order guard, and the `catch` swallowed
// it — one shot per click. Inline mode (dev, and every integration test) ran the generation
// synchronously, so nothing caught it until the app was deployed with WORKER_MODE=queue.
//
// The fix moves the loop to the worker, where waiting is allowed. `runChain` is the orchestration
// with its effects injected, so what this spec asserts is the ORDER — generate, wait, materialize,
// hand the frame on, THEN start the next — which is the whole of the user's request.
import { describe, expect, it } from "vitest";
import { runChain, type ChainDeps } from "../src/chain-run";

const PLAN = [
  { shotId: "a", title: "Shot A" },
  { shotId: "b", title: "Shot B" },
  { shotId: "c", title: "Shot C" },
];

function deps(over: Partial<ChainDeps> & { selected?: Record<string, string | null>; fail?: string } = {}): {
  d: ChainDeps;
  log: string[];
} {
  const log: string[] = [];
  const selected: Record<string, string | null> = over.selected ?? {};
  const d: ChainDeps = {
    plan: async () => PLAN,
    selectedTakeId: async (s) => selected[s] ?? null,
    requestTake: async (s) => {
      log.push(`request:${s}`);
      return `gen-${s}`;
    },
    runGeneration: async (g) => {
      log.push(`run:${g}`);
      return over.fail && g === `gen-${over.fail}` ? "failed" : "succeeded";
    },
    materialize: async (g) => {
      log.push(`materialize:${g}`);
      selected[g.replace("gen-", "")] = `take-${g}`;
    },
    handoff: async (s) => {
      log.push(`handoff:${s}`);
    },
    ...over,
  };
  return { d, log };
}

describe("REQ-STB-067: the chain runs every shot, not just the next one", () => {
  it("walks all three shots to completion", async () => {
    const { d, log } = deps();
    const steps = await runChain(d, "a");
    expect(steps.map((s) => s.status)).toEqual(["generated", "generated", "generated"]);
    expect(log.filter((l) => l.startsWith("request:"))).toEqual(["request:a", "request:b", "request:c"]);
  });

  it("finishes each shot before starting the next — generate, materialize, hand off, then request", async () => {
    // The bug in one assertion: the old code issued request:a then request:b with nothing in
    // between, so shot B started from no frame at all.
    const { d, log } = deps();
    await runChain(d, "a");
    expect(log).toEqual([
      "request:a", "run:gen-a", "materialize:gen-a", "handoff:a",
      "request:b", "run:gen-b", "materialize:gen-b", "handoff:b",
      "request:c", "run:gen-c", "materialize:gen-c", "handoff:c",
    ]);
  });

  it("hands the last frame on BEFORE the next shot is requested", async () => {
    const { d, log } = deps();
    await runChain(d, "a");
    expect(log.indexOf("handoff:a")).toBeLessThan(log.indexOf("request:b"));
  });

  it("does not re-buy a shot that already has a selected take", async () => {
    const { d, log } = deps({ selected: { a: "take-existing" } });
    const steps = await runChain(d, "a");
    expect(steps[0]).toMatchObject({ shotId: "a", status: "skipped" });
    expect(log).not.toContain("request:a");
    // ...but it still hands A's frame on, or B would start from nothing.
    expect(log[0]).toBe("handoff:a");
    expect(log).toContain("request:b");
  });

  it("stops at a failure and says which shot broke — the rest would start from nothing", async () => {
    const { d, log } = deps({ fail: "b" });
    const steps = await runChain(d, "a");
    expect(steps.map((s) => s.status)).toEqual(["generated", "failed"]);
    expect(steps[1]).toMatchObject({ shotId: "b", title: "Shot B" });
    expect(log).not.toContain("request:c");
  });

  it("a lone shot is a chain of one", async () => {
    const { d } = deps({ plan: async () => [{ shotId: "solo", title: "Solo" }] });
    expect((await runChain(d, "solo")).map((s) => s.status)).toEqual(["generated"]);
  });
});
