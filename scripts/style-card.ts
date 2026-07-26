// EPIC-STB-001 — try a director brief from the command line, before the UI exists.
//
//   pnpm style "1-minute feature film of ModernPath AI directed by Aki Kaurismäki, a bit humoristic"
//   pnpm style --plan "a 30s product launch for a coffee grinder, shot like a nature documentary"
//   pnpm style --seed cinematic-mood        # inspect a built-in card without calling the API
//
// --plan additionally drafts a shot plan from the card and runs the director's pass over it. No
// image or video generation is billed by any of this: compile and plan are text calls, and the
// grade is pure local code.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { StyleCard } from "../libs/shared/src/contracts/style-card";

// tsx compiles this to CJS, so: no top-level await, no import.meta. pnpm runs from the repo root.
for (const line of readFileSync(join(process.cwd(), ".env"), "utf8").split("\n")) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m && !process.env[m[1]!]) process.env[m[1]!] = m[2]!;
}

const argv = process.argv.slice(2);
const wantPlan = argv.includes("--plan");
const seedIdx = argv.indexOf("--seed");
// seedIdx is -1 when --seed is absent, and argv[-1 + 1] is the brief itself — so only skip the
// seed VALUE when the flag is actually present, or the brief filters itself out.
const seedValue = seedIdx >= 0 ? argv[seedIdx + 1] : undefined;
const brief = argv.filter((a, i) => a !== "--plan" && a !== "--seed" && !(seedValue !== undefined && i === seedIdx + 1)).join(" ").trim();

// Relative imports, deliberately: adding the workspace packages to the ROOT package.json made
// vitest resolve them twice and pushed suite collection from 30s to 131s. A dev script is not
// worth that.
import { containsReference, compileStyleCard } from "../libs/gen/src/style-compiler";
import { styleCards } from "../libs/shared/src/config/style-cards";
import {
  toDirectingBlock, toGrammarConstraints, toMusicBias, toPlanBias, toVisualStyle,
} from "../libs/shared/src/contracts/style-card";

const rule = (t: string) => console.log(`\n\x1b[2m──── ${t} ${"─".repeat(Math.max(0, 66 - t.length))}\x1b[0m`);

async function main(): Promise<void> {
if (seedIdx >= 0) {
  const key = argv[seedIdx + 1] ?? "";
  const seed = styleCards[key];
  if (!seed) {
    console.error(`Unknown seed "${key}". Available: ${Object.keys(styleCards).join(", ")}`);
    process.exit(1);
  }
  show(seed);
  return;
}

if (!brief) {
  console.error('Usage: pnpm style [--plan] "<your director brief>"   |   pnpm style --seed <key>');
  console.error(`Seeds: ${Object.keys(styleCards).join(", ")}`);
  process.exit(1);
}

process.env.MOCK_GEN = "0";
console.log(`\x1b[2mcompiling (grounded web search, ~$0.002)…\x1b[0m`);
const card = await compileStyleCard(brief);
show(card);

if (wantPlan) {
  const { assembleShotPlanPrompt } = await import("../libs/gen/src/prompt");
  const { createGeminiProvider } = await import("../libs/gen/src/provider");
  const { normalizePlannedShots } = await import("../libs/stb/src/plan-normalize");
  const { reviewPlan, summarizeNotes } = await import("../libs/stb/src/director-pass");
  const { modelRoutes } = await import("../libs/shared/src/config/models");

  rule("DRAFTING A SHOT PLAN FROM THE CARD");
  // the project's own provider, not the raw SDK — same routing and error handling as production
  const res = await createGeminiProvider().generateText({
    model: modelRoutes.script,
    prompt: assembleShotPlanPrompt({
      projectTitle: brief.slice(0, 60), brief: { intent: brief }, targetDurationSeconds: 60,
      scriptText: brief, directing: toDirectingBlock(card), planBias: toPlanBias(card),
    } as never),
  });
  const raw = (res.text ?? "").trim().replace(/^```(?:json)?/i, "").replace(/```$/, "");
  const shots = normalizePlannedShots(JSON.parse(raw));
  for (const s of shots) {
    console.log(`  ${String(s.durationS).padStart(2)}s  ${s.grammar.shotSize.padEnd(4)} ${s.grammar.angle.padEnd(8)} ${s.grammar.movement.padEnd(9)} ${s.title}`);
  }
  rule("DIRECTOR'S PASS");
  const notes = reviewPlan(shots, card);
  console.log(`  ${summarizeNotes(notes)}`);
  for (const n of notes) console.log(`  [${n.severity}] ${n.rule}: ${n.note}`);
}

}

main().catch((e: unknown) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });

function show(card: StyleCard): void {
  rule("STYLE CARD");
  console.log(`  name       ${card.name}`);
  if (card.provenance.references.length) console.log(`  references ${card.provenance.references.join(" · ")}  \x1b[2m(display only — never sent to a model)\x1b[0m`);
  console.log(`  arc        ${card.structure.arc}`);
  console.log(`  camera     ${card.camera.allowedMovements.join(", ")} · ${card.camera.preferredSizes.join("/")} · ${card.camera.angles.join("/")}`);
  console.log(`  pacing     ${card.pacing.durationWindowS.join("–")}s per shot${card.structure.shotCountHint ? ` · ${card.structure.shotCountHint.join("–")} shots` : ""}`);
  console.log(`  palette    ${card.palette.accent} on ${card.palette.background}`);
  console.log(`  humour     ${card.humour}`);
  console.log(`  refuses    ${card.antiNotes.join("\n             ")}`);
  rule("VISUAL STYLE — appended to every frame/take prompt");
  console.log("  " + toVisualStyle(card));
  rule("DIRECTING BLOCK — script + shot-plan prompts");
  console.log(toDirectingBlock(card).split("\n").map((l) => "  " + l).join("\n"));
  rule("PLAN BIAS — shot-plan prompt only");
  console.log(toPlanBias(card).split("\n").map((l) => "  " + l).join("\n"));
  rule("MUSIC BIAS · GRADER CONSTRAINTS");
  console.log("  " + toMusicBias(card));
  console.log("  " + JSON.stringify(toGrammarConstraints(card)));
  // same rule as the scrubber, via containsReference — a looser check here would cry wolf on
  // ordinary words ("earth tones" for a "Planet Earth" reference)
  const blocks = [toVisualStyle(card), toDirectingBlock(card), toPlanBias(card), toMusicBias(card)];
  const leak = card.provenance.references.filter((r) => blocks.some((b) => containsReference(b, [r])));
  rule("NAME-EXCLUSION CHECK (SCN-DIR-002)");
  console.log(leak.length ? `  *** LEAKED: ${leak.join(", ")} ***` : "  clean — no reference name in any prompt block");
}
