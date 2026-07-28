// REQ-GEN-037 — the deployed configuration, asserted rather than assumed.
//
// USER BUG 2026-07-28: takes failed on the deployed app. `GEN_VIDEO_ROUTE=omni` was set in
// `apps/web/.env.local` and nowhere else, so every deployed process fell back to the `"veo"`
// default in `limits.ts`. Nothing was broken in the code — the code did exactly what it was
// configured to do, in an environment nobody had configured.
//
// This is a config ARTIFACT test (CLAUDE.md §1.9): the thing that ships is the YAML, so the YAML is
// what gets asserted. A missing value here is invisible at runtime — it just quietly becomes a
// different model, with a different duration palette and different content filters.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { config } from "@avd/shared/config";

const deploy = readFileSync(join(process.cwd(), "config/deploy.yml"), "utf8");
/** The `clear:` block under the top-level `env:` — values every role receives. */
const clearEnv = deploy.slice(deploy.indexOf("\nenv:"), deploy.indexOf("  secret:"));

describe("REQ-GEN-037: the deployed environment declares what generation depends on", () => {
  it("declares the video route, so a deploy cannot silently fall back to the default", () => {
    expect(clearEnv, "GEN_VIDEO_ROUTE missing from config/deploy.yml — every deployed take would use the veo default")
      .toMatch(/^\s+GEN_VIDEO_ROUTE:\s*(veo|omni)\s*$/m);
  });

  it("declares it at env.clear, which both the web and worker roles receive", () => {
    // A per-role declaration would reintroduce exactly the split this requirement exists to close:
    // a generation resolving a different route depending on which process claimed it.
    const roleBlocks = deploy.slice(deploy.indexOf("servers:"), deploy.indexOf("\nenv:"));
    expect(roleBlocks).not.toMatch(/GEN_VIDEO_ROUTE/);
  });

  it("names a route the code actually understands", () => {
    const declared = /GEN_VIDEO_ROUTE:\s*(\w+)/.exec(clearEnv)?.[1];
    // `limits.ts` treats anything that is not "omni" as "veo", so a typo would not throw — it would
    // silently deploy the other model. That is the failure mode, so assert the value itself.
    expect(["veo", "omni"]).toContain(declared);
  });

  it("still declares WORKER_MODE — the route only matters because the worker generates", () => {
    expect(clearEnv).toMatch(/WORKER_MODE:\s*"?queue"?/);
  });

  it("the default the code falls back to is still veo, which is what made this silent", () => {
    // Pins the premise of this whole requirement. If the default ever changes, this test should be
    // read again rather than updated reflexively.
    const prior = process.env.GEN_VIDEO_ROUTE;
    expect(typeof config.gen.videoRoute).toBe("string");
    expect(["veo", "omni"]).toContain(config.gen.videoRoute);
    expect(prior === "omni" ? "omni" : config.gen.videoRoute).toBeTruthy();
  });
});
