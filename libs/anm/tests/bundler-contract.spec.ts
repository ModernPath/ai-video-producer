// REQ-ANM-002 — the TypeScript API @remotion/bundler actually calls.
//
// USER 2026-08-03: the production worker was jammed. It was not hung — it was CRASH-LOOPING. Every
// Remotion render (an animation shot, and the captions pass of an export) died with:
//
//     const tsConfig = typescript.readConfigFile(tsConfigPath, typescript.sys.readFile);
//     TypeError: Cannot read properties of undefined (reading 'readFile')
//
// Cause: the 2026-07-27 dependency update took `typescript` from 5.9 to **7.0.2**. TypeScript 7 is
// the native port; it does not expose the classic JS compiler API, so `ts.sys` and
// `ts.readConfigFile` are both `undefined`. Remotion's esbuild loader calls both.
//
// That upgrade was verified against `tsc`, the test suite and `next build` — none of which touch
// this surface. It had already broken `next dev` once (patched with `experimental.useTypeScriptCli`,
// now removed); this was the same root cause reaching production, where it took the whole worker
// down with it.
//
// So: assert the API, not the version number. A future TypeScript that restores `ts.sys` is fine; a
// future one that removes it must fail HERE, in half a second, rather than in a crash loop on a
// Hetzner box while a film sits at 8/9 shots.
import { describe, expect, it } from "vitest";
import ts from "typescript";

describe("REQ-ANM-002: the TypeScript build API Remotion depends on is present", () => {
  it("exposes ts.sys.readFile — the exact call that crashed the worker", () => {
    expect(ts.sys, "TypeScript 7 removed ts.sys; @remotion/bundler dereferences it unconditionally")
      .toBeDefined();
    expect(typeof ts.sys.readFile).toBe("function");
  });

  it("exposes ts.readConfigFile — the other half of the same line", () => {
    expect(typeof ts.readConfigFile).toBe("function");
  });

  it("reads a real tsconfig through that API, the way the bundler does", () => {
    // Not a mock: if the API exists but cannot parse this repo's own config, Remotion still fails.
    const found = ts.findConfigFile(process.cwd(), ts.sys.fileExists, "tsconfig.base.json");
    expect(found, "tsconfig.base.json should be discoverable from the repo root").toBeTruthy();
    const parsed = ts.readConfigFile(found!, ts.sys.readFile);
    expect(parsed.error, `reading ${found} failed`).toBeUndefined();
    expect(parsed.config).toBeTypeOf("object");
  });
});
