// SR-DIR-004 (EPIC-STB-001, TASK-DIR-003) — compile free-form creative intent into a Style Card.
//
// "1-minute feature film of ModernPath AI directed by Aki Kaurismäki, a bit humoristic" →
// structured craft axes. This is the ONE moment a reference name is legitimately in play: the
// compiler researches it (Google Search grounding, the REQ-GEN-024 pattern in research.ts) and
// then resolves it into primitives. Everything downstream is name-free, because a name is filtered
// or diluted by image providers and averages to mush anyway, whereas "frontal, locked-off,
// saturated red against olive" repeats reliably across every shot of a film.
//
// The prompt asks the model not to name the reference in the axes; `scrubReferences` assumes it
// will anyway, because "Kaurismäki-style framing" is exactly how a language model naturally writes.
import { modelRoutes } from "@avd/shared/config";
import { styleCardSchema, type StyleCard } from "@avd/shared/contracts";
import { mockEnabled } from "./service";
import { ProviderError } from "./provider";

export function assembleStyleCardPrompt(brief: string): string {
  return [
    `TASK: Compile the following creative brief into a structured style card for a video production system.`,
    `BRIEF: ${brief}`,
    ``,
    `If the brief names a director, film, studio, era or artistic movement, use web search to research how that work actually looks — framing, camera movement, colour, lighting, performance, pacing, sound — and resolve it into concrete craft instructions.`,
    ``,
    `CRITICAL: the craft fields must describe the look in plain production terms and must NEVER write the name of a real director, artist, studio or brand, and never words like "-style", "in the manner of", "reminiscent of". Put the names you researched in "references" ONLY. A cinematographer who had never heard of the reference must be able to shoot from these fields alone.`,
    `"references" lists ARTISTIC sources you researched — directors, cinematographers, films, movements. It must NEVER contain the subject of the video, the brand, the company or the product being advertised: those are what the film is ABOUT, not what it looks like.`,
    ``,
    `Return ONLY a JSON object, no markdown fences, no commentary, exactly shaped:`,
    `{"name":string,"references":string[],"structure":{"arc":string,"shotCountHint":[int,int]},"camera":{"allowedMovements":string[],"preferredSizes":string[],"angles":string[],"notes":string},"pacing":{"durationWindowS":[number,number]},"palette":{"accent":"#rrggbb","background":"#rrggbb","notes":string},"light":string,"performance":string,"humour":string,"sound":string,"typography":string,"continuity":string,"antiNotes":string[]}`,
    ``,
    `Field rules:`,
    `- allowedMovements from: static, pan, tilt, push-in, pull-out, tracking, handheld, crane. List ONLY what this style genuinely uses — a style that never moves the camera gets ["static"] alone.`,
    `- preferredSizes from: EWS, WS, MW, MS, MCU, CU, ECU. angles from: eye, low, high, overhead, dutch.`,
    `- pacing.durationWindowS is the [min,max] length of a single shot in seconds, between 4 and 10.`,
    `- palette accent/background are #rrggbb hex sampled from the look itself, not generic brand colours.`,
    `- humour: the comic register and its timing, or how the piece treats tone if it is not funny. Honour any tone the brief asks for.`,
    `- continuity: one sentence naming what must look IDENTICAL in every shot — the main subject's exact wardrobe, hair and recurring props. Every frame is generated separately, so anything left unsaid drifts between shots. Be concrete ("a grey wool suit and knitted tie"), never vague ("consistent styling").`,
    `- antiNotes: what this style REFUSES to do — the shots, moves and rhythms that would break it. At least three, as a JSON array of separate short strings (one refusal per item), never one joined sentence. A style with no refusals has no point of view.`,
  ].join("\n");
}

function stripFences(raw: string): string {
  return raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
}

/** The reference names the model reports, for provenance and for scrubbing. */
export function extractReferences(raw: string): string[] {
  try {
    const parsed = JSON.parse(stripFences(raw)) as { references?: unknown };
    return Array.isArray(parsed.references) ? parsed.references.filter((r): r is string => typeof r === "string") : [];
  } catch {
    return [];
  }
}

