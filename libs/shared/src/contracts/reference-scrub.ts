// SCN-DIR-002 (EPIC-STB-001) — remove a compiled card's reference names from text.
//
// Lives in `shared` because BOTH the compiler (scrubbing a freshly compiled card) and prompt
// assembly (scrubbing plan-authored prompts on their way to an image model) need it, and
// `prompt.ts` cannot import the compiler without a cycle through `service.ts`.
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
export function scrubText(text: string, names: string[]): string {
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


/** Does this text still carry a reference? Same rule as the scrubber, so the two cannot disagree. */
export function containsReference(text: string, names: string[]): boolean {
  return names.some((n) => scrubText(text, [n]) !== text);
}

/** Strip every reference name from a single string. */
export function stripReferences(text: string, names: string[]): string {
  return names.length ? scrubText(text, names) : text;
}
