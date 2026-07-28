// REQ-GEN-036 — say WHY a take produced no video.
//
// USER 2026-07-28 hit "Generate the chain (10 shots)" and got:
//
//     take failed · output_unusable
//     no video in response: {}
//
// The `{}` is `op.error`, and for a filtered generation that is always empty: Veo completes the
// operation SUCCESSFULLY, returns no video, and puts the reason in `raiMediaFilteredCount` /
// `raiMediaFilteredReasons` — fields this code never read. So the one message the user got was the
// one field guaranteed to be empty in the most likely case.
//
// Pure on purpose: the decision is separable from the network call, which is the only reason it can
// be tested at all (CLAUDE.md §6B — extract the decision from the plumbing).
import { describe, expect, it } from "vitest";
import { videoFailure } from "../src/provider";

describe("REQ-GEN-036: a filtered video says so, and says why", () => {
  it("names the filter reason instead of an empty object", () => {
    const e = videoFailure({
      response: { raiMediaFilteredCount: 1, raiMediaFilteredReasons: ["Person/Face generation blocked"] },
    });
    expect(e.code).toBe("content_policy");
    expect(e.message).toMatch(/Person\/Face generation blocked/);
    expect(e.message, "the empty object was the whole complaint").not.toMatch(/^no video in response: \{\}$/);
  });

  it("reports a filtered count even when the API gives no reason string", () => {
    const e = videoFailure({ response: { raiMediaFilteredCount: 2 } });
    expect(e.code).toBe("content_policy");
    expect(e.message).toMatch(/2/);
    expect(e.message).toMatch(/filter/i);
  });

  it("still reports a genuine operation error when there is one", () => {
    const e = videoFailure({ error: { code: 13, message: "internal" } });
    expect(e.code).toBe("output_unusable");
    expect(e.message).toMatch(/internal/);
  });

  it("falls back honestly when the API says nothing at all", () => {
    const e = videoFailure({});
    expect(e.code).toBe("output_unusable");
    // Do not print "{}" and call it a reason — say that the provider gave none.
    expect(e.message).not.toMatch(/\{\}/);
    expect(e.message).toMatch(/no reason/i);
  });

  it("prefers the filter reason over a generic error when both are present", () => {
    const e = videoFailure({
      response: { raiMediaFilteredCount: 1, raiMediaFilteredReasons: ["Celebrity likeness"] },
      error: { message: "something else" },
    });
    expect(e.code).toBe("content_policy");
    expect(e.message).toMatch(/Celebrity likeness/);
  });
});
