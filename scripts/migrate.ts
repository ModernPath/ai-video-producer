/** CLI wrapper — the migrator itself lives in `@avd/shared/migrate` (REQ-GEN-033). */
// Explicit `.ts`: `pnpm migrate` runs this under `node --experimental-strip-types`, whose ESM
// resolver does not add extensions. Without it the CLI has always thrown ERR_MODULE_NOT_FOUND —
// unnoticed because the test suites import `@avd/shared/migrate` directly and never through here.
// Found 2026-07-28 when the deployed container ran `pnpm migrate` on boot (REQ-PLT-004).
import { migrate } from "../libs/shared/src/migrate.ts";

export { migrate };

if (process.argv[1]?.endsWith("migrate.ts")) {
  // no top-level await: tsx transpiles to CJS when cwd lacks "type": "module"
  migrate().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
