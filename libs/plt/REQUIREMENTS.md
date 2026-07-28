# Requirements Ledger — PLT (Platform & Identity)

## Dashboard — PLT (Platform & Identity)
Totals: 1 DONE · 3 IN_REVIEW · 0 IN_PROGRESS · 0 READY · 1 PROPOSED · 0 DEFERRED · 0 BLOCKED

| ID | Title | Stage | Status | Source | Tests | Code |
|----|-------|-------|--------|--------|-------|------|
| REQ-PLT-001 | Deterministic dev-org resolution (by configured name) | MVP | DONE | USER BUG 2026-07-23 (entities landed in test orgs) | browser E2E (library + cast bar) | apps/web devOrgId, config.platform.devOrgName |
| REQ-PLT-002 | Google sign-in restricted to the modernpath.ai workspace | MVP | IN_REVIEW | USER 2026-07-28 · ADR-005 | libs/plt/tests/access.spec.ts | libs/plt/src/access.ts, apps/web/auth.ts, apps/web/middleware.ts |
| REQ-PLT-003 | One ffmpeg invocation path (native binary in the image) | MVP | IN_REVIEW | ADR-007 unimplemented half · ADR-014 | libs/shared/tests/ffmpeg.spec.ts | libs/shared/src/ffmpeg.ts (9 call sites), Dockerfile |
| REQ-PLT-004 | Production deployment at video-creator.modernpath.ai | MVP | IN_REVIEW | USER 2026-07-28 | health probe + browser E2E (see LOG) | config/deploy.yml, .kamal/secrets, Dockerfile |
| REQ-PLT-005 | Per-user identity (sign-in maps to a user, not one shared dev org) | Phase 2 | PROPOSED | discovered building REQ-PLT-002 | — | — |

### REQ-PLT-001 — Deterministic dev-org resolution
- **Status:** DONE · **Stage:** MVP · **Priority:** must · **Owner:** —
- **Raised-by:** USER BUG 2026-07-23: "Why can I only select characters, not persons or products?" — `select … limit 1` with no order returned an arbitrary org once test orgs existed, so new entities landed in a test org invisible to the user's projects.
- **Source:** `docs/10-platform-identity.md` (single-tenant dev mode)
- **Statement:** All web-app organization resolution shall go through one helper that resolves by the configured dev-org name (`config.platform.devOrgName`), creating it if missing; no `limit 1` without a deterministic predicate.
- **Acceptance criteria:**
  - GIVEN extra orgs in the DB WHEN any page/action resolves the org THEN it is always the configured dev org.
  - GIVEN no org WHEN resolved THEN the dev org is created once (name from config, not a literal).
- **Tests:** browser E2E (library create → cast bar shows entity) · **Code:** `apps/web/app/actions.ts` (devOrgId), `apps/web/app/library/page.tsx`, `libs/shared/src/config/limits.ts` · **Log:** LOG 2026-07-23
- **Deferred / notes:** data repaired (Pasi → Local Studio; 10 test orgs purged). Real fix for pollution = dedicated test DB → BACKLOG.

### REQ-PLT-002 — Google sign-in restricted to the modernpath.ai workspace
- **Status:** IN_REVIEW · **Stage:** MVP · **Priority:** must · **Owner:** —
- **Raised-by:** USER 2026-07-28: "set up google auth for logging in (limited to modernpath)". ADR-005 had chosen this design on 2026-07-23 and recorded it as "Not yet implemented".
- **Source:** ADR-005 (`docs/adr/005-session-cookie-auth.md`) · `docs/10-platform-identity.md`
- **Statement:** The web app shall admit only Google accounts whose verified email is in the configured workspace domain (`config.platform.allowedEmailDomain`), and shall serve no page or API route without a session except the deliberate public exceptions.
- **Acceptance criteria:**
  - GIVEN a verified `@modernpath.ai` Google account WHEN it signs in THEN a session is created.
  - GIVEN any other domain — including a lookalike (`evil-modernpath.ai`), a subdomain (`mail.modernpath.ai`), a longer domain (`modernpath.ai.evil.com`) or a second `@` in the local part — WHEN it signs in THEN it is refused.
  - GIVEN a `@modernpath.ai` address Google has NOT verified WHEN it signs in THEN it is refused (the `hd` parameter is a hint, never the gate).
  - GIVEN no session WHEN a page is requested THEN it redirects to `/signin` with a callback URL; WHEN an `/api/*` route is requested THEN it answers 401 rather than an HTML redirect.
  - GIVEN no session WHEN `/s/<token>`, `/api/auth/*`, `/signin` or `/api/health` is requested THEN it is served (INV-ASM-005 share links authenticate by token).
  - GIVEN a path that merely starts with a public segment (`/september`, `/signin-as-admin`) WHEN requested without a session THEN it is gated.
