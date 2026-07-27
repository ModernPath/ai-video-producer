// REQ-STB-047 — compare each shot's stored prompts against the plan that produced them.
//
//   pnpm audit:prompts <projectId>            # report drift
//   pnpm audit:prompts <projectId> --restore  # put the planned prompts back
//
// Before REQ-STB-045 the stage reused one shot's prompt boxes for another, so pressing Save could
// write the WRONG shot's text — silently, and then generate paid media from it. That is fixed, but
// the damage it already did is invisible by inspection: a prompt that belongs to another shot still
// looks like a perfectly good prompt. This finds them, because the planner's original text survives
// in `shot_plan_proposal` long after the shot row was overwritten.
//
// Drift is not always corruption — deliberate edits show up here too, which is why --restore is
// opt-in and every change is printed before it is made.
import { readFileSync } from "node:fs";
import { join } from "node:path";

for (const line of readFileSync(join(process.cwd(), ".env"), "utf8").split("\n")) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m && !process.env[m[1]!]) process.env[m[1]!] = m[2]!;
}

const projectId = process.argv.slice(2).find((a) => !a.startsWith("--"));
const restore = process.argv.includes("--restore");

async function main(): Promise<void> {
  if (!projectId) {
    console.error("Usage: pnpm audit:prompts <projectId> [--restore]");
    process.exit(1);
  }
  const { createDb } = await import("../libs/shared/src/db");
  const { updateShotScripts } = await import("../libs/stb/src/service");
  const { db, client } = createDb();
  try {
    const shots = await client`
      select id, "position", title, image_prompt, video_prompt from stb.shot
      where project_id = ${projectId} and deleted_at is null order by "position"`;
    const proposals = await client`
      select changes from stb.shot_plan_proposal where project_id = ${projectId} order by created_at desc`;

    // Newest proposal wins per title — that is the plan the shot was last built from.
    const planned = new Map<string, { imagePrompt?: string; videoPrompt?: string }>();
    for (const p of proposals) {
      const rows = Array.isArray(p.changes) ? p.changes : ((p.changes as { shots?: unknown[] }).shots ?? []);
      for (const s of rows as Array<Record<string, string>>) {
        if (s.title && !planned.has(s.title)) planned.set(s.title, { imagePrompt: s.imagePrompt, videoPrompt: s.videoPrompt });
      }
    }

    let drifted = 0;
    for (const s of shots) {
      const want = planned.get(s.title as string);
      if (!want?.imagePrompt) continue; // hand-added shot, or a plan that predates prompt authoring
      const imageDiffers = s.image_prompt !== want.imagePrompt;
      const videoDiffers = s.video_prompt !== want.videoPrompt;
      if (!imageDiffers && !videoDiffers) continue;

      drifted++;
      console.log(`\n\x1b[33m✗ ${s.position}. ${s.title}\x1b[0m`);
      if (imageDiffers) {
        console.log(`  stored IMAGE: ${String(s.image_prompt ?? "").slice(0, 90)}`);
        console.log(`  planned IMAGE: ${want.imagePrompt.slice(0, 90)}`);
      }
      if (videoDiffers) {
        console.log(`  stored VIDEO: ${String(s.video_prompt ?? "").slice(0, 90)}`);
        console.log(`  planned VIDEO: ${(want.videoPrompt ?? "").slice(0, 90)}`);
      }
      // A stored prompt that is character-identical to ANOTHER shot's is the fingerprint of the
      // stale-textarea bug, not of an edit someone meant to make.
      const twin = shots.find((o) => o.id !== s.id && o.image_prompt && o.image_prompt === s.image_prompt);
      if (twin) console.log(`  \x1b[31m→ identical to shot ${twin.position} (${twin.title}) — almost certainly a mis-saved prompt\x1b[0m`);

      if (restore) {
        await updateShotScripts(db, {
          shotId: s.id as string,
          imagePrompt: want.imagePrompt,
          videoPrompt: want.videoPrompt ?? null,
        });
        console.log("  \x1b[32m→ restored from the plan\x1b[0m");
      }
    }

    console.log(`\n${shots.length} shots · ${drifted} differ from the plan that produced them${
      drifted && !restore ? " — re-run with --restore to put the planned text back" : ""}`);
  } finally {
    await client.end();
  }
}

main().catch((e: unknown) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
