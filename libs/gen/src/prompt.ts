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
