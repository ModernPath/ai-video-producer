# PLT — Platform & Identity — build guide
- **Design doc:** `docs/10-platform-identity.md`
- **Contexts/rules:** `docs/02-bounded-contexts.md`; rule ids `INV/BR-PLT-*`
- **Contracts:** `./contracts/` (Zod canonical, ADR-003); DB `docs/data/40-data-model.md`; events `docs/data/41-event-catalog.md`
- **Requirements:** `./REQUIREMENTS.md` · **Log:** `./LOG.md`
- **Boundary:** import only `@avd/shared`; never read another context's tables directly (docs/02 §4 single-writer)
- **Config:** all thresholds/model ids from `@avd/shared/config` — never literals
- **Commands:** `pnpm test --filter @avd/plt` (from repo root: `pnpm vitest run libs/plt`)
- **Definition of done:** root `CLAUDE.md` §9
- **Start here:** next READY in `REQUIREMENTS.md`; loop per root `CLAUDE.md` §6
