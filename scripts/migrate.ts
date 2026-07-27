/** CLI wrapper — the migrator itself lives in `@avd/shared/migrate` (REQ-GEN-033). */
import { migrate } from "../libs/shared/src/migrate";

export { migrate };

if (process.argv[1]?.endsWith("migrate.ts")) {
  // no top-level await: tsx transpiles to CJS when cwd lacks "type": "module"
  migrate().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
