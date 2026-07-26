// SR-DIR-003 (EPIC-STB-001, TASK-DIR-002) — the six archetypes of docs/87-directing-playbook.md
// re-expressed as Style Cards: seed data, not code.
//
// Keys are unchanged from `archetypes.ts`, because `project.archetype` stores them and no existing
// project may lose its selection. Values are the same direction the prose recipes carried, now
// split onto typed axes — plus the two axes the prose had no room for: `humour` and `antiNotes`.
//
// Config, not literals: tuning taste means editing THIS file.
import type { StyleCard } from "../contracts/style-card";

export const styleCards: Record<string, StyleCard> = {
  "brand-pulse": {
    id: "brand-pulse",
    defaults: { audioMode: "music" },
    name: "Brand pulse",
    provenance: { references: [] },
    structure: { arc: "build to a single peak two-thirds in, then land on a held graphic", shotCountHint: [5, 7] },
    camera: {
      allowedMovements: ["static", "push-in", "tracking"],
      preferredSizes: ["WS", "MS", "CU"],
      angles: ["eye", "low"],
      notes: "Kinetic and confident. Contrast cuts — alternate wide/close and motion/still.",
    },
    pacing: { durationWindowS: [4, 6] },
    palette: { accent: "#e2a33c", background: "#12151b", notes: "Confident brand colour against near-black; high contrast." },
    light: "Punchy key light, clean highlights on the product.",
    performance: "Assured, energetic, never frantic.",
    humour: "None — conviction, not jokes.",
    sound: "High-BPM instrumental, hard sections, a clear peak two-thirds in.",
    typography: "Bold kinetic type for the mid-video interstitial; a held end-card to close.",
    antiNotes: ["no slow drifting atmosphere", "never cut away from the climax instantly", "no shot without the product"],
  },

  "lyric-video": {
    id: "lyric-video",
    defaults: { audioMode: "music" },
    name: "Lyric video",
    provenance: { references: [] },
    structure: { arc: "follows the song's sections exactly — verses recede, choruses assert" },
    camera: {
      allowedMovements: ["static", "push-in", "pan"],
      preferredSizes: ["WS", "MW", "CU"],
      angles: ["eye", "dutch"],
      notes: "Typography carries the piece; filmed shots are texture between type moments.",
    },
    pacing: { durationWindowS: [4, 8] },
    palette: { accent: "#7cf2e3", background: "#0b0d14", notes: "Saturated neon accent on deep night; light leaks and grain throughout." },
    light: "Moody, backlit, heavy atmosphere.",
    performance: "Impressionistic — figures as silhouettes and texture, not performances.",
    humour: "None — the lyric sets the tone.",
    sound: "Vocal-forward song with clear, singable lyrics; verses and choruses strongly differentiated.",
    typography: "The lyric IS the visual. Exact sung lines, never invented text, never the project title.",
    antiNotes: ["no burned captions — the type is the picture", "no invented lyrics", "no filmed shot that competes with a sung line"],
  },

  "cinematic-mood": {
    id: "cinematic-mood",
    defaults: { audioMode: "music" },
    name: "Cinematic mood film",
    provenance: { references: [] },
    structure: { arc: "calm → swell → return to calm; end on the longest, quietest shot", shotCountHint: [4, 6] },
    camera: {
      allowedMovements: ["static", "push-in"],
      preferredSizes: ["EWS", "WS", "MW"],
      angles: ["eye", "high"],
      notes: "Slow and atmospheric. Slow push-ins and long holds; nothing rushes.",
    },
    pacing: { durationWindowS: [8, 8] },
    palette: { accent: "#e8b04b", background: "#1a1710", notes: "Golden-hour warmth against deep shadow; muted, filmic." },
    light: "Natural, directional, golden-hour; long shadows.",
    performance: "Stillness. Figures observe rather than act.",
    humour: "None — this style is sincere.",
    sound: "Sparse ambient instrumental; long swells, no drums until the final third.",
    typography: "At most one quiet closing title.",
    antiNotes: ["no dialogue", "no fast cutting", "no handheld", "no animation shots beyond a closing title"],
  },

  "product-launch": {
    id: "product-launch",
    defaults: { audioMode: "mix" },
    name: "Product launch",
    provenance: { references: [] },
    structure: { arc: "detail → context → detail, resolving on the product name", shotCountHint: [5, 7] },
    camera: {
      allowedMovements: ["static", "push-in", "tracking"],
      preferredSizes: ["ECU", "CU", "WS"],
      angles: ["eye", "overhead"],
      notes: "Precise and premium. Match-cut compositions — framing repeats while the product state changes.",
    },
    pacing: { durationWindowS: [4, 6] },
    palette: { accent: "#dfe6f0", background: "#0e1116", notes: "Cool near-monochrome; one restrained accent." },
    light: "Controlled studio light, soft gradients, immaculate speculars.",
    performance: "Hands and product only where possible; no mugging.",
    humour: "None — restraint reads as premium.",
    sound: "Minimal, precise, percussive; silence is allowed.",
    typography: "The product name lands last, with the key word highlighted.",
    antiNotes: ["no clutter in frame", "no handheld", "no stock-footage energy", "no extreme close-up of printed text"],
  },

  "character-story": {
    id: "character-story",
    defaults: { audioMode: "mix" },
    name: "Character story",
    provenance: { references: [] },
    structure: { arc: "setup → turn → payoff; each shot advances exactly one beat", shotCountHint: [6, 9] },
    camera: {
      allowedMovements: ["static", "push-in", "tracking", "handheld"],
      preferredSizes: ["MW", "MS", "MCU", "CU"],
      angles: ["eye", "low"],
      notes: "Narrative continuity. The main character appears in at least 60% of shots, always consistent with their reference images.",
    },
    pacing: { durationWindowS: [4, 8] },
    palette: { accent: "#d98b5f", background: "#191a1d", notes: "Naturalistic skin-true colour; warmth reserved for the payoff." },
    light: "Motivated, naturalistic; light supports the beat rather than showing off.",
    performance: "Played honestly — expression carries the beat. Dialogue where it serves the story.",
    humour: "Warm and character-led where the beat invites it; never at the character's expense.",
    sound: "Score follows the emotional arc; understate, never overpower dialogue.",
    typography: "Captions on for dialogue; graphics otherwise stay out of the way.",
    antiNotes: ["no shot without a story beat", "no montage filler", "never break character consistency"],
  },

  "hype-countdown": {
    id: "hype-countdown",
    defaults: { audioMode: "music" },
    name: "Hype countdown",
    provenance: { references: [] },
    structure: { arc: "rapid-fire escalation to a reveal that gets the longest hold", shotCountHint: [3, 5] },
    camera: {
      // A whip pan would suit this style, but it is a transition, not a shot movement — it belongs
      // to the deferred exporter-transitions work, not the grammar vocabulary.
      allowedMovements: ["static", "push-in"],
      preferredSizes: ["CU", "MS", "WS"],
      angles: ["low", "eye"],
      notes: "Every shot is a punch. Cuts land on the beat.",
    },
    pacing: { durationWindowS: [4, 4] },
    palette: { accent: "#ff3d5a", background: "#0a0a0c", notes: "Hot accent on black; maximum contrast." },
    light: "Hard, high-contrast, rim-lit.",
    performance: "Peak energy, held poses, no idling.",
    humour: "None — pure adrenaline.",
    sound: "Driving high-BPM track building to a drop at the reveal moment.",
    typography: "Kinetic numbers and words counting toward the reveal; end-card to close.",
    antiNotes: ["no shot that lingers", "no soft transitions", "no reveal before the drop"],
  },
};
