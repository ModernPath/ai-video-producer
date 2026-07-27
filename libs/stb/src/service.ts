// REQ-STB-059 — barrel. The aggregates live in their own modules; this file exists so the 26 specs
// and `apps/web` that import "@avd/stb" / "../src/service" keep working unchanged (acceptance
// criterion 1). It re-exports exactly the public surface — the helpers in ./common stay internal.
export { StbValidationError } from "./common";
export type { DirectionJson } from "./common";
export * from "./shots";
export * from "./frames";
export * from "./takes";
export * from "./plan";
export * from "./script";
export * from "./music";
export * from "./portraits";
export * from "./continuity";
export * from "./materialize";
