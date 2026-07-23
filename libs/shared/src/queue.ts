// REQ-GEN-016 / ADR-002 — pg-boss on Postgres; no separate broker.
import PgBoss from "pg-boss";

export const GEN_QUEUE = "gen-execute";
export const EXPORT_QUEUE = "asm-export";

export interface GenJob {
  generationId: string;
}
export interface ExportJob {
  exportJobId: string;
}

let boss: PgBoss | undefined;

export async function createBoss(url = process.env.DATABASE_URL ?? "postgres://avd:avd@localhost:54329/avd"): Promise<PgBoss> {
  if (boss) return boss;
  boss = new PgBoss({ connectionString: url });
  boss.on("error", (err) => console.error("[pg-boss]", err));
  await boss.start();
  for (const q of [GEN_QUEUE, EXPORT_QUEUE]) {
    await boss.createQueue(q).catch(() => {}); // exists already
  }
  return boss;
}

export function queueMode(): "inline" | "queue" {
  return process.env.WORKER_MODE === "queue" ? "queue" : "inline";
}
