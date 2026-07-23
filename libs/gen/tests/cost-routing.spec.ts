import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { computeCostUsd } from "../src/cost";
import { resolveModel } from "../src/routing";

describe("REQ-GEN-003: cost computation", () => {
  it("prices a 6.5s take at 0.65 USD", () => {
    expect(computeCostUsd("take", { durationSeconds: 6.5 })).toBeCloseTo(0.65, 5);
  });
  it("prices draft frames from the image price table", () => {
    expect(computeCostUsd("frame", { quality: "draft" })).toBeCloseTo(0.034 / 1000, 8);
  });
  it("mock executions cost zero", () => {
    expect(computeCostUsd("take", { durationSeconds: 8, mock: true })).toBe(0);
  });
});

describe("REQ-GEN-007: model routing from config only", () => {
  it("resolves kinds to configured models", () => {
    expect(resolveModel("take")).toMatch(/omni/);
    expect(resolveModel("frame", "draft")).toMatch(/lite-image/);
    expect(resolveModel("script")).toMatch(/flash/);
  });

  it("no hardcoded model-id literals outside libs/shared/src/config", () => {
    const root = join(import.meta.dirname, "..", "..", "..");
    // model ids: the vendor prefix followed by a digit or "omni"; plain doc links (…-api) are fine
    const needle = new RegExp("gemini" + "-(\\d|omni)");
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        if (["node_modules", ".git", ".next", "dist", "docs", "_archive", "data"].includes(name)) continue;
        const p = join(dir, name);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.(ts|tsx)$/.test(name) && !p.includes("libs/shared/src/config") && needle.test(readFileSync(p, "utf8")))
          offenders.push(p);
      }
    };
    walk(join(root, "libs"));
    walk(join(root, "apps"));
    expect(offenders).toEqual([]);
  });
});
