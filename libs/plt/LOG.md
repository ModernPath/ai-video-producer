# Build Log — PLT (Platform & Identity)

## 2026-07-28 — REQ-PLT-002/003/004: Google auth + first production deployment (→ IN_REVIEW)
**Done:** The product runs at `https://video-creator.modernpath.ai` on a Hetzner CPX32 (hel1, 46.62.237.87), provisioned from scratch this session: Docker, ufw (22/80/443 only), 4 GB swap for Remotion. One image, two roles — web behind the Kamal proxy, worker consuming pg-boss — plus Postgres as a Kamal accessory bound to 127.0.0.1 and media in a new Hetzner Object Storage bucket (`modernpath-video-creator`, hel1, same region as the host). DNS added via the Cloudflare API, DNS-only so the Kamal proxy can terminate TLS itself. Auth.js v5 with Google, gated to the workspace domain (REQ-PLT-002). ffmpeg now runs as a baked-in binary rather than a docker shell-out (REQ-PLT-003, ADR-014).

**Decisions:**
- *Fresh `AUTH_SECRET` and `POSTGRES_PASSWORD`, not the internal-apps ones.* The copied `.env` would have had two apps on `*.modernpath.ai` signing session cookies with the same key — a cookie minted by one would verify on the other.
- *The Google OAuth client is SHARED with internal-apps* (user's call); only the redirect URI differs. The domain gate is ours, server-side, so a shared client does not widen who may enter.
- *JWT sessions, no DB adapter.* The middleware runs on the edge runtime, and there is no per-user data model to adapt to yet (REQ-PLT-001's single dev org). Recorded as REQ-PLT-005 rather than left implicit.
- *Default closed.* `isPublicPath` lists the four exceptions; everything else is gated the moment it exists. The middleware matcher does NOT restate that list — one vocabulary, per CLAUDE.md §1.11.
- *Both roles migrate on boot.* The migrator already takes a pg advisory lock, so this is safe, and it removes the window where a container serves against a schema older than its own image.
- *`cpx31` → `cpx32`.* The size chosen by the user is EOL; cpx32 is the same 4 vCPU / 8 GB / 160 GB. Price correction recorded: ~€35.49/mo gross, not the ~€14 estimated when the choice was offered.

**Deferred:**
- No off-host backup of the Postgres accessory volume, and no alerting → `/BACKLOG.md`. Media is durable in object storage; the database is not. This is the largest known gap in the deployment.
- Per-user identity → REQ-PLT-005 (PROPOSED). Everyone signed in shares one org.

**Discovered:**
- **ADR-007's second half was never built.** "The worker container bakes ffmpeg in prod" was true of no code: nine call sites shelled out to `docker run`. Because each swallows its error by design, production would have produced no thumbnails, no probes, no tail frames and no exports, silently. Fixed as REQ-PLT-003 / ADR-014 — this is exactly the CLAUDE.md §1.9 failure mode, one layer down: the tests asserted the code existed and could not run where it was broken.
- **Kamal 2 builds from a git clone of HEAD, not the working tree.** The first `kamal setup` failed with "failed to read dockerfile" because every new file was uncommitted. Worth knowing before the next deploy: nothing uncommitted ships.
- The repo-root `.env` had been overwritten with the Modernpath internal-apps environment (different `S3_*` variable spellings, a foreign `DATABASE_URL`). Local development was unaffected — it reads `apps/web/.env.local` — but it made the root file useless as a deploy source. Rewritten for this app; the original is preserved at `.env.internal-apps.bak` (gitignored).

**Follow-ups:** human sign-off on the three IN_REVIEW rows · backup + alerting backlog rows.

**Gate — what was actually verified, and how (CLAUDE.md §9.9, §11):**
- `pnpm typecheck` clean · `pnpm test:unit` 375 passed (35 files), including 7 new golden-argv cases and 14 access-gate cases.
- **Looked at the deployed thing.** `/` redirects 307 → `/signin?callbackUrl=%2F`; the sign-in screen renders in the app's own type and asks for a modernpath.ai account (screenshot). `/api/health` → 200 over HTTP/2 with a valid Let's Encrypt certificate. `/api/assets/abc` with no cookie → `401 {"error":"unauthenticated"}`, not an HTML redirect. `/s/<token>` → 200, still public.
- **Sign-in completed end to end** (after USER registered the callback URI on the shared OAuth client, 2026-07-28). Google's account chooser opened already filtered — "Choose an account from modernpath.ai" — confirming the `hd` hint reaches it; selecting `pasi@modernpath.ai` landed back on `/` signed in, with the session chip and sign-out control rendered. `/library` then loaded from Postgres and resolved the dev org (REQ-PLT-001), both empty as expected on a fresh database. The `AccessDenied` refusal screen renders its own message rather than an Auth.js default. *(An earlier attempt, before the URI was registered, returned `Error 400: redirect_uri_mismatch` — useful evidence in itself that the request was well-formed and correctly addressed.)*
- **Not verified by a live attempt:** refusal of a non-modernpath.ai or unverified Google account — that needs a second Google identity. The predicate is covered by the 9 adversarial cases in `access.spec.ts`, and the refusal SCREEN was verified directly; the wiring between them (`signIn` callback → `?error=AccessDenied`) is the untested seam.
- **REQ-PLT-003 exercised in the container, not just in a spec.** Ran the real `@avd/shared/ffmpeg` runner inside the deployed web container: `mode: native`, argv `ffmpeg -i /tmp/x/a.mp4` (no docker). Encoded a 1280×720/24fps/48kHz clip at the export profile (63 327 bytes), probed it back as `2.000000` s, burned an SRT through libass with the Liberation Sans face copied from `config.asm.captions.fontFile` (78 422 bytes — LARGER than the source, which is what proves glyphs were actually drawn rather than the soft-fail blank), and pulled a tail frame via `-sseof` (28 808 bytes JPEG). ffmpeg 5.1.9, libass 0.17.1, Chromium 150 all present.
- Worker role reports `[worker] ready — queues: gen-execute asm-export`; 25 migrations applied (matches `migrations/`); `docker ps` shows web + worker + db + proxy up.
- **Not verified:** a completed Google sign-in (blocked on the redirect URI above), and therefore no end-to-end generation or export has been run on this host. The ffmpeg evidence above is the pipeline's binaries, not a real film.

## 2026-07-24 — BATCH SIGN-OFF: all IN_REVIEW → DONE (human-approved)
**Done:** USER approved the review queue verbatim: "approve all for now" (evidence: sign-off artifact + per-REQ tests/browser/real-API links in the ledger). All IN_REVIEW rows in this ledger moved to DONE atomically (dashboard row + detail block + Totals).
**Decisions:** approval is provisional ("for now") — regressions reopen the specific REQ, not the batch.
**Deferred / Discovered / Follow-ups:** none. **Gate:** ledger parse verified via scripts/progress.ts.

## 2026-07-23 — REQ-PLT-001 deterministic dev-org resolution (→ IN_REVIEW)
**Done:** devOrgId resolves by config.platform.devOrgName (was `limit 1`, order undefined); library page + entity actions all route through it. Data repair: moved user's "Pasi" person entity to Local Studio; purged 10 test orgs + dependents from dev DB.
**Decisions:** dev-org name lives in shared config (no literals rule).
**Deferred:** —
**Discovered:** interrupted test runs leave org debris even with teardown → dedicated test DB (BACKLOG).
**Follow-ups:** browser-verify cast bar shows person + character.
**Gate:** stb remove-shot suite green with new teardown; org table clean (only Local Studio).

## 2026-07-23 — Context scaffolded (Prompt 0B)
**Done:** lib skeleton, empty ledger, build guide.
**Decisions:** contracts in `./contracts` (Zod canonical).
**Deferred:** ledger seeding → Prompt 1.
**Discovered:** —
**Follow-ups:** seed requirements from docs/10-platform-identity.md.
**Gate:** n/a (no tests yet).
