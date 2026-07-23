# ANM — Animations (Remotion) — build guide
- **Design:** BACKLOG Remotion epic (USER 2026-07-23); templates are parameterized React components — AI/user supplies PROPS, never code
- **Requirements:** `./REQUIREMENTS.md` · **Log:** `./LOG.md`
- **Boundary:** pure render engine — no DB access; GEN's executor calls `renderAnimation` (kind `animation`, engine id `remotion-local`, cost $0)
- **Render:** `@remotion/bundler` + `@remotion/renderer` (native binaries — keep external to the Next server bundle, see apps/web/next.config.mjs)
- **Commands:** `RUN_RENDER=1 pnpm vitest run libs/anm` (true render, ~11s)
- **Definition of done:** root `CLAUDE.md` §9
