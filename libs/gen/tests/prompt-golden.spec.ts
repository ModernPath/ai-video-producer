import { describe, expect, it } from "vitest";
import { assembleFramePrompt, assembleScriptPrompt, assembleShotPlanPrompt, assembleTakePrompt } from "../src/prompt";
import type { StyleCard } from "@avd/shared/contracts";

// REQ-GEN-032 — golden files of what the MODEL ACTUALLY RECEIVES.
//
// The review's central finding (docs/88-architecture-review.md §1) was that the suite asserted the
// code that builds prompts and never asserted the prompt. Every rail regression this run shipped
// green. These snapshots make each one a reviewable diff: change a rail, see it in the file.
//
// Update deliberately with `vitest -u`, and READ the diff — an unexpected line here is a bug.
const card: StyleCard = {
  id: "golden-card", name: "Deadpan northern comedy",
  provenance: { brief: "a film in the style of Aki Kaurismäki", references: ["Aki Kaurismäki"] },
  structure: { arc: "flat affect throughout", shotCountHint: [7, 9] },
  camera: { allowedMovements: ["static"], preferredSizes: ["MW", "MS"], angles: ["eye"], notes: "Locked off, frontal, symmetrical." },
  pacing: { durationWindowS: [6, 8] },
  palette: { accent: "#c8202a", background: "#4a4a32", notes: "Saturated primaries against drab olive." },
  light: "Hard practical sources, deep shadow.",
  performance: "Deadpan. No reaction shots.",
  humour: "Understatement — the joke is the hold.",
  sound: "Sparse diegetic room tone.",
  typography: "Plain mustard title text on navy cards.",
  continuity: "Pasi wears the same grey wool suit and knitted tie in every shot.",
  antiNotes: ["no handheld", "no cartoon or illustrated rendering"],
};

const cast = [
  { kind: "person" as const, name: "Pasi", description: "a stoic man in a grey wool suit" },
  { kind: "location" as const, name: "The Canteen", description: "a worn municipal canteen" },
];

describe("REQ-GEN-032: assembled prompts, as the model receives them", () => {
  it("planner-authored take, with a card, a spoken line and a style kit", async () => {
    await expect(assembleTakePrompt({
      aspectRatio: "16:9", durationSeconds: 6, entities: cast, card,
      stylePrompt: "muted teal grade, 35mm grain",
      customPrompt: "Static wide of the canteen booth. Pasi sits motionless, cup in hand.",
      direction: { synopsis: "canteen", subject: "Pasi", action: "sits", dialogue: "We need structure." },
    })).toMatchFileSnapshot("__prompts__/take-planner-authored.txt");
  });

  it("composed take, no custom text — direction drives it", async () => {
    await expect(assembleTakePrompt({
      aspectRatio: "16:9", durationSeconds: 8, entities: cast, card,
      direction: {
        synopsis: "A canteen at closing time", subject: "Pasi", action: "sets the cup down",
        camera: "locked off, frontal", mood: "deadpan", audioNotes: "distant kitchen clatter",
      },
    })).toMatchFileSnapshot("__prompts__/take-composed.txt");
  });

  it("silent take — the silence is stated, not left to the model", async () => {
    await expect(assembleTakePrompt({
      aspectRatio: "9:16", durationSeconds: 4, entities: [], card,
      customPrompt: "An empty corridor.",
      direction: { synopsis: "corridor", subject: "the corridor", action: "holds" },
    })).toMatchFileSnapshot("__prompts__/take-silent.txt");
  });

  it("frame with reference images and a product in the cast", async () => {
    await expect(assembleFramePrompt({
      aspectRatio: "16:9", card, referenceImageCount: 2,
      entities: [...cast, { kind: "product" as const, name: "ModernPath Box", description: "a slate carton" }],
      stylePrompt: "muted teal grade",
      customPrompt: "Medium close-up of Pasi at the booth.",
      direction: { synopsis: "booth", subject: "Pasi", action: "sits" },
    })).toMatchFileSnapshot("__prompts__/frame-with-refs.txt");
  });

  it("no card at all — the film has chosen no style", async () => {
    await expect(assembleTakePrompt({
      aspectRatio: "16:9", durationSeconds: 6, entities: [],
      customPrompt: "A red kettle boils.",
      direction: { synopsis: "kettle", subject: "a kettle", action: "boils" },
    })).toMatchFileSnapshot("__prompts__/take-no-card.txt");
  });
});

// REQ-STB-032 / ADR-013 — the shot plan prompt for a music-led film.
//
// The whole decision is that this plan is made AGAINST the real track. The transcript stamps
// reaching the model is the artifact that proves it, so it is a golden file rather than a
// `toContain` — if the alignment instruction is ever weakened or the stamps stop being passed, it
// shows up here as a diff instead of as a film whose words arrive fifteen seconds early.
describe("REQ-STB-032: music-led shot plan carries the track's stamps", () => {
  it("plan prompt with a transcript", async () => {
    await expect(assembleShotPlanPrompt({
      projectTitle: "Neon Rivers",
      brief: { idea: "a lyric video for a synthwave track" },
      targetDurationSeconds: 60,
      scriptText: "Neon reflections on wet asphalt; a lone driver.",
      entities: [],
      transcript: "[00:00] instrumental intro\n[00:23] verse one — neon rivers run\n[00:47] chorus — hold the light",
    })).toMatchFileSnapshot("__prompts__/shot-plan-music-led.txt");
  });
});

// REQ-STB-066 (USER 2026-07-28: "will they be used in prompt if I redraft the script?") — no, they
// were not. ADR-013 says a music-led film plans against the real track, and the PLANNER did receive
// the transcript. The SCRIPT never did: `assembleScriptPrompt` had no transcript line at all, so
// the song could not reach the stage where structure and runtime are actually decided. A redraft
// was written blind to the words it has to carry, and the mismatch only surfaced a stage later.
describe("REQ-STB-066: a music-led SCRIPT is written against the track too", () => {
  it("script prompt with a transcript", async () => {
    await expect(assembleScriptPrompt({
      projectTitle: "Neon Rivers",
      brief: { idea: "a lyric video for a synthwave track" },
      targetDurationSeconds: 60,
      entities: [],
      transcript: "[00:00] instrumental intro\n[00:23] verse one — neon rivers run\n[00:47] chorus — hold the light",
    })).toMatchFileSnapshot("__prompts__/script-music-led.txt");
  });
});
