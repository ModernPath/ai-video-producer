import { and, eq, isNull } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb } from "@avd/shared/db";
import { organization } from "@avd/plt/schema";
import { project } from "@avd/prj/schema";
import { generation } from "@avd/gen/schema";
import { asset } from "@avd/ast/schema";
import { createShot, handoffTailFrame, requestFrame, requestFrameBatch, requestTake, setShotContinuity } from "../src/service";
import { frameCandidate, shot, take } from "../src/schema";

// USER 2026-07-27: "the clothing and positions of persons sitting are changing… store the last
// frame of video as reference starting image for next clip? They should be considered as sub-clips
// for the main clip, so we can see the dependency and continue as the video for first is generated."
//
// A description cannot hold a pose. Two shots of the same continuous moment need the actual last
// frame of the first as the start frame of the second — which the take pipeline already supports
// (REQ-GEN-009); what was missing was producing that frame and linking the shots.
const { db } = createDb();
const orgId = uuidv7();
const projectId = uuidv7();
const dir = { synopsis: "s", subject: "Pasi", action: "sits" };
let a = "", b = "", c = "";

beforeAll(async () => {
  process.env.MOCK_GEN = "1";
  await db.insert(organization).values({ id: orgId, name: "Continuity Org" });
  await db.insert(project).values({
    id: projectId, organizationId: orgId, title: "Continuity", aspectRatio: "16:9", targetDurationS: "30",
  });
  a = await createShot(db, { organizationId: orgId, projectId, title: "Coffee Gesture", direction: dir, durationS: 6 });
  b = await createShot(db, { organizationId: orgId, projectId, title: "Coffee Mug Lift", direction: dir, durationS: 6 });
  c = await createShot(db, { organizationId: orgId, projectId, title: "Elsewhere", direction: dir, durationS: 6 });
});

afterAll(async () => {
  await db.delete(take).where(eq(take.shotId, a));
  await db.delete(frameCandidate).where(eq(frameCandidate.shotId, b));
  await db.update(shot).set({ continuesFromShotId: null }).where(eq(shot.projectId, projectId));
  await db.delete(shot).where(eq(shot.projectId, projectId));
  await db.delete(generation).where(eq(generation.projectId, projectId));
  await db.delete(asset).where(eq(asset.organizationId, orgId));
  await db.delete(project).where(eq(project.id, projectId));
  await db.delete(organization).where(eq(organization.id, orgId));
});

const shotRow = async (id: string) => (await db.select().from(shot).where(eq(shot.id, id)))[0]!;

describe("REQ-STB-054: a shot can continue another", () => {
  it("records the dependency", async () => {
    await setShotContinuity(db, { shotId: b, continuesFromShotId: a });
    expect((await shotRow(b)).continuesFromShotId).toBe(a);
  });

  it("clears it again", async () => {
    await setShotContinuity(db, { shotId: b, continuesFromShotId: null });
    expect((await shotRow(b)).continuesFromShotId).toBeNull();
    await setShotContinuity(db, { shotId: b, continuesFromShotId: a });
  });

  it("refuses to let a shot continue itself", async () => {
    await expect(setShotContinuity(db, { shotId: b, continuesFromShotId: b })).rejects.toThrow(/itself/i);
  });

  it("refuses a cycle — A continues B while B continues A", async () => {
    await expect(setShotContinuity(db, { shotId: a, continuesFromShotId: b })).rejects.toThrow(/circular|cycle/i);
  });

  it("refuses to continue a shot in another project", async () => {
    const other = uuidv7();
    await db.insert(project).values({ id: other, organizationId: orgId, title: "Other", aspectRatio: "16:9", targetDurationS: "30" });
    const far = await createShot(db, { organizationId: orgId, projectId: other, title: "Far", direction: dir, durationS: 6 });
    await expect(setShotContinuity(db, { shotId: b, continuesFromShotId: far })).rejects.toThrow(/same project/i);
    await db.delete(shot).where(eq(shot.projectId, other));
    await db.delete(project).where(eq(project.id, other));
  });
});

