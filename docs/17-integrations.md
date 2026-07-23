# 17 — Integrations

**Status:** Active for the Suno handoff pattern; publishing is post-MVP (GAP-105).

Not a bounded context in MVP — these are patterns hosted inside STB/AST/ASM.

---

## 1. Suno music handoff (MVP — manual round-trip)

Suno has no supported API path we depend on; the MVP flow is deliberately manual and friction-minimized:

1. **Music Brief** (STB): `gemini-3.6-flash` writes a Suno-ready prompt from brief + script + total duration + pacing (shot durations). Shown with a copy button and Suno deep link.
2. User generates the track in Suno, downloads it.
3. **Attach** (AST upload session → `ast.AssetReady` → STB `AttachMusicTrack`): drag-drop mp3/wav; duration probed and compared to video length with a visual fit indicator.
4. **Mix** (ASM): `native` / `music` / `mix` per BR-ASM-001.

Rules: brief text is editable (BR-STB-007); multiple tracks can be attached over time, one active. Automating Suno via API is GAP-106 — do not build scraping/unofficial integrations.

---

## 2. Model providers

Only GEN integrates with Google Gemini APIs (`14-generation.md` §8). Any additional provider (e.g. alternative video model) enters through GEN's model routing config — no provider types leak into STB/AST/ASM.

---

## 3. Future publish targets (GAP-105)

YouTube/TikTok/Instagram upload from a completed export. When built: new INT context with anti-corruption layer; `asm.ExportCompleted` is the trigger event; no provider ids in core tables without a mapping table.
