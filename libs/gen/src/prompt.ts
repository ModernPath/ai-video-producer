// REQ-GEN-013 — deterministic prompt assembly (docs/14-generation.md §5).
import { shotDurationPolicy } from "@avd/shared/config"; // REQ-STB-029: plan schema follows the video route

export const PROMPT_TEMPLATE_VERSION = 3; // v3: model prompt guidelines (USER 2026-07-23) — single-scene pin, explicit audio intent, ref preservation, inpainting formula

export interface DirectionInput {
  synopsis: string;
  subject: string;
  action: string;
  camera?: string | undefined;
  mood?: string | undefined;
  dialogue?: string | undefined;
  audioNotes?: string | undefined;
}

export interface EntityBlock {
  kind: "company" | "product" | "person" | "character";
  name: string;
  description: string;
}

export interface TakePromptInput {
  aspectRatio: "16:9" | "9:16";
  durationSeconds: number;
  stylePrompt?: string | undefined;
  entities: EntityBlock[];
  direction: DirectionInput;
  /** REQ-STB-013: user-authored script — used verbatim as the creative body. */
  customPrompt?: string | undefined;
  /** REQ-ANM: word to highlight-sweep in title templates. */
  highlightWord?: string | undefined;
  /** REQ-ANM: animation subtext (transient metadata for the renderer). */
  subtext?: string | undefined;
  /** REQ-ANM: animation template id (transient metadata; not part of the text prompt). */
  template?: string | undefined;
  /** REQ-ANM-005: plan/user-authored palette for animation renders (hex). */
  accent?: string | undefined;
  background?: string | undefined;
  /** v3: number of reference images attached to the request (drives preservation phrasing). */
  referenceImageCount?: number | undefined;
}

function sentence(text: string): string {
  const t = text.trim();
  return /[.!?]$/.test(t) ? t : `${t}.`;
}

// KAIJU Neon Nights production finding (2026-07-24): the plan authored "black claw logo" and the
// frame model drew a real competitor's mark. Branding must always be original — trademark safety.
const BRAND_SAFETY = `Use only this project's own named brands; never depict real-world third-party brand logos, marks, or trade dress.`;

/** Natural-prose video prompt (template v2). Custom text is verbatim + safety rail + format tail. */
export function assembleTakePrompt(i: TakePromptInput): string {
  if (i.customPrompt?.trim()) {
    return `${i.customPrompt.trim()}\n${BRAND_SAFETY}\n${i.aspectRatio} video, ${i.durationSeconds} seconds.`;
  }
  const d = i.direction;
  const parts: string[] = [];
  parts.push(sentence(d.synopsis));
  parts.push(sentence(`${d.subject} — ${d.action}`));
  if (d.camera) parts.push(sentence(`Camera: ${d.camera}`));
  if (d.mood) parts.push(sentence(d.mood));
  for (const e of i.entities) {
    const desc = e.description.trim().toLowerCase() === e.name.trim().toLowerCase() ? "" : `, ${e.description}`;
    parts.push(sentence(`Featuring ${e.name}${desc}`)); // skip echo descriptions ("Pasi, Pasi")
  }
  parts.push(BRAND_SAFETY); // unconditional rail — drift happened with kind "character" and no product cast
  if (i.stylePrompt) parts.push(sentence(i.stylePrompt));
  // v3 guideline: our takes are single shots — pin it so the model doesn't invent cuts.
  parts.push(`A single continuous shot, no scene cuts. No on-screen text, timestamps, or interface graphics.`);
  if (d.dialogue) parts.push(sentence(`Spoken line: "${d.dialogue}"`));
  if (d.audioNotes) parts.push(sentence(`Sound design: ${d.audioNotes}`));
  if (!d.dialogue && !d.audioNotes) parts.push(`No dialogue; natural ambient sound only.`);
  parts.push(`A cinematic ${i.aspectRatio} video clip, ${i.durationSeconds} seconds, natural motion.`);
  return parts.join(" ");
}

export interface TextPromptInput {
  projectTitle: string;
  brief: Record<string, unknown>;
  targetDurationSeconds: number;
  scriptText?: string | undefined;   // for shot_plan / revise
  instruction?: string | undefined;  // for revise
  entities?: EntityBlock[] | undefined; // REQ-STB-012: cast context for script/plan/music
  directing?: string | undefined;  // REQ-STB-026: archetype directing block (docs/87)
  planBias?: string | undefined;   // REQ-STB-026: plan-only guidance
  musicBias?: string | undefined;  // REQ-STB-026: music-only guidance
  transcript?: string | undefined; // REQ-STB-028: MM:SS track transcript for music-led planning
}

function castBlock(entities?: EntityBlock[]): string[] {
  if (!entities?.length) return [];
  return entities.map((e) => `CAST: [${e.kind}] ${e.name} — ${e.description}`);
}

export function assembleScriptPrompt(i: TextPromptInput): string {
  return [
    `TASK: Write a video script for a ${i.targetDurationSeconds}-second video titled "${i.projectTitle}".`,
    i.directing ?? "",
    `BRIEF: ${JSON.stringify(i.brief)}`,
    ...castBlock(i.entities),
    i.entities?.length ? `Feature the cast naturally where it strengthens the story.` : "",
    i.instruction ? `INSTRUCTION: ${i.instruction}` : "",
    i.scriptText ? `CURRENT SCRIPT:\n${i.scriptText}` : "",
  ].filter(Boolean).join("\n");
}

