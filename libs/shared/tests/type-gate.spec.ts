// REQ-GEN-033 — the static gate, asserted on its OUTPUT rather than its wiring (CLAUDE.md §1.9).
//
// `docs/88-architecture-review.md` §5 listed three hazards "the type system did not catch" and
// proposed lint rules. Measured while building this: the type system catches all three already —
// TS1117, TS2740 and TS2769. What failed was the GATE. `pnpm typecheck` carried 45 errors across
// 11 files, so a new one could never be seen, and nothing in CI or the DoD ran it anyway. The
// duplicate `config.project` key that made every threshold read `undefined` was sitting in front of
// a compiler that would have rejected it.
//
// So the fix was to repair and enforce the gate, and this spec is what stops it rotting again: each
// case compiles a fixture and asserts the compiler REJECTS it with the specific code. A positive
// control compiles the correct version and asserts it is accepted — without that, a fixture with a
// typo'd import would "fail to compile" for the wrong reason and this suite would go green on
// nothing. (That exact mistake is recorded in this repo: a guard test that asserted on its own
// fixture and passed against live buggy code.)
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

const dir = mkdtempSync(join(tmpdir(), "avd-typegate-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

/** Compile one throwaway file with the repo's own tsc; return its diagnostics ("" = accepted). */
function compile(source: string, name: string): string {
  const file = join(dir, `${name}.ts`);
  writeFileSync(file, source);
  try {
    execFileSync(
      join(process.cwd(), "node_modules/.bin/tsc"),
      ["--noEmit", "--strict", "--target", "ES2023", "--types", "node", file],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
    );
    return "";
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string };
    return `${err.stdout ?? ""}${err.stderr ?? ""}`;
  }
}

const STORAGE = `declare function getObject(k: string): Promise<{ bytes: Uint8Array; mime: string }>;\n`;

describe("REQ-GEN-033: the static gate rejects the three hazards that already shipped", () => {
  it("duplicate key in a config literal is rejected (TS1117)", () => {
    // Regression: `config.project` was declared twice, the later literal won, and every threshold
    // under the first one silently read `undefined`.
    const out = compile(
      `export const config = { project: { maxShots: 10 }, gen: { retries: 3 }, project: { maxShots: 20 } };`,
      "dupe"
    );
    expect(out).toMatch(/TS1117/);
  });

  it("...and the same config WITHOUT the duplicate compiles (positive control)", () => {
    expect(
      compile(`export const config = { project: { maxShots: 10 }, gen: { retries: 3 } };`, "dupe-ok")
    ).toBe("");
  });

  it("the whole { bytes, mime } cannot be assigned where bytes are meant (TS2740)", () => {
    const out = compile(
      `${STORAGE}export async function f() { const o = await getObject("k"); const b: Uint8Array = o; return b; }`,
      "assign"
    );
    expect(out).toMatch(/TS2740/);
  });

  it("the whole { bytes, mime } cannot be passed to Buffer.from (TS2769)", () => {
    // Regression: ffmpeg received the object instead of `o.bytes` and silently produced nothing —
    // no crash, no error, just an empty output file.
    const out = compile(
      `${STORAGE}export async function f() { const o = await getObject("k"); return Buffer.from(o); }`,
      "bufferfrom"
    );
    expect(out).toMatch(/TS2769/);
  });

  it("...and `.bytes` compiles (positive control — proves the fixture is otherwise valid)", () => {
    expect(
      compile(
        `${STORAGE}export async function f() { const o = await getObject("k"); return Buffer.from(o.bytes); }`,
        "bufferfrom-ok"
      )
    ).toBe("");
  });
});
