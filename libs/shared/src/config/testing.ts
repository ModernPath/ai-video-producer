// REQ-GEN-033 — the sanctioned way for a test to bend config, and the only one.
//
// `config` is deeply readonly on purpose (CLAUDE.md §1.4: values come from versioned config, and
// production code must not reach in and change them). Route- and quota-dependent specs legitimately
// need a different value for one test, and were assigning straight through — 13 of the errors that
// kept `pnpm typecheck` red were exactly that, in specs that otherwise save and restore correctly.
//
// Exposing a mutable VIEW keeps the production type immutable while making the test intent
// greppable: every deliberate override reads `configForTest.`, and anything else assigning to
// config is still a type error.
//
// Restore what you change. `configForTest` is the same object as `config`, not a copy, so a
// mutation without an `afterEach` leaks into every later spec in the file — and, under a shared
// worker, into specs that never asked for it.
import { config } from "./limits";

// Arrays keep their exact readonly element type: only the property SLOT becomes writable, so a
// test can swap a whole list but not mutate one in place. Widening tuples here made the cast
// itself a type error (`readonly ["image/png", …]` vs `("image/png" | …)[]`).
type Mutable<T> = {
  -readonly [K in keyof T]: T[K] extends readonly unknown[]
    ? T[K]
    : T[K] extends object
      ? Mutable<T[K]>
      : T[K];
};

/** The live `config`, typed mutable. Test-only — never import this from `src/`. */
export const configForTest = config as Mutable<typeof config>;
