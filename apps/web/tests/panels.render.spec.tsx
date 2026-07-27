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
