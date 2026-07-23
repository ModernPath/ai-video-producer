# 82 — Technology Stack

**Status:** Active — decisions below are ADRs; change via new ADR row, not silent edit.

---

## 1. Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Language | TypeScript everywhere, strict | One language across web/worker/libs; Zod contracts shared |
| Web/UI/API | Next.js 15 (App Router, RSC) | Storyboard is server-renderable; API routes colocated; no separate BFF |
| Contracts | **Zod canonical** → OpenAPI generated | Root non-negotiable 3 |
| DB | PostgreSQL 16 + Drizzle ORM/migrations | Schemas per context, RLS tenancy |
| Queue | **pg-boss** (Postgres-backed) | No extra broker; retries, priorities, singleton keys for idempotency |
| Storage | S3-compatible (Cloudflare R2 prod, MinIO local) | Presigned uploads, signed reads |
| Media | ffmpeg (worker image) + ffprobe | Concat, normalize, mix, derivatives |
| AI SDK | `@google/genai` | Single GEN executor holds keys |
| Realtime | SSE | One-way progress only (ADR-006) |
| UI kit | Tailwind + Radix primitives + Framer Motion | Award-worthy custom look lives in design system, not a component farm |
| State | React Query + server state; no client store for domain data | Server is source of truth; events invalidate queries |
| Tests | Vitest (unit/contract) · Testcontainers (integration) · Playwright (E2E vs `MOCK_GEN`) | CI rings per `req-driven-dev` |
| Monorepo | pnpm workspaces + Turborepo | `apps/web`, `apps/worker`, `libs/*` |
| Deploy | Docker on Fly.io/Railway + managed Postgres + R2 | Long-running workers (ADR-007) |

## 2. Model routing (versioned config `config/models.ts`)

| Kind | Default model | Notes |
|------|---------------|-------|
| script / shot_plan / direction / music_brief | `gemini-3.6-flash` | structured output for shot plans |
| frame (draft) | `gemini-3.1-flash-lite-image` | ~free iteration |
| frame (standard) | `gemini-3.1-flash-image` | up to 14 refs |
| frame (hero) | `gemini-3-pro-image` | 2K/4K key art |
| take / retake | `gemini-omni-flash-preview` | ≤10s, native audio, $0.10/s |

All duration bounds, candidate counts, concurrency caps, cost rates in the same config module — never literals in code (root `CLAUDE.md` §1.4).

## 3. ADR log

| ID | Decision | Status |
|----|----------|--------|
| ADR-001 | Node/TypeScript monorepo (Next.js + worker), pnpm+Turborepo | ACCEPTED 2026-07-23 |
| ADR-002 | pg-boss on Postgres for jobs; no separate broker until scale demands | ACCEPTED 2026-07-23 |
| ADR-003 | Zod canonical schemas; OpenAPI generated | ACCEPTED 2026-07-23 |
| ADR-004 | UUIDv7 ids | ACCEPTED 2026-07-23 |
| ADR-005 | Auth.js session-cookie auth (magic link + Google) | ACCEPTED 2026-07-23 |
| ADR-006 | SSE for progress; no WebSocket until bidirectional need | ACCEPTED 2026-07-23 |
| ADR-007 | Docker deploy (Fly/Railway) over serverless — worker runtimes | ACCEPTED 2026-07-23 |
| ADR-008 | No timecode/track model — shots with decimal seconds | ACCEPTED 2026-07-23 |

## 4. Provider references (verify each phase)

- Omni video API: https://ai.google.dev/gemini-api/docs/omni
- Image generation: https://ai.google.dev/gemini-api/docs/image-generation
- gemini-3.6-flash: https://ai.google.dev/gemini-api/docs/models/gemini-3.6-flash
- Announcement (capabilities/pricing): https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-omni-flash-nano-banana-2-lite/

## 5. Local development

`docker compose up`: postgres, minio, web (dev), worker (dev). `MOCK_GEN=1` default — fixture images/videos, zero API cost; `GEMINI_API_KEY` enables real generation.

## 6. CI

Rings: unit + contract (every PR, mocked) → integration (Testcontainers) → E2E (Playwright, `MOCK_GEN`) → nightly real-API smoke with budget cap.
