# Phase 5 — Rules & Upgrade Safety: Overview

> **Goal**: Ship v0.6.0 — upstream the cerebrio-sapience rule learnings, make `momentum upgrade` non-destructive to project-specific CLAUDE.md content, and consolidate the breaking `--coding-agent` → `--agent` rename in this minor bump.

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Phase scope shape | Vision C — upstream improvements + persuasion-hardening of high-leverage rules | Conservative path A defers hardening; ambitious B builds an execution engine on un-hardened rules. C lays the rule foundation Phase 6 (execution engine) needs. |
| Persuasion-hardening targets | Rules 2, 6, 8, 10, 11 only | These are where agents most commonly slip in real cerebrio-sapience usage. Hardening rules with no failure evidence is busywork. |
| `--coding-agent` migration | Hard rename to `--agent`; no deprecation alias | Aliases cost maintenance and erode intent. Print a clear "renamed to --agent" error on the old flag. |
| CLAUDE.md split mechanism | `## Project Extensions` heading marker (not HTML comments) | Headings render in the doc and are self-documenting; HTML comments are invisible to readers and to most tooling. |
| Pre-marker migration | Backup + write fresh template + append old content under `## Project Extensions` | Safe, recoverable; one-time cost per project. No data loss path. |
| Rule 10 qualifier | Marked `(monorepo only)` in template | Rule 10 governs `specs/architecture/` which only exists on monorepos. Single-package projects skip it. |

## Scope

### In

| ID | Item |
|----|------|
| ENH-010 | CLAUDE.md `## Project Extensions` marker architecture (template + agent-rules) |
| ENH-011 | Add Rule 10 (additive vs decisional spec changes, monorepo) and Rule 11 (evaluator discipline) |
| ENH-012 | Enhance Rule 8 — explicit "what counts as meaningful" triggers, `[EVALUATOR]` entry type, impact-map.json reminder |
| ENH-013 | Naming conventions — `infra:` commit type, SLA column on backlog, delete-branch row on git table |
| ENH-008 | Rename `--coding-agent` flag → `--agent` (hard rename, breaking) |
| FEAT-011 | `momentum upgrade` preserves user content via marker-based section replacement |
| — | Persuasion-harden Rules 2, 6, 8, 10, 11 with Red Flags tables + anti-rationalization counters |
| — | Dogfood: migrate momentum's own CLAUDE.md to the new marker format |
| — | v0.6.0 release: CHANGELOG, status.md, roadmap.md, README updates |

### Out

- Subagent execution engine (deferred to Phase 6)
- TDD enforcement rule (Phase 6)
- `/complete-phase` verification rigor — running real tests, not box-checking (Phase 6)
- Systematic-debugging skill / 3-strikes rule (Phase 6)
- `/review-code` command (Phase 6)
- MCP server (Phase 7)
- Auto-spec generation `/specify` (Phase 7)
- Additional adapters — Cursor, Gemini, OpenCode, Copilot (awaiting demand)
- ENH-009 distribution strategy (still blocked on having ≥1 more adapter)
- Persuasion-hardening for Rules 1, 3, 4, 5, 7, 9 (no failure evidence yet — defer)

## Deliverables + Verification

| Deliverable | Verification |
|-------------|--------------|
| Rules 10 + 11 in `core/specs-templates/CLAUDE.md` and `core/agent-rules/project.md` | `grep -E "Rule 1[01]" core/specs-templates/CLAUDE.md core/agent-rules/project.md` |
| Rule 8 enhanced with triggers list, `[EVALUATOR]` type, impact-map reminder | `grep -E "EVALUATOR\|impact-map" core/specs-templates/CLAUDE.md` |
| Rules 2, 6, 8, 10, 11 each include a Red Flags table + anti-rationalization counters | Manual review per rule — each has ≥3 counters |
| Naming conventions extended: `infra:` commit, SLA column, delete-branch row | `grep -E "infra:\|SLA\|delete-branch" core/specs-templates/CLAUDE.md` |
| `## Project Extensions` heading present in CLAUDE.md template | `grep "## Project Extensions" core/specs-templates/CLAUDE.md` |
| `momentum upgrade` preserves project extensions when markers exist | Smoke: extend a CLAUDE.md, run upgrade, diff confirms extensions unchanged |
| `momentum upgrade` migrates pre-marker CLAUDE.md safely | Smoke: synthesize a pre-marker CLAUDE.md, run upgrade, confirm `.bak` + extensions appended |
| `--agent` flag accepted; `--coding-agent` rejected with rename hint | `momentum init --agent claude-code` works; `momentum init --coding-agent claude-code` exits non-zero with clear message |
| momentum's own `CLAUDE.md` migrated to new marker format | This repo's CLAUDE.md has `## Project Extensions` and project-specific content moved below it |
| v0.6.0 published to npm | `npm view @avinash-singh-io/momentum version` returns `0.6.0` |

## Acceptance Criteria

1. Fresh `momentum init` produces CLAUDE.md with all 11 rules + `## Project Extensions` scaffold
2. `momentum upgrade` on a project with `## Project Extensions` content preserves it byte-for-byte
3. `momentum upgrade` on a pre-marker project backs up the original and migrates without data loss
4. `momentum init --agent <name>` works for all currently supported agents (claude-code)
5. `momentum init --coding-agent <name>` exits non-zero with a "renamed to --agent" message
6. Each persuasion-hardened rule (2, 6, 8, 10, 11) has at least 3 anti-rationalization counters and a Red Flags table
7. Rule 10 explicitly distinguishes additive (no ADR) vs decisional (ADR required) spec changes
8. Rule 11 mandates evaluator commit before loop construction
9. Rule 8 lists explicit triggers and includes `[EVALUATOR]` alongside `[NOTE]`
10. CHANGELOG.md flags the breaking flag rename in a "Breaking Changes" section
11. `specs/status.md` and `specs/planning/roadmap.md` updated post-release; v0.6.0 tagged and published

## Release

v0.6.0 — Rules & Upgrade Safety