export function assembleShotPlanPrompt(i: TextPromptInput): string {
  return [
    `TASK: Break the script into 4–10 second shots (structured output) totaling ≈${i.targetDurationSeconds}s.`,
    i.directing ?? "",
    i.planBias ?? "",
    i.transcript
      ? `TRANSCRIPT of the attached track (align shot boundaries to these [MM:SS] sections; where the direction calls for animation shots, put the matching lyric lines into their text):\n${i.transcript}`
      : "",
    `Return ONLY a JSON object exactly shaped: {"shots":[{"title":string,"durationS":${shotDurationPolicy().allowedS.join("|")},"direction":{"synopsis":string,"subject":string,"action":string,"camera":string,"mood":string},"imagePrompt":string,"videoPrompt":string,"animation":{"template":"title"|"kinetic","text":string,"subtext":string,"accent":"#rrggbb","background":"#rrggbb"}|null}]} — no markdown fences, no commentary.`,
    `Animation accent/background are OPTIONAL hex colors — set them to match the video's visual palette (e.g. neon piece → cyan/magenta on near-black); omit for the default warm look. Hex only, no color names.`,
    `Set "animation" ONLY for pure graphic shots: template "title" for held cards (end-cards, quiet titles — optional subtext) or "kinetic" for punchy word-by-word type (countdown digits, lyric lines, interstitial statements). Filmed/generated shots get animation:null.`,
    `imagePrompt = a complete production-ready still-image prompt; videoPrompt = a complete video prompt (motion, camera, mood). Reference cast members by name.`,
    `Branding: invent original brand marks and packaging only — never describe or reference real-world / existing third-party brands, their logos, or recognizable trade dress.`,
    `BRIEF: ${JSON.stringify(i.brief)}`,
    ...castBlock(i.entities),
    i.entities?.length ? `Reference cast members by name in directions where they appear.` : "",
    `SCRIPT:\n${i.scriptText ?? ""}`,
  ].filter(Boolean).join("\n");
}

/** docs/17: the Suno round-trip — a paste-ready MUSIC prompt, never a video treatment. */
export function assembleMusicBriefPrompt(i: TextPromptInput): string {
  return [
    `TASK: Write a music generation prompt (for Suno) for the soundtrack of a ${i.targetDurationSeconds}-second video titled "${i.projectTitle}".`,
    `Describe the MUSIC only — no visual descriptions, no scene directions. This is a song brief.`,
    `Cover: genre, mood, tempo/BPM, instrumentation, energy arc over the ${i.targetDurationSeconds}s (intro/build/peak/outro), and whether vocals or instrumental.`,
    `Keep it as one paste-ready prompt paragraph followed by an optional short style-tags line.`,
    i.musicBias ?? "",
    `Vocabulary: describe energy positively (electric, driving, punchy, soaring) — avoid aggressive/violent/combat wording; music models block briefs containing it.`,
    `Unless you choose instrumental, ALSO write the full timed lyrics for the song using section tags like [Verse], [Chorus], [Bridge] — sized to fit the duration. If instrumental, state "Instrumental — no lyrics".`,
    `BRIEF: ${JSON.stringify(i.brief)}`,
    i.scriptText ? `THE VIDEO IT ACCOMPANIES (for mood reference only):\n${i.scriptText}` : "",
  ].filter(Boolean).join("\n");
}

export interface EditPromptInput {
  instruction: string;
  aspectRatio: "16:9" | "9:16";
}

export function assembleEditPrompt(i: EditPromptInput): string {
  // v3 guideline: simple edit instruction + the inpainting formula — overly descriptive edits cause unintended changes.
  return [
    sentence(i.instruction),
    `Keep everything else in the image exactly the same, preserving the original style, lighting, and composition.`,
    `Still image, ${i.aspectRatio} aspect ratio.`,
  ].join(" ");
}

/** Natural-prose still-image prompt (template v2). Custom text is verbatim + safety rail + format tail. */
export function assembleFramePrompt(i: Omit<TakePromptInput, "durationSeconds">): string {
  if (i.customPrompt?.trim()) {
    return `${i.customPrompt.trim()}\n${BRAND_SAFETY}\n${i.aspectRatio} still image.`;
  }
  const d = i.direction;
  const parts: string[] = [];
  parts.push(sentence(d.synopsis));
  parts.push(sentence(`${d.subject} — ${d.action}`));
  if (d.camera) parts.push(sentence(`Camera: ${d.camera}`));
  if (d.mood) parts.push(sentence(d.mood));
  for (const e of i.entities) {
    const desc = e.description.trim().toLowerCase() === e.name.trim().toLowerCase() ? "" : `, ${e.description}`;
    parts.push(sentence(`Featuring ${e.name}${desc}`)); // skip echo descriptions ("Pasi, Pasi")
  }
  if (i.stylePrompt) parts.push(sentence(i.stylePrompt));
  if (i.referenceImageCount) {
    // v3 guideline: high-fidelity detail preservation when composing from reference images.
    parts.push(`Use the provided reference images for the depicted subjects; keep each subject's features completely unchanged and integrate them naturally into the scene.`);
  }
  if (i.entities.some((e) => e.kind === "product" || e.kind === "company")) {
    // evals #2/#5: generated printed micro-text garbles — keep labels legible or de-emphasized.
    parts.push(`Any label or printed text on products must be either clearly legible exactly as named, or naturally de-emphasized (angle, focus) — avoid extreme close-ups of printed text.`);
  }
  parts.push(BRAND_SAFETY); // unconditional rail — drift happened with kind "character" and no product cast
  parts.push(`A cinematic still image, ${i.aspectRatio}, high detail.`);
  return parts.join(" ");
}
