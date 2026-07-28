// REQ-GEN-016 / ADR-002 — pg-boss on Postgres; no separate broker.
import PgBoss from "pg-boss";

export const GEN_QUEUE = "gen-execute";
export const EXPORT_QUEUE = "asm-export";
/** REQ-STB-067 — a whole continuity chain, run shot by shot. Its own queue so a chain measured in
 *  minutes never occupies the slots that single generations need. */
export const CHAIN_QUEUE = "stb-chain";

export interface GenJob {
  generationId: string;
}
export interface ExportJob {
  exportJobId: string;
}

/** REQ-STB-067 — generate every shot of the chain containing `shotId`, in order. */
export interface ChainJob {
  shotId: string;
  principal: string;
  aspectRatio: "16:9" | "9:16";
}

let boss: PgBoss | undefined;

export async function createBoss(url = process.env.DATABASE_URL ?? "postgres://avd:avd@localhost:54329/avd"): Promise<PgBoss> {
  if (boss) return boss;
  boss = new PgBoss({ connectionString: url });
  boss.on("error", (err) => console.error("[pg-boss]", err));
  await boss.start();
  for (const q of [GEN_QUEUE, EXPORT_QUEUE, CHAIN_QUEUE]) {
    await boss.createQueue(q).catch(() => {}); // exists already
  }
  return boss;
}

export function queueMode(): "inline" | "queue" {
  return process.env.WORKER_MODE === "queue" ? "queue" : "inline";
}
