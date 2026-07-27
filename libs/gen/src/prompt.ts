// REQ-GEN-013 — deterministic prompt assembly (docs/14-generation.md §5).
import { config, entityKinds, fullFrameAnimationTemplates, shotAngles, shotDurationPolicy, shotMovements, shotSizes, type EntityKind } from "@avd/shared/config";
import { stripReferences, toVisualStyle, type StyleCard } from "@avd/shared/contracts"; // SR-DIR-005 · SCN-DIR-002 // REQ-STB-029 route palette · REQ-AST-012 profile cap · REQ-STB-036 template set

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
  kind: EntityKind; // REQ-STB-053 added "location" — a scene is cast like a character
  name: string;
  description: string;
  /** REQ-AST-012: long-form background — TEXT prompts only (script/plan/music), never visual prompts. */
  profile?: string | undefined;
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
  /**
   * SR-DIR-005: the project's Style Card. Only its craft axes are used — `provenance` (the brief
   * and any reference director) never reaches a visual model, which is the governing constraint of
   * EPIC-STB-001.
   */
  card?: StyleCard | undefined;
}

/** The card's look, for visual prompts. Empty when no card is selected. */
function cardLook(card?: StyleCard): string {
  return card ? toVisualStyle(card).trim() : "";
}

/**
 * SCN-DIR-002, enforced at the LAST boundary before a model sees the text.
 *
 * The card's own axes are already clean, but a visual prompt is also built from text the PLANNER
 * wrote — `customPrompt` (a shot's imagePrompt/videoPrompt) and the direction fields. The planner
 * is instructed never to name a real director and does it anyway: a real shot came back as
 * "Cinematic 35mm film frame, Aki Kaurismäki visual style." (USER 2026-07-26). Instructions are
 * not a guarantee, so the assembled string is scrubbed rather than trusted.
 */
function guard(prompt: string, card?: StyleCard): string {
  return card ? stripReferences(prompt, card.provenance?.references ?? []) : prompt;
}

/** `Spoken line: "We need structure."` — the quoted line already carries its own full stop. */
function spokenLine(line: string): string {
  const quoted = `Spoken line: "${line}"`;
  return /[.!?]"$/.test(quoted) ? quoted : `${quoted}.`;
}

function sentence(text: string): string {
  const t = text.trim();
  return /[.!?]$/.test(t) ? t : `${t}.`;
}

// KAIJU Neon Nights production finding (2026-07-24): the plan authored "black claw logo" and the
// frame model drew a real competitor's mark. Branding must always be original — trademark safety.
const BRAND_SAFETY = `Use only this project's own named brands; never depict real-world third-party brand logos, marks, or trade dress.`;

/**
 * Filmed shots carry no lettering. Graphic shots are rendered locally by Remotion, where text is
 * real text — a video model asked for a title produces pseudo-words ("The Luting an Dof", USER
 * 2026-07-27). The composed path always said this; the CUSTOM path returned before it, and the
 * planner writes a custom prompt for every shot, so in practice no filmed prompt ever said it.
 */
const NO_ON_SCREEN_TEXT = `No on-screen text, timestamps, titles, captions, lettering or interface graphics of any kind.`;

