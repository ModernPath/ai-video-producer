// REQ-GEN-013 — deterministic prompt assembly (docs/14-generation.md §5).
export const PROMPT_TEMPLATE_VERSION = 2; // v2: natural prose (USER feedback #2 — no label slop)

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
}

function sentence(text: string): string {
  const t = text.trim();
  return /[.!?]$/.test(t) ? t : `${t}.`;
}

/** Natural-prose video prompt (template v2). Custom text is verbatim + a minimal format tail. */
export function assembleTakePrompt(i: TakePromptInput): string {
  if (i.customPrompt?.trim()) {
    return `${i.customPrompt.trim()}\n${i.aspectRatio} video, ${i.durationSeconds} seconds.`;
  }
  const d = i.direction;
  const parts: string[] = [];
  parts.push(sentence(d.synopsis));
  parts.push(sentence(`${d.subject} — ${d.action}`));
  if (d.camera) parts.push(sentence(`Camera: ${d.camera}`));
  if (d.mood) parts.push(sentence(d.mood));
  for (const e of i.entities) parts.push(sentence(`Featuring ${e.name}, ${e.description}`));
  if (i.stylePrompt) parts.push(sentence(i.stylePrompt));
  if (d.dialogue) parts.push(sentence(`Spoken line: "${d.dialogue}"`));
  if (d.audioNotes) parts.push(sentence(`Sound: ${d.audioNotes}`));
  parts.push(`A cinematic ${i.aspectRatio} video clip, ${i.durationSeconds} seconds, natural motion, with audio.`);
  return parts.join(" ");
}

export interface TextPromptInput {
  projectTitle: string;
  brief: Record<string, unknown>;
  targetDurationSeconds: number;
  scriptText?: string | undefined;   // for shot_plan / revise
  instruction?: string | undefined;  // for revise
  entities?: EntityBlock[] | undefined; // REQ-STB-012: cast context for script/plan/music
}

function castBlock(entities?: EntityBlock[]): string[] {
  if (!entities?.length) return [];
  return entities.map((e) => `CAST: [${e.kind}] ${e.name} — ${e.description}`);
}

export function assembleScriptPrompt(i: TextPromptInput): string {
  return [
    `TASK: Write a video script for a ${i.targetDurationSeconds}-second video titled "${i.projectTitle}".`,
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
    `For EACH shot also author: imagePrompt (a complete, production-ready still-image prompt) and videoPrompt (a complete video-generation prompt: motion, camera, mood). Reference cast members by name.`,
    `BRIEF: ${JSON.stringify(i.brief)}`,
    ...castBlock(i.entities),
    i.entities?.length ? `Reference cast members by name in directions where they appear.` : "",
    `SCRIPT:\n${i.scriptText ?? ""}`,
  ].filter(Boolean).join("\n");
}

export interface EditPromptInput {
  instruction: string;
  aspectRatio: "16:9" | "9:16";
}

export function assembleEditPrompt(i: EditPromptInput): string {
  return [
    `EDIT: ${i.instruction}`,
    `Preserve the subject's identity, framing, and composition except where the edit requires otherwise.`,
    `FORMAT: still image, ${i.aspectRatio} aspect ratio.`,
  ].join("\n");
}

/** Natural-prose still-image prompt (template v2). Custom text is verbatim + a minimal format tail. */
export function assembleFramePrompt(i: Omit<TakePromptInput, "durationSeconds">): string {
  if (i.customPrompt?.trim()) {
    return `${i.customPrompt.trim()}\n${i.aspectRatio} still image.`;
  }
  const d = i.direction;
  const parts: string[] = [];
  parts.push(sentence(d.synopsis));
  parts.push(sentence(`${d.subject} — ${d.action}`));
  if (d.camera) parts.push(sentence(`Camera: ${d.camera}`));
  if (d.mood) parts.push(sentence(d.mood));
  for (const e of i.entities) parts.push(sentence(`Featuring ${e.name}, ${e.description}`));
  if (i.stylePrompt) parts.push(sentence(i.stylePrompt));
  parts.push(`A cinematic still image, ${i.aspectRatio}, high detail.`);
  return parts.join(" ");
}