describe("REQ-STB-054: the tail frame hands off to the next shot", () => {
  let videoAssetId = "";

  beforeAll(async () => {
    // A REAL two-colour clip in storage: the handoff reads the object, so a row pointing at a key
    // with nothing behind it would only prove that missing bytes degrade quietly (they do — see
    // "does nothing when the source shot has no selected take").
    const { execFile } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const { mkdtemp, readFile } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const exec = promisify(execFile);
    const tmp = await mkdtemp(join(tmpdir(), "avd-cont-"));
    await exec("docker", [
      "run", "--rm", "-v", `${tmp}:/work`, "jrottenberg/ffmpeg:6.1-alpine",
      "-f", "lavfi", "-i", "color=c=black:s=64x64:d=1",
      "-f", "lavfi", "-i", "color=c=red:s=64x64:d=1",
      "-filter_complex", "[0:v][1:v]concat=n=2:v=1:a=0[v]", "-map", "[v]",
      "-pix_fmt", "yuv420p", "-y", "/work/clip.mp4",
    ]);
    // `uploadBytesDirect` accepts image/audio only — a take's video asset is written by the
    // executor, so the fixture writes the object and the row the same way.
    const { putObject } = await import("@avd/ast/storage");
    videoAssetId = uuidv7();
    const key = `test/${videoAssetId}.mp4`;
    await putObject(key, new Uint8Array(await readFile(join(tmp, "clip.mp4"))), "video/mp4");
    await db.insert(asset).values({
      id: videoAssetId, organizationId: orgId, kind: "video", source: "generated", status: "ready",
      storageKey: key, mime: "video/mp4",
    });
    const genId = uuidv7();
    await db.insert(generation).values({
      id: genId, organizationId: orgId, projectId, kind: "take", target: { shotId: a },
      modelId: "test-model", promptSnapshot: { prompt: "p", templateVersion: 1, refAssetIds: [] },
      params: {}, status: "succeeded", commandId: uuidv7(), principal: "user:test",
    });
    const takeId = uuidv7();
    await db.insert(take).values({ id: takeId, shotId: a, videoAssetId, generationId: genId });
    await db.update(shot).set({ selectedTakeId: takeId }).where(eq(shot.id, a));
  });

  it("gives the continuing shot a start frame taken from the previous take", async () => {
    const made = await handoffTailFrame(db, { shotId: a });
    expect(made).toContain(b);
    const row = await shotRow(b);
    expect(row.selectedStartFrameId).not.toBeNull();
    const [fc] = await db.select().from(frameCandidate)
      .where(and(eq(frameCandidate.shotId, b), isNull(frameCandidate.deletedAt)));
    expect(fc).toBeDefined();
  }, 120_000);

  it("does not touch a shot that continues nothing", async () => {
    expect((await shotRow(c)).selectedStartFrameId).toBeNull();
  });

  it("is idempotent — running the handoff twice does not stack frames", async () => {
    await handoffTailFrame(db, { shotId: a });
    const frames = await db.select().from(frameCandidate)
      .where(and(eq(frameCandidate.shotId, b), isNull(frameCandidate.deletedAt)));
    expect(frames.length).toBe(1);
  }, 120_000);

  it("does nothing when the source shot has no selected take", async () => {
    expect(await handoffTailFrame(db, { shotId: c })).toEqual([]);
  });

  // Found live: linking two shots that ALREADY had start frames did nothing visible, because the
  // idempotence guard skipped them. Automatic handoff must not clobber a frame the user chose, but
  // an explicit "continue that shot" is a request to replace it — that IS the point of the click.
  it("replaces an existing start frame when the handoff is explicitly asked for", async () => {
    const before = (await shotRow(b)).selectedStartFrameId;
    expect(before).not.toBeNull();
    const done = await handoffTailFrame(db, { shotId: a, force: true });
    expect(done).toContain(b);
    expect((await shotRow(b)).selectedStartFrameId).not.toBe(before);
  }, 120_000);

  it("retires the frame it replaced rather than leaving two selectable", async () => {
    const frames = await db.select().from(frameCandidate)
      .where(and(eq(frameCandidate.shotId, b), isNull(frameCandidate.deletedAt)));
    expect(frames.length).toBe(1);
  });
});

