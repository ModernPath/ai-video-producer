// REQ-STB-066 (USER 2026-07-28) — the track's words reach every stage that writes the script.
//
// "how the music lyrics transcript and video script are linked? will they be used in prompt if I
// redraft the script?" They were not. The transcript reached `assembleShotPlanPrompt` and nothing
// else, so both script paths — the first draft and the critique redraft — were written blind to the
// song. ADR-013's rule ("a music-led film plans against the real track") was being honoured one
// stage too late: structure and runtime are decided in the SCRIPT, which is exactly what
// `critiqueAndRedraftScript` calls "the earlier place to catch a fault".
//
// Asserted on the assembled prompts, which are the artifacts (CLAUDE.md §1.9).
import { describe, expect, it } from "vitest";
import { assembleScriptCritiquePrompt, assembleScriptRedraftPrompt, SCRIPT_LENSES } from "../src/critique";

const TRANSCRIPT = "[00:00] [Intro]\n[00:29] [Chorus]\n[00:29] Burn down the past!\n[00:59] [Outro]";

describe("REQ-STB-066: the critique reads the script against the track", () => {
  it("carries the transcript stamps when the film is cut to a song", () => {
    const p = assembleScriptCritiquePrompt({
      lens: SCRIPT_LENSES[0]!,
      scriptText: "A man tears down an office.",
      card: undefined,
      targetDurationS: 59,
      transcript: TRANSCRIPT,
    });
    expect(p).toContain("[00:29] Burn down the past!");
    // A reviewer given the words but not told they are binding will critique the prose alone.
    expect(p).toMatch(/cut to this track|against this track|runs to this track/i);
  });

  it("says nothing about a track when there is none", () => {
    const p = assembleScriptCritiquePrompt({
      lens: SCRIPT_LENSES[0]!,
      scriptText: "A man tears down an office.",
      card: undefined,
      targetDurationS: 30,
    });
    expect(p).not.toMatch(/TRACK/i);
  });
});

describe("REQ-STB-066: the redraft rewrites against the track", () => {
  it("carries the transcript stamps", () => {
    const p = assembleScriptRedraftPrompt({
      scriptText: "A man tears down an office.",
      issues: [{ lens: "structure", severity: "error", shotTitle: "Open", note: "no hook" } as never],
      card: undefined,
      targetDurationS: 59,
      transcript: TRANSCRIPT,
    });
    expect(p).toContain("[00:29] Burn down the past!");
    expect(p).toMatch(/cut to this track|against this track|runs to this track/i);
  });

  it("says nothing about a track when there is none", () => {
    const p = assembleScriptRedraftPrompt({
      scriptText: "A man tears down an office.",
      issues: [{ lens: "structure", severity: "error", shotTitle: "Open", note: "no hook" } as never],
      card: undefined,
      targetDurationS: 30,
    });
    expect(p).not.toMatch(/TRACK/i);
  });
});
