# PROGRESS — Build Status

Generated from per-context `libs/<ctx>/REQUIREMENTS.md` ledgers. Do not hand-edit the summary table.

Seed with Prompt 1 (`prompts.md`); build with Prompt 2. Epic progress also appears in `WORKLIST.md`.

| Context | DONE | IN_REVIEW | IN_PROGRESS | READY | PROPOSED | DEFERRED | BLOCKED | Total |
|---|---|---|---|---|---|---|---|---|
| *No contexts seeded yet* | — | — | — | — | — | — | — | — |
| **All** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |

---

## How to Update

After merges, regenerate from ledgers (customize for your repo layout):

```bash
for ctx in libs/*/; do
  name=$(basename "$ctx")
  [ -f "$ctx/REQUIREMENTS.md" ] || continue
  grep "^\- \*\*Status:\*\*" "$ctx/REQUIREMENTS.md" | \
    sed 's/.*Status:\*\* //' | awk -F'·' '{print $1}' | sort | uniq -c
done
```