const CRAFT_TEXT_PATHS = ["light", "performance", "humour", "sound", "typography", "continuity"] as const;

/**
 * Film and series titles are made of ordinary words, and those same words are craft vocabulary.
 * A reference like "Planet Earth" or "The Blue Planet" must never cost the card its "earth tones"
 * or "blue hour" (observed live, 2026-07-26, from a David Attenborough brief). So a reference is
 * stripped word-by-word only for words that could not plausibly be describing a picture — a
 * surname like "Kaurismäki" — while the full phrase is always stripped whatever it is made of.
 */
const COMMON_WORDS = new Set([
  "planet", "earth", "blue", "black", "white", "green", "golden", "gold", "silver", "grey", "gray",
  "natural", "history", "unit", "life", "living", "wild", "ocean", "deep", "night", "day", "light",
  "dark", "shadow", "star", "stars", "space", "time", "hour", "world", "city", "street", "story",
  "stories", "first", "last", "great", "grand", "little", "lost", "return", "rise", "fall", "dawn",
  "dusk", "winter", "summer", "spring", "autumn", "north", "south", "east", "west", "river", "sea",
  "man", "woman", "girl", "boy", "king", "queen", "royal", "empire", "machine", "future", "past",
  "colour", "color", "shot", "shots", "film", "films", "movie", "picture", "pictures", "studio",
  "studios", "productions", "company", "brothers", "sons", "match", "factory", "leaves", "fallen",
]);

/** "Kaurismäki" → "Kaurismaki": models routinely drop diacritics, so both spellings must be caught. */
const deaccent = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");

/** "Hard sources in the manner of Aki Kaurismäki." → "Hard sources." */
function scrubText(text: string, names: string[]): string {
  let out = text;
  for (const name of names) {
    // Every part of a name individually — models write "Kaurismäki" without the "Aki" — and each
    // part in both its accented and de-accented spelling.
    const distinctive = name.split(/\s+/).filter((w) => w.length > 3 && !COMMON_WORDS.has(deaccent(w).toLowerCase().replace(/[^a-z]/g, "")));
    const words = [name, ...distinctive]; // the full phrase always; single words only when distinctive
    const parts = [...new Set([...words, ...words.map(deaccent)])].filter((p) => p.length > 3);
    for (const part of parts) {
      const esc = part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      // Take the connective with the name, so no dangling "in the manner of ." remains.
      out = out.replace(new RegExp(`\\s*\\b(?:in the (?:manner|style|vein) of|reminiscent of|as|like|à la)\\s+${esc}(?:'s)?`, "gi"), "");
      out = out.replace(new RegExp(`\\b${esc}(?:'s)?[-\\s]?(?:style|esque|ian)?\\b`, "gi"), "");
    }
  }
  return out
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,;])/g, "$1")
    .replace(/^[\s,;-]+/, "")
    .replace(/,\s*\./g, ".")
    .trim();
}

/**
 * Does this text still carry a reference? Uses the SAME rule as the scrubber, so a check can never
 * disagree with what the scrubber promises (SCN-DIR-002).
 */
export function containsReference(text: string, names: string[]): boolean {
  return names.some((n) => scrubText(text, [n]) !== text);
}

/** Defence in depth for SCN-DIR-002 — strip reference names out of the craft axes. */
export function scrubReferences(card: StyleCard, names: string[]): StyleCard {
  if (!names.length) return card;
  const out: StyleCard = { ...card };
  if (out.camera?.notes) out.camera = { ...out.camera, notes: scrubText(out.camera.notes, names) };
  if (out.palette?.notes) out.palette = { ...out.palette, notes: scrubText(out.palette.notes, names) };
  if (out.structure?.arc) out.structure = { ...out.structure, arc: scrubText(out.structure.arc, names) };
  for (const key of CRAFT_TEXT_PATHS) {
    if (typeof out[key] === "string") out[key] = scrubText(out[key], names);
  }
  if (Array.isArray(out.antiNotes)) out.antiNotes = out.antiNotes.map((n) => scrubText(n, names));
  return out;
}

