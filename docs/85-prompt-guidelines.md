# 85 — Model Prompt Guidelines (canonical)

> Source: Gemini Omni Flash / Nano Banana prompt guide shared by USER 2026-07-23.
> Enforced by `libs/gen/src/prompt.ts` (PROMPT_TEMPLATE_VERSION = 3) and its tests.
> Custom user-authored scripts are ALWAYS sent verbatim — these rules shape **auto-assembled** prompts only.

## Video prompts (takes/retakes)

1. **Single scene pin** — our takes are single shots; auto prompts always include
   "A single continuous shot, no scene cuts." (Omni invents multi-shot narratives otherwise.)
2. **Explicit audio intent** — never leave audio to chance:
   - dialogue set → `Spoken line: "…"`
   - audioNotes set → `Sound design: …`
   - neither → `No dialogue; natural ambient sound only.`
3. **Semantic negatives** — describe the intended scene positively ("an empty, deserted street"),
   plus simple negations where needed ("No dialogue", "No extra sound effects").
4. **Timing** — natural language or timecode blocks (`[0-3s] … [3-6s] …`) are supported for
   in-clip event timing; available to users in custom video scripts.
5. **Camera language** — wide-angle, macro, low-angle, slow push-in etc. (already in Direction.camera).

## Image prompts (frames)

6. **Hyper-specific, context and intent** — auto prompts carry synopsis/subject/action/camera/mood
   plus entity descriptions; shot-plan authoring instructs production-ready specificity.
7. **Reference preservation** — when reference images are attached:
   "Use the provided reference images for the depicted subjects; keep each subject's features
   completely unchanged and integrate them naturally into the scene." (high-fidelity detail preservation)

9. **Label fidelity** (evals #2/#5) — product/company entities trigger: label text must be
   clearly legible exactly as named OR naturally de-emphasized; never extreme close-ups of
   printed text. Also: state exact label wording in the entity description.

## Image edits (image_edit)

8. **Simple instruction + inpainting formula** — overly descriptive edits cause unintended changes:
   `<instruction>. Keep everything else in the image exactly the same, preserving the original
   style, lighting, and composition.`

## Reserved for the Omni Interactions route (OQ-112 spike)

- Role tags bind uploaded media: `<FIRST_FRAME>` (start frame), `<IMAGE_REF_N>` (references, 0-based),
  or explicit `[# Sources <FIRST_FRAME>@Image1] [# References <IMAGE_REF_0>@Image2]` declarations
  with a trailing guiding instruction. Veo takes these via API params instead — do NOT emit tags on the Veo route.
- Editing videos: simple prompts ("Make this video anime"), `Keep everything else the same.`
- `task` param in video-config: text_to_video / image_to_video / reference_to_video / edit.

## Iteration culture

Users reprompt images before committing to video (canonical 3-step flow) — the retake/edit
instructions should stay small and incremental ("warmer lighting", "more serious expression").

## Music generation (Lyria 3, USER requirement 2026-07-23)

- Models: `lyria-3-clip-preview` (30s clip, MP3) · `lyria-3-pro-preview` (~2min full song, MP3/WAV) — Interactions API, request/response.
- Prompts: natural language (genre, instruments, BPM, key, mood) + optional timed structure `[0:00 - 0:10] Intro…`.
- Vocals: supported with custom lyrics via section tags `[Verse]` / `[Chorus]` / `[Bridge]`.
- OUR RULE: the music brief always includes full timed lyrics with section tags UNLESS the brief chooses instrumental — the same brief drives both the Suno round-trip and Lyria.
- Sync: audio understanding (gemini-3.6-flash, audio input ≤20MB inline / Files API above) yields transcripts with MM:SS timestamps + diarization — planned for lyric-timed scene cuts and singing characters (REQ-GEN-020).
