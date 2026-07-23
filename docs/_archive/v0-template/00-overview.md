# AI Video Producer — Target Design Specification

**Version:** 0.1 (template baseline)  
**Status:** Draft — fill via Prompt 0A (`prompts.md`)  
**Scope:** Domain model, bounded contexts, UX, API contracts, data model, and events for an **AI-native video editor / producer**.

---

## 1. What this product is

An **AI-native video editor / producer** helps creators and teams go from idea to finished video: organize **projects**, manage **media assets**, edit on a **timeline**, collaborate, and use **AI agents** for scripting, rough cuts, suggestions, and generative assists — with humans approving material changes and exports.

Design thesis:

```
Media + Timeline + AI Producer + Render Pipeline + Human Governance
= AI-Native Video Production Environment
```

**Non-negotiables (target):**

1. **The timeline and project state are the system of record** — AI suggestions are proposals until accepted; exports are derived from committed edit state.
2. **Every AI-assisted change is traceable** — prompt/context, model, asset references, and user accept/reject (see `docs/10-platform-identity.md` audit patterns).

### 1.1 Repository layout (target)

| Path | Purpose |
|------|---------|
| `docs/` | Canonical design (this suite) |
| `libs/<ctx>/` | Bounded-context code + `REQUIREMENTS.md` |
| `apps/` | Editor web app, API, render workers |
| `epics/` | V-model epic records |
| `req-driven-dev/` | V-model process templates |
| `AGENTS.md`, `CLAUDE.md`, `WORKLIST.md` | Agent + build process |

Adjust names when the monorepo is bootstrapped (Prompt 0B).

---

## 2. Core capabilities (MVP-oriented)

- **Projects & workspace** — create project, settings, collaborators (`PRJ`, `PLT`).
- **Media library** — upload, ingest, proxy generation, metadata (`MED`).
- **Timeline editing** — tracks, clips, trim, split, transitions, text, audio (`TML`).
- **Preview** — low-latency preview of committed timeline state.
- **AI producer** — chat/agent panel: script, suggest edits, generate b-roll or VO (governed) (`AGT`).
- **Render & export** — queue, progress, download/share (`RND`).
- **Integrations (later)** — stock providers, cloud drives (`INT`).

Surface specs: `docs/features/`.

---

## 3. Document map

| # | Document | Contents |
|---|----------|----------|
| 00 | `00-overview.md` | This file |
| 01 | `01-ubiquitous-language.md` | Glossary |
| 02 | `02-bounded-contexts.md` | Context map, ownership |
| 03 | `03-platform-architecture.md` | Topology, modules, deploy |
| 06 | `06-ux-architecture.md` | Personas, journeys, screen inventory |
| 07 | `07-api-contracts.md` | API conventions and resources |
| 08 | `08-open-questions.md` | OQ register |
| — | `gap-register.md` | Deferred capabilities |
| 10–17 | Domain docs | Per-context model (placeholders + seeds) |
| 40–41 | `data/*` | Schema and events |
| 81–82 | Build plan, tech stack | Phasing and ADRs |
| — | `features/*` | Per-surface UX/requirements shells |
| — | `ux-screens/` | Reference captures (optional) |

**Reading order (implementers):** 01 → 02 → 06 → `features/<surface>` → 07 → 41 → 40 → domain doc for your context.

**Process:** `CLAUDE.md` (ledger loop), `req-driven-dev/V-model-loop.md` (epics).

---

## 4. Conventions

- **Naming:** English in code and APIs; UI may localize labels.
- **Rule IDs:** `BR-<CTX>-NNN`, `INV-<CTX>-NNN`, policies `POL-<CTX>-NNN`.
- **Open questions:** `OQ-NNN` in `08-open-questions.md`; blocked reqs cite OQ id.
- **IDs:** UUID (or ULID — decide in `82-tech-stack.md`).
- **Time:** `timestamptz` UTC; timeline uses **rational time** (frame-accurate) — see OQ-001 in `08`.
- **Multi-tenancy:** `organization_id` on tenant rows; RLS or equivalent — detail in `10-platform-identity.md`.
- **Events:** past tense (`ClipAdded`, `RenderJobCompleted`); envelope in `data/41-event-catalog.md`.
- **Cross-refs:** cite by filename.

---

## 5. Bounded contexts (summary)

| Code | Name | Role |
|------|------|------|
| **PLT** | Platform & Identity | Tenancy, auth, audit, config |
| **PRJ** | Projects | Project lifecycle, membership |
| **MED** | Media Assets | Upload, ingest, storage, proxies |
| **TML** | Timeline & Editing | Sequences, clips, edit operations |
| **AGT** | AI Producer | Agents, prompts, suggestions, generations |
| **RND** | Render & Export | Preview renders, export jobs |
| **COL** | Collaboration | Comments, presence, review (optional MVP) |
| **INT** | Integrations | External media and publish targets |

Full map: `02-bounded-contexts.md`.

---

*When this overview disagrees with a domain doc on domain detail, the domain doc wins. When a domain doc disagrees on context codes or glossary terms, **01** and **02** win.*
