// REQ-STB-059 — the split, asserted rather than intended.
//
// `docs/88-architecture-review.md` §3: `service.ts` reached 1,147 lines and 42 exports covering
// shots, takes, frames, plans, scripts, casting, continuity, chains and critique. The lib
// boundaries between contexts held perfectly the whole time; the same discipline was never applied
// inside one. CLAUDE.md §10B fixed ~300 lines as the signal to look for the seam.
//
// Two different jobs here:
//   1. `module shape` was RED when written — service.ts was 1,147 lines. It is the acceptance
//      criterion, not a description of the code.
//   2. `public surface` was GREEN when written, on purpose. It is a regression harness: the split
//      must not drop or rename a single export, and 26 specs plus `apps/web` import these names.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import * as service from "../src/service";
import * as index from "../src/index";

const srcDir = join(import.meta.dirname, "..", "src");
const lines = (f: string) => readFileSync(join(srcDir, f), "utf8").split("\n").length;

/** CLAUDE.md §10B. Not a hard cap — the point is that nothing silently grows past it again. */
const MAX_LINES = 300;

describe("REQ-STB-059: no STB module carries more than one aggregate", () => {
  it(`every src module is under ~${MAX_LINES} lines`, () => {
    const oversized = readdirSync(srcDir)
      .filter((f) => f.endsWith(".ts"))
      .map((f) => ({ f, n: lines(f) }))
      .filter(({ n }) => n > MAX_LINES)
      .sort((a, b) => b.n - a.n);
    expect(oversized, `split these by aggregate: ${oversized.map((o) => `${o.f} (${o.n})`).join(", ")}`)
      .toEqual([]);
  });
});

// The exact runtime surface at the moment of the split. A name added here later is a deliberate
// act; a name that DISAPPEARS is what this catches, because `export *` would hide it until a
// consumer crashed at runtime.
const SURFACE = [
  "StbValidationError",
  "applyShotPlan", "attachMusicTrack", "castFromPortrait", "chainGenerationPlan",
  "createShot", "critiqueAndRedraftScript", "critiqueAndRevise", "draftScript",
  "getMusicBrief", "handoffTailFrame", "latestScript", "listCandidates", "listShots",
  "materializeGenerationOutput", "moveShotToIndex", "proposeShotPlan", "removeFrameCandidate",
  "removeShot", "removeTake", "reorderShot", "requestAnimationOverlay", "requestAnimationTake",
  "requestEntityPortrait", "requestFrame", "requestFrameBatch", "requestMusicBrief",
  "requestMusicTrack", "requestRetake", "requestTake", "requestTranscript",
  "runChainForShot", // REQ-STB-067
  "selectFrame",
  "selectTake", "setShotContinuity", "takeProvenance", "updateShotDialogue", "updateShotDuration",
  "updateShotRefs", "updateShotScripts", "upsertMusicBriefForTest",
].sort();

describe("REQ-STB-059: the public surface survives the split unchanged", () => {
  it("../src/service still exports every name it did before", () => {
    expect(Object.keys(service).sort()).toEqual(SURFACE);
  });

  it("the package index re-exports all of them too", () => {
    const missing = SURFACE.filter((n) => !(n in index));
    expect(missing, `dropped from @avd/stb: ${missing.join(", ")}`).toEqual([]);
  });

  it("every exported name is callable — a barrel that resolves to undefined is the failure mode", () => {
    const dead = SURFACE.filter((n) => (service as Record<string, unknown>)[n] === undefined);
    expect(dead, `exported but undefined: ${dead.join(", ")}`).toEqual([]);
  });
});