- **Tests:** `libs/plt/tests/access.spec.ts` (14 cases) · browser E2E, see LOG 2026-07-28
- **Code:** `libs/plt/src/access.ts`, `apps/web/auth.ts`, `apps/web/middleware.ts`, `apps/web/app/signin/page.tsx`, `apps/web/components/UserChip.tsx`, `libs/shared/src/config/limits.ts` (`platform.allowedEmailDomain`)
- **Log:** LOG 2026-07-28
- **Deferred / notes:** sessions are JWTs with no DB adapter — the middleware runs on the edge runtime and there is no per-user data model yet (one dev org, REQ-PLT-001). Per-user identity is REQ-PLT-005.

### REQ-PLT-003 — One ffmpeg invocation path (native binary in the image)
- **Status:** IN_REVIEW · **Stage:** MVP · **Priority:** must · **Owner:** —
- **Raised-by:** discovered preparing the deployment (2026-07-28): ADR-007 said "the worker container bakes ffmpeg in prod" and no code did — all nine call sites shelled out to `docker run`, which cannot work in the deployed container.
- **Source:** ADR-007 · ADR-014 · CLAUDE.md §1.10, §1.11
- **Statement:** All ffmpeg and ffprobe invocation shall go through one runner in `@avd/shared`, whose mode (`docker` on a laptop, `native` in the deployed image) is configuration — never a branch at a call site.
- **Acceptance criteria:**
  - GIVEN `FFMPEG_MODE` unset WHEN a call site runs THEN the argv is the pinned `docker run … jrottenberg/ffmpeg:6.1-alpine` invocation with the work dir bind-mounted at `/work`.
  - GIVEN `FFMPEG_MODE=native` WHEN a call site runs THEN the bare `ffmpeg`/`ffprobe` binary is invoked and every `/work` is rewritten to the real directory — including occurrences INSIDE a composite argument (`subtitles=/work/caps.srt:fontsdir=/work/fonts:…`).
  - GIVEN an ffprobe call in docker mode THEN the image entrypoint is overridden.
  - GIVEN any source file outside `@avd/shared` THEN it contains no `docker run` ffmpeg invocation.
- **Tests:** `libs/shared/tests/ffmpeg.spec.ts` (7 cases, golden argv both modes)
- **Code:** `libs/shared/src/ffmpeg.ts`; call sites in `libs/asm/src/service.ts` (5), `libs/ast/src/{derivatives,probe,tail-frame}.ts`, `libs/anm/src/composite.ts`; `Dockerfile` (ffmpeg, fonts-liberation)
- **Log:** LOG 2026-07-28
- **Deferred / notes:** CI exercises `docker` mode, production runs `native` — argv equality is not behavioural equality. A looked-at export on the deployed host is what closes that gap (ADR-014 consequences).

### REQ-PLT-004 — Production deployment at video-creator.modernpath.ai
- **Status:** IN_REVIEW · **Stage:** MVP · **Priority:** must · **Owner:** —
- **Raised-by:** USER 2026-07-28: "create a new hetzner server, deploy both database and app there".
- **Source:** ADR-007 (docker deploy, not serverless) · `docs/03-platform-architecture.md`
- **Statement:** The product shall run at `https://video-creator.modernpath.ai` from one image on one host: the Next.js app behind the Kamal proxy, the pg-boss worker as a second role, and Postgres as an accessory reachable only over the container network.
- **Acceptance criteria:**
  - GIVEN a deploy WHEN the proxy probes `/api/health` THEN it answers 200 without a session and without touching the database.
  - GIVEN a deploy WHEN either role boots THEN migrations are applied first, and two roles booting together cannot race (advisory lock).
  - GIVEN the host WHEN scanned from outside THEN only 22/80/443 answer; Postgres is bound to loopback.
  - GIVEN a queued generation THEN the worker role consumes it (`WORKER_MODE=queue`), not the web request.
- **Tests:** health probe + browser E2E on the deployed host, see LOG 2026-07-28
- **Code:** `config/deploy.yml`, `.kamal/secrets`, `Dockerfile`, `apps/web/app/api/health/route.ts`
- **Log:** LOG 2026-07-28
- **Deferred / notes:** no off-host backup of the Postgres accessory volume yet, and no alerting — both PROPOSED in `/BACKLOG.md`. Media is durable (Hetzner Object Storage); the database is not.

### REQ-PLT-005 — Per-user identity
- **Status:** PROPOSED · **Stage:** Phase 2 · **Priority:** should · **Owner:** —
- **Raised-by:** discovered building REQ-PLT-002 (2026-07-28).
- **Source:** ADR-005 · REQ-PLT-001
- **Statement:** A signed-in user shall map to a `plt.user` row and an organization membership, replacing the single dev org resolved by name.
- **Acceptance criteria:** *(not yet written — PROPOSED)*
- **Tests:** — · **Code:** — · **Log:** LOG 2026-07-28
- **Deferred / notes:** every signed-in person currently shares one org and sees the same projects. That is correct for one team of colleagues and wrong for anything else; it also blocks a DB session adapter, since there is nothing to adapt to.

*(Seed via Prompt 1 from `docs/10-platform-identity.md`.)*
