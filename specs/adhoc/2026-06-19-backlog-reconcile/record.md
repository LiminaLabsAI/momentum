# Ad-hoc Work Record: 2026-06-19-backlog-reconcile

> **Type**: quick-task
> **Created**: 2026-06-19
> **Branch**: chore/reconcile-backlog
> **Backlog**: none (this is backlog maintenance itself)
> **Status**: shipped

## Current Behavior

After v0.21.0 (Phase 19) shipped, the backlog still marked already-released items
as `open` / `in-progress`, so it misrepresented what was actually delivered:
- Phase 19 items `BUG-009`, `FEAT-018/019/020`, `ENH-041/042/043/044/045` → still `open`
- Phase 15 items `ENH-025/032/033/034/035` → still `in-progress | phase-15` (Phase 15 shipped as v0.18.0)
- `ENH-036` (shipped v0.20.1), `ENH-039` (shipped Phase 18) → still `in-progress` / `open`
- `BUG-007` → still `open`, though the `apply_patch|Bash` matcher fix shipped in v0.20.1

## Expected Behavior

The backlog accurately reflects shipped state: the above are `resolved` with the
correct phase tag; only genuinely-open items remain (`BUG-008`, `ENH-019`,
`ENH-030`, `ENH-037`, `ENH-038`).

## Unchanged Behavior

No code changes; no status flips for items that are actually still open. No
re-prioritization. `bin/`, `core/`, `adapters/`, and all tests untouched.

## Verification Evidence

```
$ grep '| (BUG-009|FEAT-018|FEAT-019|FEAT-020|ENH-041|ENH-042|ENH-043|ENH-044|ENH-045) |' backlog.md
  → all 9 now: | resolved | phase-19 |

$ grep '| P1 | open ' backlog.md   # remaining genuinely-open P1s
  BUG-008
  ENH-019
  ENH-030
  ENH-037
  ENH-038

$ grep -n 'apply_patch' adapters/codex/hooks.json   # BUG-007 fix confirmed present
  5:  "matcher": "apply_patch|Bash",
  16: "matcher": "apply_patch|Bash",
```
Doc-only chore — no test suite impact (code unchanged).
