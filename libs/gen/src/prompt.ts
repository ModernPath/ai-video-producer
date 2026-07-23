// REQ-GEN-013 — deterministic prompt assembly (docs/14-generation.md §5).
export const PROMPT_TEMPLATE_VERSION = 1;

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
}

export function assembleTakePrompt(i: TakePromptInput): string {
  const lines: string[] = [];
  lines.push(`FORMAT: ${i.aspectRatio} video, ${i.durationSeconds} seconds.`);
  if (i.stylePrompt) lines.push(`STYLE: ${i.stylePrompt}`);
  for (const e of i.entities) lines.push(`ENTITY: [${e.kind}] ${e.name} — ${e.description}`);
  const d = i.direction;
  const shot = [d.synopsis, `Subject: ${d.subject}.`, `Action: ${d.action}.`];
  if (d.camera) shot.push(`Camera: ${d.camera}.`);
  if (d.mood) shot.push(`Mood: ${d.mood}.`);
  lines.push(`SHOT: ${shot.join(" ")}`);
  const audio = [d.dialogue ? `Dialogue: "${d.dialogue}"` : "No dialogue.", d.audioNotes].filter(Boolean);
  lines.push(`AUDIO: ${audio.join(" ")}`);
  return lines.join("\n");
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
    `Each shot's direction is a ready image prompt: concrete subject, action, camera, mood.`,
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

export function assembleFramePrompt(i: Omit<TakePromptInput, "durationSeconds">): string {
  const lines: string[] = [];
  lines.push(`FORMAT: still image, ${i.aspectRatio} aspect ratio.`);
  if (i.stylePrompt) lines.push(`STYLE: ${i.stylePrompt}`);
  for (const e of i.entities) lines.push(`ENTITY: [${e.kind}] ${e.name} — ${e.description}`);
  const d = i.direction;
  const shot = [d.synopsis, `Subject: ${d.subject}.`, `Action: ${d.action}.`];
  if (d.camera) shot.push(`Camera: ${d.camera}.`);
  if (d.mood) shot.push(`Mood: ${d.mood}.`);
  lines.push(`SHOT: ${shot.join(" ")}`);
  return lines.join("\n");
}