/**
 * The live grounded model returns list fields as one joined string often enough to matter (first
 * real compile, 2026-07-26: `antiNotes` came back semicolon-joined despite the schema in the
 * prompt). Split rather than reject — the content was right, only its shape was wrong.
 */
const coerceList = (v: unknown): unknown => {
  if (typeof v !== "string") return v;
  const parts = v.split(/[;|\n]/).map((s) => s.trim()).filter(Boolean);
  // A single long sentence is the model ignoring the array shape entirely ("Refuses handheld
  // camera work, quick cuts under four seconds, …") — comma-split that, but never a short phrase
  // where the comma is real ("no zooms, ever").
  if (parts.length === 1 && parts[0]!.length > 60 && parts[0]!.includes(",")) {
    return parts[0]!.split(",").map((s) => s.trim().replace(/^(?:refuses|avoids|no)\s+(?=\w)/i, (m) => m.toLowerCase())).filter(Boolean);
  }
  return parts;
};

function normalizeLists(parsed: Record<string, unknown>): void {
  parsed["antiNotes"] = coerceList(parsed["antiNotes"]);
  const camera = parsed["camera"];
  if (camera && typeof camera === "object") {
    const c = camera as Record<string, unknown>;
    for (const key of ["allowedMovements", "preferredSizes", "angles"]) c[key] = coerceList(c[key]);
  }
}

/** Parse a compiler response into a validated, scrubbed card. Pure — no provider. */
export function parseStyleCard(raw: string, brief: string): StyleCard {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(stripFences(raw)) as Record<string, unknown>;
  } catch {
    throw new ProviderError("output_unusable", "could not parse a style card from the response");
  }
  if (!parsed || typeof parsed !== "object" || !parsed["camera"]) {
    throw new ProviderError("output_unusable", "could not read a style card from the response");
  }
  const references = Array.isArray(parsed["references"])
    ? (parsed["references"] as unknown[]).filter((r): r is string => typeof r === "string")
    : [];
  normalizeLists(parsed);
  // Provenance is set HERE, from what we know — never taken from the model's own card body.
  const { references: _drop, ...body } = parsed as Record<string, unknown> & { references?: unknown };
  const card = styleCardSchema.parse({
    ...body,
    id: `compiled-${Date.now().toString(36)}`,
    provenance: { brief, references },
  });
  return scrubReferences(card, references);
}

/** Grounded compile (research.ts pattern): near-free text call, no generation-ledger row. */
export async function compileStyleCard(brief: string): Promise<StyleCard> {
  if (mockEnabled()) {
    return parseStyleCard(JSON.stringify({
      name: "Mock style", references: [],
      structure: { arc: "mock arc", shotCountHint: [4, 6] },
      camera: { allowedMovements: ["static"], preferredSizes: ["MS"], angles: ["eye"], notes: "Mock framing." },
      pacing: { durationWindowS: [4, 6] },
      palette: { accent: "#e2a33c", background: "#12151b", notes: "Mock palette." },
      light: "Mock light.", performance: "Mock performance.", humour: "None.",
      sound: "Mock sound.", typography: "Mock type.", antiNotes: ["no mock drift"],
    }), brief);
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new ProviderError("provider_unavailable", "GEMINI_API_KEY is not set");
  const { GoogleGenAI } = await import("@google/genai");
  const client = new GoogleGenAI({ apiKey });
  const res = await client.models.generateContent({
    model: modelRoutes.script,
    contents: assembleStyleCardPrompt(brief),
    config: { tools: [{ googleSearch: {} }, { urlContext: {} }] }, // REQ-GEN-024 grounding
  });
  const text = (res.text ?? "").trim();
  if (!text) throw new ProviderError("output_unusable", "empty style-card response");
  return parseStyleCard(text, brief);
}
