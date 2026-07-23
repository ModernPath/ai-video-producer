import { readFileSync } from "node:fs";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb } from "@avd/shared/db";
import { modelRoutes } from "@avd/shared/config";
import { organization } from "@avd/plt/schema";
import { project } from "@avd/prj/schema";
import { asset } from "@avd/ast/schema";
import { getObject } from "@avd/ast/storage";
import { generation } from "../src/schema";
import { enqueueGeneration } from "../src/service";
import { runNextGeneration } from "../src/executor";
import { createGeminiProvider } from "../src/provider";
import { migrate } from "../../../scripts/migrate";

// Real-API E2E ring (Definition of Done §9.8). Opt-in: RUN_REAL_API=1, key from root .env.
// Budget per run: ≈ $0.04 (one draft image + one short text) — keep it that way.
function loadRootEnv(): void {
  try {
    const env = readFileSync(join(import.meta.dirname, "..", "..", "..", ".env"), "utf8");
    for (const line of env.split("\n")) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m && m[1] && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {
    /* no .env — skip guard below handles it */
  }
}
loadRootEnv();

const enabled = process.env.RUN_REAL_API === "1" && !!process.env.GEMINI_API_KEY;

describe.skipIf(!enabled)("REAL API e2e: gemini text + draft image (≈$0.04/run)", () => {
  const { db, client } = createDb();
  const orgId = uuidv7();
  const projectId = uuidv7();

  beforeAll(async () => {
    await migrate();
    await db.insert(organization).values({ id: orgId, name: "Real E2E Org" });
    await db.insert(project).values({
      id: projectId, organizationId: orgId, title: "Real E2E", aspectRatio: "16:9", targetDurationS: "10",
    });
  }, 30_000);
  afterAll(async () => {
    await db.delete(asset).where(eq(asset.organizationId, orgId));
    await db.delete(generation).where(eq(generation.organizationId, orgId));
    await db.delete(project).where(eq(project.id, projectId));
    await db.delete(organization).where(eq(organization.id, orgId));
    await client.end();
  });

  it("real text: script model returns non-empty content", async () => {
    const provider = createGeminiProvider();
    const res = await provider.generateText({
      model: modelRoutes.script,
      prompt: "Write one short cinematic tagline (max 12 words) for a coffee brand dawn video.",
    });
    expect((res.text ?? "").length).toBeGreaterThan(4);
  }, 60_000);

  it("real image: draft frame flows through the full pipeline with billed cost", async () => {
    const genId = await enqueueGeneration(db, {
      organizationId: orgId, projectId, principal: "user:e2e", kind: "frame",
      commandId: uuidv7(), target: { shotId: uuidv7() }, quality: "draft",
      promptInput: {
        aspectRatio: "16:9", durationSeconds: 6, entities: [],
        direction: { synopsis: "sunrise over a harbor, cinematic", subject: "harbor skyline", action: "still establishing shot" },
      },
    });
    const result = await runNextGeneration(db, { organizationId: orgId, provider: createGeminiProvider() });
    expect(result?.status).toBe("succeeded");
    const [g] = await db.select().from(generation).where(eq(generation.id, genId));
    expect(Number(g!.costUsd)).toBeGreaterThan(0); // billed, from price table
    const [a] = await db.select().from(asset).where(eq(asset.id, g!.outputAssetIds![0]!));
    expect(a?.status).toBe("ready");
    const obj = await getObject(a!.storageKey);
    expect(obj.bytes.byteLength).toBeGreaterThan(5_000); // a real image, not a stub
  }, 120_000);

  it("real image edit: instruction produces a new asset with edit_of lineage (REQ-GEN-012)", async () => {
    const [srcGen] = await db.select().from(generation)
      .where(eq(generation.organizationId, orgId));
    const sourceAssetId = srcGen?.outputAssetIds?.[0];
    if (!sourceAssetId) throw new Error("prior image test must run first");
    const genId = await enqueueGeneration(db, {
      organizationId: orgId, projectId, principal: "user:e2e", kind: "image_edit",
      commandId: uuidv7(), target: { assetId: sourceAssetId }, quality: "draft",
      refs: { editSourceAssetId: sourceAssetId },
      editInput: { instruction: "make it night time with neon reflections on the water", aspectRatio: "16:9" },
    });
    const result = await runNextGeneration(db, { organizationId: orgId, provider: createGeminiProvider() });
    const [g] = await db.select().from(generation).where(eq(generation.id, genId));
    if (result?.status !== "succeeded") throw new Error(`edit failed: ${g?.errorCode} ${g?.errorDetail}`);
    const [edited] = await db.select().from(asset).where(eq(asset.id, g!.outputAssetIds![0]!));
    expect(edited?.editOf).toBe(sourceAssetId);
    const obj = await getObject(edited!.storageKey);
    expect(obj.bytes.byteLength).toBeGreaterThan(5_000);
  }, 120_000);
});

// Omni video spike + real take E2E — extra gate: RUN_REAL_VIDEO=1 (≈$0.40/run at 4s).
const videoEnabled = enabled && process.env.RUN_REAL_VIDEO === "1";

describe.skipIf(!videoEnabled)("REAL API e2e: omni take (≈$0.40/run, 4s)", () => {
  const { db, client } = createDb();
  const orgId = uuidv7();
  const projectId = uuidv7();

  beforeAll(async () => {
    await migrate();
    await db.insert(organization).values({ id: orgId, name: "Real Video Org" });
    await db.insert(project).values({
      id: projectId, organizationId: orgId, title: "Real Video E2E", aspectRatio: "16:9", targetDurationS: "10",
    });
  }, 30_000);
  afterAll(async () => {
    await db.delete(asset).where(eq(asset.organizationId, orgId));
    await db.delete(generation).where(eq(generation.organizationId, orgId));
    await db.delete(project).where(eq(project.id, projectId));
    await db.delete(organization).where(eq(organization.id, orgId));
    await client.end();
  });

  it("real chain: draft frame -> frame-conditioned 4s take (REQ-GEN-009)", async () => {
    // 1) real draft frame
    const frameGenId = await enqueueGeneration(db, {
      organizationId: orgId, projectId, principal: "user:e2e", kind: "frame",
      commandId: uuidv7(), target: { shotId: uuidv7() }, quality: "draft",
      promptInput: {
        aspectRatio: "16:9", durationSeconds: 4, entities: [],
        direction: { synopsis: "steam rising from a coffee cup at dawn", subject: "coffee cup", action: "still" },
      },
    });
    await runNextGeneration(db, { organizationId: orgId, provider: createGeminiProvider() });
    const [fg] = await db.select().from(generation).where(eq(generation.id, frameGenId));
    const frameAssetId = fg!.outputAssetIds![0]!;

    // 2) take conditioned on it
    const genId = await enqueueGeneration(db, {
      organizationId: orgId, projectId, principal: "user:e2e", kind: "take",
      commandId: uuidv7(), target: { shotId: uuidv7() },
      refs: { startFrameAssetId: frameAssetId },
      promptInput: {
        aspectRatio: "16:9", durationSeconds: 4, entities: [],
        direction: {
          synopsis: "steam rising from a coffee cup at dawn, cinematic macro",
          subject: "coffee cup on a wooden table",
          action: "slow push-in, steam curling in golden light",
          mood: "warm dawn glow",
        },
      },
    });
    const result = await runNextGeneration(db, { organizationId: orgId, provider: createGeminiProvider() });
    const [g] = await db.select().from(generation).where(eq(generation.id, genId));
    if (result?.status !== "succeeded") throw new Error(`spike failed: ${g?.errorCode} ${g?.errorDetail}`);
    expect(Number(g!.costUsd)).toBeCloseTo(0.6, 2); // 4s x $0.15 veo fast
    const [a] = await db.select().from(asset).where(eq(asset.id, g!.outputAssetIds![0]!));
    expect(a?.status).toBe("ready");
    expect(a?.mime).toContain("video");
    const obj = await getObject(a!.storageKey);
    expect(Buffer.from(obj.bytes.slice(4, 8)).toString("ascii")).toBe("ftyp");
    const snap = g!.promptSnapshot as { refAssetIds?: string[] };
    expect(snap.refAssetIds?.length).toBe(1); // frame ref recorded (REQ-GEN-009)
    console.log(`[spike] real frame-conditioned take: ${obj.bytes.byteLength} bytes, cost $${g!.costUsd}`);
  }, 360_000);
});
