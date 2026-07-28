import { eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb } from "@avd/shared/db";
import { organization } from "@avd/plt/schema";
import { project } from "@avd/prj/schema";
import { asset } from "@avd/ast/schema";
import { generation } from "@avd/gen/schema";
import { migrate } from "@avd/shared/migrate";
import { draftScript, proposeShotPlan } from "../src/service";
import { musicBrief, scriptVersion, shotPlanProposal } from "../src/schema";

// REQ-STB-032 / ADR-013 — the gate in the SERVICE, not only in the pure predicate.
//
// `music-led-planning.spec.ts` proves `musicLedPlanBlocker` decides correctly. This proves
// `proposeShotPlan` actually asks it. That distinction is not academic here: REQ-STB-057 hid a
// paid control in the UI and left the service open, and 5 of 10 shots on the user's own project
// bought frames that were thrown away. A refusal that lives only in a pure function is guidance;
// the service is the guarantee.
describe("REQ-STB-032: a music-led project cannot plan shots before its track is real", () => {
  const { db, client } = createDb();
  const orgId = uuidv7();
  const musicLed = uuidv7();
  const brandFilm = uuidv7();
  const trackId = uuidv7();

  const plan = (projectId: string) => proposeShotPlan(db, { projectId, principal: "user:test" });

  beforeAll(async () => {
    process.env.MOCK_GEN = "1";
    await migrate();
    await db.insert(organization).values({ id: orgId, name: "MusicLed Org" });
    // `lyric-video` carries defaults.audioMode "music" — the song is the fixed artifact (ADR-013).
    await db.insert(project).values({
      id: musicLed, organizationId: orgId, title: "Neon Rivers", aspectRatio: "16:9",
      targetDurationS: "60", archetype: "lyric-video", brief: { idea: "a lyric video" },
    });
    // A brand film beds music under narration — its pictures lead, so planning stays ungated.
    await db.insert(project).values({
      id: brandFilm, organizationId: orgId, title: "Brand film", aspectRatio: "16:9",
      targetDurationS: "30", archetype: "product-hero", brief: { idea: "a brand film" },
    });
    await db.insert(asset).values({
      id: trackId, organizationId: orgId, kind: "audio", source: "generated",
      status: "ready", storageKey: "t/track.mp3", mime: "audio/mpeg", bytes: 10,
    });
    for (const id of [musicLed, brandFilm]) {
      await draftScript(db, { projectId: id, principal: "user:test" });
      // MOCK_GEN leaves the script queued; the plan gate runs before the script check either way,
      // so seed a version directly rather than driving the whole generation loop.
      await db.insert(scriptVersion).values({
        id: uuidv7(), projectId: id, version: 1, content: "A song plays.",
      });
    }
  });

  afterAll(async () => {
    for (const id of [musicLed, brandFilm]) {
      await db.delete(shotPlanProposal).where(eq(shotPlanProposal.projectId, id));
      await db.delete(generation).where(eq(generation.projectId, id));
      await db.delete(scriptVersion).where(eq(scriptVersion.projectId, id));
      await db.delete(musicBrief).where(eq(musicBrief.projectId, id));
      await db.delete(project).where(eq(project.id, id));
    }
    await db.delete(asset).where(eq(asset.id, trackId));
    await db.delete(organization).where(eq(organization.id, orgId));
    await client.end();
  });

  it("refuses with no track at all, and names the way out", async () => {
    await expect(plan(musicLed)).rejects.toThrow(/track/i);
    await expect(plan(musicLed)).rejects.toThrow(/generate or attach/i);
  });

  it("refuses when the track exists but has not been transcribed", async () => {
    await db.insert(musicBrief).values({
      id: uuidv7(), projectId: musicLed, prompt: "a song", activeTrackAssetId: trackId,
    });
    await expect(plan(musicLed)).rejects.toThrow(/transcri/i);
  });

  it("plans once the track is transcribed — and the stamps reach the model", async () => {
    await db.update(musicBrief)
      .set({ transcript: "[00:00] intro\n[00:23] verse one\n[00:47] chorus" })
      .where(eq(musicBrief.projectId, musicLed));

    const genId = await plan(musicLed);
    const [row] = await db.select().from(generation).where(eq(generation.id, genId));
    const prompt = (row!.promptSnapshot as { prompt: string }).prompt;
    // ADR-013: the point of the gate is that the plan is made AGAINST the track.
    expect(prompt).toContain("[00:23]");
    expect(prompt).toMatch(/align shot boundaries/i);
  });

  it("never gates a project that is not music-led — the old order still applies", async () => {
    // No music brief, no track, no transcript: a brand film plans exactly as before.
    await expect(plan(brandFilm)).resolves.toBeTypeOf("string");
  });
});