// REQ-STB-055 — the refusal has to live where the money is spent, not only in the UI. A button can
// be bypassed; `requestTake` is the thing that actually costs.
describe("REQ-STB-055: a take cannot be bought out of chain order", () => {
  it("refuses a take for a shot whose source has no chosen take", async () => {
    const head = await createShot(db, { organizationId: orgId, projectId, title: "Head", direction: dir, durationS: 6 });
    const follower = await createShot(db, { organizationId: orgId, projectId, title: "Follower", direction: dir, durationS: 6 });
    await setShotContinuity(db, { shotId: follower, continuesFromShotId: head });
    await expect(requestTake(db, { shotId: follower, principal: "user:test", aspectRatio: "16:9" }))
      .rejects.toThrow(/Head/);
  });

  it("allows the head itself — it is what unblocks the rest", async () => {
    const [head] = await db.select().from(shot).where(and(eq(shot.projectId, projectId), eq(shot.title, "Head")));
    await expect(requestTake(db, { shotId: head!.id, principal: "user:test", aspectRatio: "16:9" })).resolves.toBeTruthy();
  });

  it("allows the follower once the source has a chosen take", async () => {
    const [head] = await db.select().from(shot).where(and(eq(shot.projectId, projectId), eq(shot.title, "Head")));
    const [follower] = await db.select().from(shot).where(and(eq(shot.projectId, projectId), eq(shot.title, "Follower")));
    await db.update(shot).set({ selectedTakeId: (await db.select().from(take).where(eq(take.shotId, a)))[0]!.id })
      .where(eq(shot.id, head!.id));
    await expect(requestTake(db, { shotId: follower!.id, principal: "user:test", aspectRatio: "16:9" })).resolves.toBeTruthy();
  });
});

// USER 2026-07-27: "are we still generating images for sub-scenes in the beginning when approving
// the script?" — Yes. REQ-STB-057 hid the frame controls for a sub-clip in the UI, but "Apply +
// frames" is a different path and `requestFrame` had no guard, so every sub-clip bought a start
// frame that the tail-frame handoff then discards. Five of them on the user's own project.
//
// The refusal belongs where the cost is incurred — the same rule already applied to takes
// (REQ-STB-055): a hidden button is guidance, the service is the guarantee.
describe("REQ-STB-062: a sub-clip never buys a start frame", () => {
  let head = "", sub = "";

  beforeAll(async () => {
    head = await createShot(db, { organizationId: orgId, projectId, title: "Chain head", direction: dir, durationS: 6 });
    sub = await createShot(db, { organizationId: orgId, projectId, title: "Chain sub", direction: dir, durationS: 6 });
    await setShotContinuity(db, { shotId: sub, continuesFromShotId: head });
  });

  it("refuses a single frame request for a sub-clip, naming the source", async () => {
    await expect(requestFrame(db, { shotId: sub, slot: "start", principal: "user:test", aspectRatio: "16:9" }))
      .rejects.toThrow(/Chain head/);
  });

  it("refuses the batch too — the batch is how the money actually gets spent", async () => {
    await expect(requestFrameBatch(db, { shotId: sub, slot: "start", principal: "user:test", aspectRatio: "16:9" }))
      .rejects.toThrow(/last frame|continues/i);
  });

  it("still allows the chain head", async () => {
    await expect(requestFrame(db, { shotId: head, slot: "start", principal: "user:test", aspectRatio: "16:9" }))
      .resolves.toBeTruthy();
  });

  it("allows it again once the chain is broken — the escape hatch", async () => {
    await setShotContinuity(db, { shotId: sub, continuesFromShotId: null });
    await expect(requestFrame(db, { shotId: sub, slot: "start", principal: "user:test", aspectRatio: "16:9" }))
      .resolves.toBeTruthy();
    await setShotContinuity(db, { shotId: sub, continuesFromShotId: head });
  });
});