/** Natural-prose video prompt (template v2). Custom text is verbatim + safety rail + format tail. */
export function assembleTakePrompt(i: TakePromptInput): string {
  if (i.customPrompt?.trim()) {
    const look = cardLook(i.card);
    // A custom videoPrompt is what the PLANNER writes for every shot, so returning here dropped
    // dialogue on every single take — the line could not reach the video model by any path
    // (USER 2026-07-27: "Pasi is talking something… in video prompt all of that is missing").
    // Skipped when the prompt already quotes the line, so it is never said twice.
    const line = i.direction.dialogue?.trim();
    const spoken = line && !i.customPrompt.includes(line) ? `${spokenLine(line)}\n` : "";
    return guard(`${i.customPrompt.trim()}\n${spoken}${look ? `${look}\n` : ""}${NO_ON_SCREEN_TEXT}\n${BRAND_SAFETY}\n${i.aspectRatio} video, ${i.durationSeconds} seconds.`, i.card);
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
  const takeLook = cardLook(i.card);
  if (takeLook) parts.push(takeLook); // SR-DIR-005 — before the style kit, which may refine it
  if (i.stylePrompt) parts.push(sentence(i.stylePrompt));
  // v3 guideline: our takes are single shots — pin it so the model doesn't invent cuts.
  parts.push(`A single continuous shot, no scene cuts. ${NO_ON_SCREEN_TEXT}`);
  if (d.dialogue) parts.push(spokenLine(d.dialogue));
  if (d.audioNotes) parts.push(sentence(`Sound design: ${d.audioNotes}`));
  if (!d.dialogue && !d.audioNotes) parts.push(`No dialogue; natural ambient sound only.`);
  parts.push(`A cinematic ${i.aspectRatio} video clip, ${i.durationSeconds} seconds, natural motion.`);
  return guard(parts.join(" "), i.card);
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
  return entities.map((e) => {
    const profile = e.profile?.trim()
      ? `\nBACKGROUND (${e.name}): ${e.profile.trim().slice(0, config.entity.profilePromptMaxChars)}` // REQ-AST-012
      : "";
    return `CAST: [${e.kind}] ${e.name} — ${e.description}${profile}`;
  });
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
    `Return ONLY a JSON object exactly shaped: {"cast":[{"name":string,"kind":${entityKinds.map((k) => `"${k}"`).join("|")},"description":string,"appearance":string}],"shots":[{"title":string,"cast":string[],"durationS":${shotDurationPolicy().allowedS.join("|")},"shotSize":${shotSizes.map((v) => `"${v}"`).join("|")},"angle":${shotAngles.map((v) => `"${v}"`).join("|")},"movement":${shotMovements.map((v) => `"${v}"`).join("|")},"direction":{"synopsis":string,"subject":string,"action":string,"camera":string,"mood":string,"dialogue":string},"imagePrompt":string,"videoPrompt":string,"animation":{"template":${fullFrameAnimationTemplates.map((t) => `"${t}"`).join("|")},"text":string,"subtext":string,"accent":"#rrggbb","background":"#rrggbb"}|null}]} — no markdown fences, no commentary.`,
    // REQ-STB-048: only cast entities carry reference images, and reference images are what make a
    // face the same face twice. Anyone the script invents but nobody casts gets re-imagined in every
    // shot — one shot of the user's film simply drew the lead twice for want of a second face.
    // REQ-STB-053: the canteen was re-invented in every shot set there. A place is cast like a body.
    `"cast" ALSO lists every recurring PLACE as kind "location" — the canteen, the corridor, the office. Give each an "appearance" describing the SPACE itself: its architecture, furniture, wall colour and finish, light sources and their placement. Every shot set there must list that location in its own "cast", exactly as it lists the people in it. Without this the same room is re-invented shot to shot.`,
    `"cast" lists EVERY recurring person, character, product or company the film puts on screen — including unnamed ones the script only refers to by role ("the colleague", "the barista"). Give each a short stable name to be referenced by, and an "appearance": a concrete physical description precise enough that two different images of them would look like the same individual — build, age, hair, facial hair, clothing, distinguishing details. Never "a man in a suit". Someone who appears in exactly one shot and is never seen again can be left out.`,
    `Reference cast members BY NAME in every direction, imagePrompt and videoPrompt where they appear, using exactly the names you assigned in "cast" — that is what keeps them consistent across shots.`,
    // REQ-STB-049: each shot is conditioned ONLY on the members it lists. Listing everyone put the
    // company logo into a close-up of a face in a tram.
    `Each shot's own "cast" lists ONLY the members physically visible in THAT shot — usually one or two, often none for a graphic card. Do not list a brand or product unless it is actually on screen in that shot; its reference image is attached to every shot that names it, and an irrelevant reference drags that thing into the picture.`,
    // REQ-STB-050: shots were given lines that could not be said inside them, so takes ended
    // mid-sentence. Budget the time explicitly rather than assuming.
    `TIME BUDGET — a shot must be long enough for what happens in it. Speech runs about ${config.shot.wordsPerSecond ?? 2.5} words per second at unhurried delivery, so count the words of any dialogue, divide, and add at least a second of silence around it before choosing durationS. A 4s shot fits roughly 7 words. One deliberate physical action (sitting down, striking a match, setting a cup down) needs 2–3s on its own. If a beat does not fit the longest allowed shot, split it across two shots rather than letting the take end mid-sentence.`,
    // REQ-GEN-028: the script writes spoken lines and the plan used to drop every one of them.
    `direction.dialogue is the words a character SPEAKS in this shot, copied verbatim from the script — exact wording, no paraphrase, no stage directions. Use "" for a silent shot. When a shot has dialogue, the videoPrompt must also describe the delivery (who speaks, how) so the line is performed rather than merely captioned.`,
    // SR-DIR-001: the plan states its own craft so the director's pass can grade it (REQ-STB-043).
    `shotSize/angle/movement are the shot's craft: EWS…ECU framing, the camera angle, and how the camera moves ("static" when it does not). Alternate framing between adjacent shots — never two identical shotSize+angle pairs in a row — and end on the longest, calmest shot or a held graphic.`,
    `Animation accent/background are OPTIONAL hex colors — set them to match the video's visual palette (e.g. neon piece → cyan/magenta on near-black); omit for the default warm look. Hex only, no color names.`,
    `Set "animation" ONLY for pure graphic shots. Templates: "title" held card (end-cards, quiet titles — optional subtext) · "kinetic" punchy word-by-word type (countdown digits, lyric lines, interstitial statements) · "stat" a metric that counts up (text starts with the number, e.g. "4200 deployments shipped") · "quote" testimonial/quote card (subtext = attribution) · "checklist" heading + bullets revealed one by one (subtext = items separated by "|"). VARY templates across the video's animation shots — pick the one that fits each beat, never repeat the same template back-to-back unless the format demands it. Filmed/generated shots get animation:null.`,
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
    const look = cardLook(i.card);
    return guard(`${i.customPrompt.trim()}\n${look ? `${look}\n` : ""}${NO_ON_SCREEN_TEXT}\n${BRAND_SAFETY}\n${i.aspectRatio} still image.`, i.card);
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
  const frameLook = cardLook(i.card);
  if (frameLook) parts.push(frameLook); // SR-DIR-005
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
  return guard(parts.join(" "), i.card);
}
