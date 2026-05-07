# Phase 6 — Adapter Overlay & Verification: Overview

> **Goal**: Ship v0.7.0 — evolve the adapter contract to support per-agent commands/rules/scripts (overlays on top of `core/`), and add verification rigor that forces agents to produce evidence rather than check boxes.

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Phase scope shape | Two pillars: structural (adapter overlays) + functional (verification rigor) | Phase 5 hardened rules. Phase 6 evolves the adapter to allow per-agent depth, then proves the model with one Claude-Code-specific feature. Verification rigor is the universal failure mode in agentic workflows. |
| Adapter overlay model | Additive-only — each filename lives in EITHER `core/` OR one adapter, never both | Zero precedence/conflict logic. Matches the "templates must be generic; per-agent in adapters/" rule. CLI errors on duplicates before any writes. |
| `/review-code` placement | `adapters/claude-code/commands/review-code.md` — uses Task subagents | Proves the overlay structure works end-to-end. A generic `core/` version would lose subagent-review value. Other adapters can ship their own variant later. |
| Rule 12 scope | "Verify before claim" (universal) — not TDD | TDD is project-class-specific (docs/infra/design projects don't TDD). Verify-before-claim is universal across any agent, any project. |
| `/complete-phase` evidence | Run validations, capture stdout/stderr to `retrospective.md`; refuse to advance without fresh evidence | Boxes get checked without proof today. Evidence-on-disk is the simplest enforcement. |
| Subagent execution engine | Defer to Phase 7 | Claude-Code-specific feature; lands cleaner once the overlay structure is proven. |
| TDD rule (Rule 13) | Defer to Phase 7 (opt-in per project) | TDD applicability is project-class-dependent. Phase 7 ships it as opt-in. |
| `tests/` for momentum CLI | In scope — internal quality | Every release has shipped bugs caught only by smoke testing. Dogfoods Rule 12. |
| Phase shortname | `phase-6-overlay-and-verify` | Captures both pillars accurately. The original "execution-engine" placeholder no longer fits — the subagent runner moved to Phase 7. |

## Scope

### In

| ID | Item |
|----|------|
| FEAT-012 | Adapter Contract v2 — overlay walks `core/*` then `adapters/<chosen>/*` for `commands/`, `agent-rules/`, `scripts/`; conflict detection (duplicate filenames exit non-zero before any writes) |
| FEAT-013 | `/review-code` command — Claude-Code-specific, lives in `adapters/claude-code/commands/`, dispatches role-based subagents (security/QA/architecture) via Task tool |
| ENH-015 | Rule 12 "Verify before claim" — added to `core/specs-templates/CLAUDE.md` and `core/agent-rules/project.md`; persuasion-hardened (Red Flags + ≥3 anti-rationalization counters) |
| ENH-016 | `/complete-phase` evidence rigor — runs validations, captures output to `retrospective.md` under "Verification Evidence", refuses to advance without fresh evidence |
| ENH-014 | Rule 9 cross-repo doc-sync safeguards (carry-forward from Phase 5) — flag-to-user when history `Affects-specs:` points to another repo |
| FEAT-014 | `tests/` directory for momentum CLI — install, upgrade, marker, overlay, conflict coverage |
| — | Dogfood: run `momentum upgrade` on this repo; verify overlay loads `/review-code` for the Claude Code adapter; preserve `## Project Extensions` |
| — | v0.7.0 release: CHANGELOG, status.md, roadmap.md, README updates |

### Out

- Subagent execution engine (Phase 7)
- TDD rule (Rule 13, opt-in) (Phase 7)
- `systematic-debugging` skill / 3-strikes rule (Phase 7)
- SessionStart auto-activation hook (Phase 7, Claude-Code adapter)
- Persuasion-hardening for Rules 1/3/4/5/7/9 (Phase 7, evidence-permitting)
- Additional adapters — Cursor, Gemini, OpenCode, Copilot (Phase 8)
- Self-learning hooks, retrospective-driven rule evolution, self-healing (Phase 9)
- Context-window-aware task sizing (Phase 9)
- MCP server, `/specify` auto-spec generation, `/decide` ADR command, skill authoring (Phase 10+)
- Bidirectional spec sync (Phase 10+, experimental)

## Deliverables + Verification

| Deliverable | Verification |
|-------------|--------------|
| Adapter overlay: CLI walks `core/` then `adapters/<chosen>/` for `commands/`, `agent-rules/`, `scripts/` | After `momentum init --agent claude-code`, `/review-code` exists in target's `.claude/commands/` |
| Conflict detection | Place a duplicate filename in `core/commands/` and `adapters/claude-code/commands/`; CLI exits non-zero with clear "duplicate" error before any writes |
| `/review-code` (Claude Code) — subagent-driven | `adapters/claude-code/commands/review-code.md` exists; references Task tool with role-based prompts |
| Rule 12 in template + agent-rules | `grep "Rule 12" core/specs-templates/CLAUDE.md core/agent-rules/project.md` |
| Rule 12 persuasion-hardened | Manual review — Red Flags table + ≥3 anti-rationalization counters |
| `/complete-phase` captures evidence | Smoke: run `/complete-phase`; `retrospective.md` contains "Verification Evidence" section with command outputs |
| Rule 9 cross-repo safeguard | `grep -i "cross-repo\\|other repo" core/agent-rules/project.md core/commands/sync-docs.md core/specs-templates/CLAUDE.md` |
| `tests/` for momentum CLI | `npm test` passes; covers install (skip-existing), upgrade (marker preserve, marker migrate), partition logic, overlay walk, conflict detection |
| momentum's own CLAUDE.md and project.md re-upgraded | `git diff` after `momentum upgrade` shows expected changes only; `## Project Extensions` content preserved byte-for-byte |
| v0.7.0 published to npm | `npm view @avinash-singh-io/momentum version` returns `0.7.0` |

## Acceptance Criteria

1. `momentum init --agent claude-code` produces a project where `/review-code` is available in `.claude/commands/`, sourced from `adapters/claude-code/commands/`
2. Conflict detection — if a filename appears in both `core/<dir>/` and `adapters/<chosen>/<dir>/`, CLI exits non-zero with a clear "duplicate <type> <name>" error **before** any files are written
3. Rule 12 appears in CLAUDE.md template and agent-rules/project.md, with Red Flags table and ≥3 anti-rationalization counters, structured like Phase-5-hardened rules
4. `/complete-phase` refuses to proceed if validations weren't run; captures their output to `retrospective.md` under a "Verification Evidence" heading
5. ENH-014: Rule 9 in CLAUDE.md template explicitly warns against modifying cross-repo docs and instructs flagging via `Affects-specs: ../other-repo/...`; `/sync-docs` flags cross-repo entries instead of editing them
6. `tests/` exists in repo root with passing test suite covering install/upgrade/marker/overlay/conflict; `npm test` runs in CI-friendly mode (no interactive prompts)
7. momentum's own repo passes `momentum upgrade` cleanly post-Phase-6 — `## Project Extensions` content preserved, Rule 12 added, `/review-code` available under `.claude/commands/`
8. CHANGELOG.md notes "Adapter overlay (additive); Rule 12 verify-before-claim; /review-code (Claude Code); /complete-phase evidence rigor; cross-repo Rule 9 safeguard; tests/ for CLI"
9. `specs/status.md`, `specs/planning/roadmap.md`, README updated post-release; v0.7.0 tagged and published

## Release

v0.7.0 — Adapter Overlay & Verification
