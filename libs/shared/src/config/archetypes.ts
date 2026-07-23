// docs/87-directing-playbook.md — archetype recipes injected into script/plan/music prompts (REQ-STB-026).
// Config, not literals: tuning taste means editing THIS file.

export interface ArchetypeRecipe {
  name: string;
  /** REQ-STB-027: project defaults applied when the archetype is selected. */
  defaults?: { audioMode?: "native" | "music" | "mix" };
  /** Injected into script + plan prompts as the DIRECTING block. */
  directing: string;
  /** Extra guidance for the shot-plan prompt only. */
  planBias: string;
  /** Extra guidance for the music-brief prompt only. */
  musicBias: string;
}

export const archetypes: Record<string, ArchetypeRecipe> = {
  "brand-pulse": {
    name: "Brand pulse",
    directing:
      "DIRECTING (Brand pulse): kinetic and confident. The product appears in almost every shot. One idea per shot. Contrast cuts — alternate wide/close and motion/still. Land the strongest image on the musical peak. End on a held graphic end-card, never cut away from the climax instantly.",
    planBias:
      "Prefer 4s and 6s shots. Insert one kinetic-text interstitial mid-video (animation template kinetic) and ALWAYS end with a brand end-card animation shot.",
    musicBias: "High-BPM instrumental, hard sections, a clear peak two-thirds in.",
    defaults: { audioMode: "music" },
  },
  "lyric-video": {
    name: "Lyric video",
    directing:
      "DIRECTING (Lyric video): typography carries the piece. Lyrics are the visual subject; filmed shots are texture between type moments. Structure follows the song's sections exactly.",
    planBias:
      "Most shots are animation shots (template kinetic or title) carrying the lyric lines; filmed shots only as atmosphere between sections.",
    musicBias: "Vocal-forward song with clear, singable lyrics; verses and choruses strongly differentiated.",
    defaults: { audioMode: "music" },
  },
  "cinematic-mood": {
    name: "Cinematic mood film",
    directing:
      "DIRECTING (Cinematic mood film): slow and atmospheric. One idea per shot, no dialogue. Slow push-ins and holds; nothing rushes. End with the calmest, longest shot.",
    planBias: "8s shots only. No animation shots except at most a quiet closing title.",
    musicBias: "Sparse ambient instrumental; long swells, no drums until the final third.",
    defaults: { audioMode: "music" },
  },
  "product-launch": {
    name: "Product launch",
    directing:
      "DIRECTING (Product launch): precise and premium. Macro detail shots of the product; match-cut compositions where the framing repeats while the product state changes. The product name lands visually at the end.",
    planBias: "Alternate macro product shots with one wide context shot. End with an end-card animation shot naming the product (highlight the product word).",
    musicBias: "Minimal, precise, percussive; silence is allowed.",
    defaults: { audioMode: "mix" },
  },
  "character-story": {
    name: "Character story",
    directing:
      "DIRECTING (Character story): narrative continuity. The main character appears in at least 60% of shots, always consistent with their reference images. Each shot advances one story beat. Dialogue is welcome where it serves the beat.",
    planBias: "Give shots concrete story beats (setup, turn, payoff). Include dialogue lines in video scripts where natural.",
    musicBias: "Score follows the emotional arc of the story; understate, never overpower dialogue.",
    defaults: { audioMode: "mix" },
  },
  "hype-countdown": {
    name: "Hype countdown",
    directing:
      "DIRECTING (Hype countdown): rapid-fire energy toward a reveal. Every shot is a punch. Cuts land on the beat. The reveal gets the longest hold.",
    planBias: "4s shots only. Alternate filmed beats with kinetic-text number/word interstitials counting toward the reveal; end on the reveal + end-card.",
    musicBias: "Driving high-BPM track building to a drop at the reveal moment.",
    defaults: { audioMode: "music" },
  },
};
