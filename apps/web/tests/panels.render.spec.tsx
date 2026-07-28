// @vitest-environment happy-dom
// REQ-STB-060 acceptance criterion 2 — "a panel is renderable in a test without a database".
//
// Asserted rather than asserted-about. Each panel below is constructed with plain values and
// mounted; if any of them reached for `db()` or awaited a query, this file would not run at all.
// That property is the whole point of the decomposition — it is what made REQ-STB-061 possible —
// so it gets a test that fails the moment a panel starts loading its own data.
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AddShotPanel } from "../app/p/[id]/panels/AddShotPanel";
import { CastPanel } from "../app/p/[id]/panels/CastPanel";
import { MusicPanel } from "../app/p/[id]/panels/MusicPanel";
import { OutputPanel } from "../app/p/[id]/panels/OutputPanel";
import { omniVideoModel } from "@avd/shared/config"; // REQ-GEN-007: never a model-id literal

afterEach(cleanup);

const project = {
  id: "proj-1", organizationId: "org-1", title: "Test", aspectRatio: "16:9",
  targetDurationS: "30", brief: { idea: "a film" }, audioMixMode: null,
  createdAt: new Date("2026-07-27T00:00:00Z"),
} as never;

describe("REQ-STB-060: every extracted panel renders without a database", () => {
  it("AddShotPanel", () => {
    const { container } = render(<AddShotPanel id="proj-1" />);
    expect(container.querySelector("form")).not.toBeNull();
  });

  it("CastPanel", () => {
    const { container } = render(<CastPanel id="proj-1" castIds={new Set()} orgEntities={[]} />);
    expect(container.textContent).toBeTypeOf("string");
  });

  it("MusicPanel", () => {
    const { container } = render(
      <MusicPanel p={project} id="proj-1" music={null as never} sync={null} activeKinds={new Set()} />
    );
    expect(container.textContent).toBeTypeOf("string");
  });

  it("OutputPanel", () => {
    const { container } = render(
      <OutputPanel
        p={project} id="proj-1" music={null as never} kits={[]} recentGens={[]}
        progress={{ ready: false, pending: [], done: 0, total: 1 } as never} captionSelect={null}
      />
    );
    expect(container.textContent).toBeTypeOf("string");
  });

  // The guarantee itself: a panel that imported the db helper would break the harness for
  // everything above, so state it directly.
  it("no panel module imports the database helper", async () => {
    const { readdirSync, readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const dir = join(process.cwd(), "apps/web/app/p/[id]/panels");
    const offenders = readdirSync(dir)
      .filter((f) => f.endsWith(".tsx"))
      .filter((f) => /from "\.\.\/\.\.\/\.\.\/\.\.\/lib\/db"|\bdb\(\)/.test(readFileSync(join(dir, f), "utf8")));
    expect(offenders, `these panels load their own data: ${offenders.join(", ")}`).toEqual([]);
  });
});

// REQ-GEN-037 — the route has to be VISIBLE, or a wrong one is only ever inferred from a duration
// palette after a film comes out wrong. The generation ledger already records `modelId`; this puts
// it next to the cost. Asserted here rather than in a browser: local dev now sits behind sign-in
// (REQ-PLT-002) and signing in is not something an agent should do on the user's behalf.
describe("REQ-GEN-037: a generation says which model actually ran", () => {
  const gen = (over = {}) => ({
    id: "gen-1", kind: "take", status: "succeeded", costUsd: "0.60",
    modelId: omniVideoModel, retryOf: null, errorCode: null, ...over,
  });

  it("names the model beside the cost", () => {
    const { container } = render(
      <OutputPanel
        p={project} id="proj-1" music={null as never} kits={[]} recentGens={[gen()] as never}
        progress={{ ready: false, pending: [], done: 0, total: 1 } as never} captionSelect={null}
      />
    );
    const text = container.textContent ?? "";
    expect(text).toContain(omniVideoModel);
    expect(text, "cost and model belong on the same line — that is what makes a wrong route obvious")
      .toContain(`take · succeeded · $0.60 · ${omniVideoModel}`);
  });

  it("a failed take still names its model and its reason", () => {
    const { container } = render(
      <OutputPanel
        p={project} id="proj-1" music={null as never} kits={[]}
        recentGens={[gen({ status: "failed", costUsd: null, errorCode: "content_policy" })] as never}
        progress={{ ready: false, pending: [], done: 0, total: 1 } as never} captionSelect={null}
      />
    );
    const text = container.textContent ?? "";
    expect(text).toContain("content_policy");
    expect(text).toContain(omniVideoModel);
  });
});
