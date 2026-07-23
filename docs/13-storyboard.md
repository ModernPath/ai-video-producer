# 13 — Story & Storyboard (STB)

**Context code:** STB
**Status:** Active — **core product domain and system of record.**

---

## 1. Purpose

Owns the creative state of a production: the **Script**, the ordered list of **Shots** with their **Directions**, which frame candidates and takes are **selected**, and the **Music Brief**. Everything the final video contains is decided here; GEN executes, AST stores, ASM outputs.

---

## 2. Aggregates

| Aggregate | Responsibility |
|-----------|----------------|
| Script | Versioned narrative text; revisions via chat with `gemini-3.6-flash`; applying a **Shot Plan** derived from it |
| Shot | Ordered slot: direction, duration, frame candidates + selections, takes + selection, status |
| MusicBrief | Prompt text for Suno + link to uploaded Music Track asset + audio mix mode |

`Shot` is the aggregate root for its frame candidates and takes (they are STB *links* to AST assets + GEN generations, with selection state owned here).

---

## 3. Invariants

| ID | Statement |
|----|-----------|
| INV-STB-001 | Shot duration is between `config.shot.min_seconds` (4) and `config.shot.max_seconds` (10), inclusive, and never exceeds the routed video model's max clip length. |
| INV-STB-002 | Shot order is a strict total order within a project (unique `position`; reorder is atomic). |
| INV-STB-003 | At most one selected frame candidate per slot (`start`, `end`) per shot; at most one selected take per shot. |
| INV-STB-004 | A take may be selected only if its video asset status is `ready`. |
| INV-STB-005 | A take belongs to exactly one shot and was generated from that shot's direction/frames (or is a retake of such a take); takes are never moved between shots. |
| INV-STB-006 | Selecting a different start frame does **not** invalidate existing takes; the UI must show which frame a take was generated from (provenance via GEN record). |
| INV-STB-007 | Applying a shot plan never silently deletes shots that already have selected takes — such shots require explicit user confirmation. |
| INV-STB-008 | Every mutation of script/shots records the acting principal (user or agent-on-behalf-of-user) for audit. |

## 4. Business rules

| ID | Statement |
|----|-----------|
| BR-STB-001 | A new project's storyboard starts empty; shots come from an applied shot plan or manual add. |
| BR-STB-002 | Requesting a take requires a selected start frame — unless the user explicitly chooses "text-to-video" mode for that shot (POL-STB-001 governs the default). |
| BR-STB-003 | End frame is optional; when present it is passed to generation per OQ-101's resolved mechanism. |
| BR-STB-004 | Shot status is derived, never stored as free-form: `planned` (no selected start frame) → `framed` (start frame selected, no selected take) → `generated` (take selected). |
| BR-STB-005 | Script revision does not auto-mutate shots. The user may request a **re-plan diff**: proposed add/update/remove per shot, applied selectively (protects paid work; OQ-109). |
| BR-STB-006 | Splitting a shot divides its duration and copies direction; merging concatenates directions and requires re-framing. |
| BR-STB-007 | Music Brief text is generated from brief + script + pacing (shot durations); the user can edit it freely before taking it to Suno. |

## 5. Policies

| ID | Statement |
|----|-----------|
| POL-STB-001 | Default take mode is frame-conditioned (start frame required); config flag may enable text-to-video default per org. |
| POL-STB-002 | Candidate lists (frames, takes) are unbounded but UI pages them; nothing is auto-deleted (assets are cheap, provenance is sacred). Users may soft-remove unselected candidates (`RemoveCandidate`); scripts keep all versions. |
| POL-STB-003 | **Everything revisable** (overview non-negotiable 5): scripts revise into new versions, frames re-generate or AI-edit into new candidates, takes retake into new candidates, directions edit freely — at any time, including after export (exports stay frozen via ASM snapshots). |

---

## 6. Commands

| Command | Effect | Key validation |
|---------|--------|----------------|
| `DraftScript` | GEN request (kind `script`) from brief; result stored as new script version | project has brief |
| `ReviseScript` | GEN request with chat instruction; new version | — |
| `ProposeShotPlan` | GEN request (kind `shot_plan`, structured output) → stored proposal | script exists |
| `ApplyShotPlan` | Batch add/update/remove shots from proposal | INV-STB-007 |
| `AddShot` / `UpdateDirection` / `SplitShot` / `RemoveShot` | Manual storyboard edits | INV-STB-001/002 |
| `ReorderShots` | Atomic position update | INV-STB-002 |
| `RequestFrame` | GEN request (kind `frame`, slot start/end, n candidates) | style kit/entities resolved |
| `RequestFrameEdit` | GEN request (kind `image_edit`) on an existing candidate + instruction → new candidate in the same slot | source ready |
| `SelectFrame` | Mark candidate selected for slot | INV-STB-003 |
| `RemoveCandidate` | Soft-remove a frame candidate or take from the shot's strips | not currently selected (unselect first); asset retention per INV-AST-003 |
| `RequestTake` | GEN request (kind `take`) with prompt assembly inputs | BR-STB-002, quota check (PLT) |
| `RequestRetake` | GEN request (kind `retake`) from existing take + edit instruction | source take ready |
| `SelectTake` | Mark take selected | INV-STB-003/004 |
| `SetMusicBrief` / `AttachMusicTrack` / `SetAudioMixMode` | Music state | track asset ready |

All commands carry `command_id` (idempotency key) per `07-api-contracts.md`.

---

## 7. Shot creative artifact (contract, canonical in Zod)

**Scripts-first (USER 2026-07-23):** every shot's primary creative artifact is its pair of authored prompts —
`imageScript` (starting-image prompt) and `videoScript` (video prompt) — plus `durationSeconds` and its
**reference images** (entity refs; per-shot selection is REQ-STB-016). The shot plan authors these scripts;
the user reprompts them freely; generation sends the script text verbatim (plus format tail and attached refs).
The Direction fields below are supporting metadata used to auto-compose scripts when none are authored.


```typescript
Direction = {
  synopsis: string;            // one-line what happens
  subject: string;             // who/what (may reference Entity names)
  action: string;              // movement/beat
  camera?: string;             // framing, movement, lens language
  mood?: string;               // lighting, tone
  dialogue?: string;           // spoken line / VO for native audio
  audio_notes?: string;        // SFX/ambience guidance for Omni native audio
  entity_ids: string[];        // AST entities in this shot (must be attached to the project)
  duration_seconds: number;    // 4.0–10.0
}
```

Prompt assembly from this structure is owned by GEN (`14-generation.md` §5) so it is testable and logged.

---

## 8. Events

`stb.ScriptDrafted`, `stb.ScriptRevised`, `stb.ShotPlanApplied`, `stb.ShotAdded`, `stb.ShotUpdated`, `stb.ShotsReordered`, `stb.ShotRemoved`, `stb.FrameSelected`, `stb.TakeSelected`, `stb.MusicBriefSet`, `stb.MusicTrackAttached`.

---

## 9. UX / API

`features/script-studio.md`, `features/storyboard.md`, `features/shot-editor.md`; API in `07-api-contracts.md` §STB.

## 10. Open questions

OQ-101 (end-frame conditioning), OQ-104 (exact duration control), OQ-108 (scenes), OQ-109 (re-plan diff UX), OQ-110 (transitions).
