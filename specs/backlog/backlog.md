# Backlog

> **Last Updated**: 2026-05-08

---

## Priority Levels

| Level | Meaning |
|-------|---------|
| **P0** | Critical — blocks current phase |
| **P1** | High — address in current/next phase |
| **P2** | Medium — within 2 phases |
| **P3** | Low — nice to have |

**Status**: `open` | `in-progress` | `resolved` | `deferred` | `deprecated`

---

## Bugs

| ID | Title | Priority | Status | Phase | Detail |
|----|-------|----------|--------|-------|--------|
| BUG-001 | install.sh: `realpath` blank line when target dir doesn't exist | P3 | resolved | phase-1 | Fixed in Phase 1: `mkdir -p "$TARGET"` now runs before `realpath` |
| BUG-002 | v0.7.0 npm tarball missing adapter overlay files (`/review-code` not shipped) | P0 | resolved | post-phase-6 | Critical: the `files` glob `adapters/**/commands/` matched only the dir, not its contents. Users running `npx @avinash-singh-io/momentum init` from npm got no `/review-code`. Caught immediately post-publish by inspecting the published tarball. Fixed via glob change to `adapters/**/commands/**` (and `agent-rules/**`, `scripts/**`); patch-released as v0.7.1. |
| BUG-003 | `momentum init` copied macOS AppleDouble `._*` metadata files into target projects | P1 | resolved | phase-7b | Discovered during Codex install smoke on the T7 Shield worktree. `copyDir()` copied external-drive AppleDouble sidecar files from `core/` and command directories into fresh installs. Fixed by skipping `._*` and `.DS_Store` in `copyDir()` and `listFilesRecursive()`. |

## Features

| ID | Title | Priority | Status | Phase | Detail |
|----|-------|----------|--------|-------|--------|
| FEAT-001 | Tool-agnostic core/ + adapters/ restructure (DIP) | P1 | resolved | phase-1 | Delivered in Phase 1 (v0.2.0) |
| FEAT-002 | Adapter: Cursor (`.cursor/rules/`, `.cursorrules`) | P1 | deferred | phase-1 | Scope cut from Phase 1; superseded by FEAT-007 (P2, phase-2) |
| FEAT-003 | Adapter: Gemini CLI (`GEMINI.md`) | P1 | deferred | phase-1 | Scope cut from Phase 1; superseded by FEAT-008 (P2, phase-2) |
| FEAT-004 | Adapter: OpenCode | P1 | deferred | phase-1 | Scope cut from Phase 1; superseded by FEAT-009 (P2, phase-2) |
| FEAT-005 | Adapter: VS Code Copilot (`.github/copilot-instructions.md`) | P1 | deferred | phase-1 | Scope cut from Phase 1; superseded by FEAT-010 (P2, phase-2) |
| FEAT-006 | `npx momentum init` CLI (Claude Code only) | P1 | resolved | phase-2 | Delivered in Phase 2 (v0.3.0) as `@avinash-singh-io/momentum`; auto-detection deferred (no other adapters yet) |
| FEAT-007 | Adapter: Cursor (`.cursor/rules/`) | P2 | open | unscheduled | Rules-based, no slash commands — commands become prompt rules |
| FEAT-008 | Adapter: Gemini CLI (`GEMINI.md`) | P2 | open | unscheduled | Single-file convention; workflow prompts embedded as sections |
| FEAT-009 | Adapter: OpenCode | P2 | open | unscheduled | Convention TBD — research required before implementation |
| FEAT-010 | Adapter: VS Code Copilot (`.github/copilot-instructions.md`) | P2 | open | unscheduled | Instructions-only model; commands become inline prompt snippets |

## Tech Debt

| ID | Title | Priority | Status | Phase | Detail |
|----|-------|----------|--------|-------|--------|
| TD-001 | `adapter.sh` bundled in npm package unnecessarily | P3 | resolved | phase-3 | Fixed via explicit `files` glob in package.json (root .npmignore doesn't filter files-listed dirs) |
| TD-002 | `--coding-agent` flag missing from npx CLI | P2 | resolved | phase-3 | Delivered in Phase 3 (v0.4.0) — `adapter.js` DIP pattern, adapter validation, dynamic loading |
| TD-003 | `complete-phase` skill missing `npm publish` step | P1 | resolved | phase-4 | `npm publish` was never run for v0.4.0 or v0.5.0 — users got stale v0.3.0 from npm. Fixed: `npm publish --access public` added as step 4 in `core/commands/complete-phase.md` |
| TD-004 | `docs/developer-guide.md` significantly stale | P2 | open | unscheduled | Discovered during Phase 7a /complete-phase. Wrong git URL (`cerebrio/momentum` should be `avinash-singh-io/momentum`); references long-defunct `template/` directory (renamed to `core/specs-templates/` in Phase 1/3); references `install.sh` testing instead of `npm test`. Phase 7a patched only the gate/T7-relevant additions; broader cleanup is out of scope for that phase. Candidate for Phase 8 or as a standalone `docs:` PR. |

## Enhancements

| ID | Title | Priority | Status | Phase | Detail |
|----|-------|----------|--------|-------|--------|
| ENH-001 | `/migrate` command for existing projects | P2 | resolved | phase-4 | Delivered in Phase 4 (v0.5.0) — gap detection, skip-if-exists fill, index reconciliation |
| ENH-002 | `/validate` command to check spec structure health | P2 | resolved | phase-4 | Delivered in Phase 4 (v0.5.0) — index-first default + `--deep` full scan flag |
| ENH-003 | `momentum init` should scaffold full specs/ skeleton + CLAUDE.md template | P1 | resolved | phase-3 | Delivered in Phase 3 (v0.4.0) — `core/specs-templates/` tree, recursive `copyDir()` with skip-if-exists |
| ENH-004 | Success message after `momentum init` suggests commands that immediately fail | P1 | resolved | phase-3 | Fixed in Phase 3 — success message now shows `/brainstorm-idea`, `/start-project`, `/brainstorm-phase` |
| ENH-005 | `start-phase.md` missing explicit history.md creation step | P2 | resolved | phase-3 | Fixed in Phase 3 — note added to step 3 |
| ENH-006 | `brainstorm-project.md` missing Group Execution Pattern documentation | P2 | resolved | phase-3 | Fixed in Phase 3 — command renamed to `start-project.md`; Group Execution Pattern section added |
| ENH-007 | `/track` command should auto-decide one-liner vs detail file | P2 | resolved | phase-3 | Fixed in Phase 3 — explicit decision criteria table added to `track.md` |
| ENH-008 | Reconsider `--coding-agent` flag name — term may not be the right abstraction | P2 | resolved | phase-5 | Renamed to `--agent` in Phase 5 (v0.6.0). Hard rename, no alias — old flag exits 1 with rename hint. |
| ENH-009 | Distribution strategy: npx vs native agent-ecosystem plugins vs both | P2 | open | unscheduled | [→](details/ENH-009.md) — still blocked on having ≥1 more adapter |
| ENH-010 | CLAUDE.md upgrade-safe architecture — `## Project Extensions` marker section | P1 | resolved | phase-5 | Delivered in Phase 5 (v0.6.0) — heading-based marker (chose over HTML comments); marker-aware `momentum upgrade` preserves project extensions |
| ENH-011 | Upstream Rule 10 (additive vs decisional spec changes) + Rule 11 (evaluator discipline) | P1 | resolved | phase-5 | Delivered in Phase 5 (v0.6.0) — Rule 10 marked `(monorepo only)`; Rule 11 mandates evaluator commit before loop |
| ENH-012 | Enhanced Rule 8 — meaningful change list, `[EVALUATOR]` + `[NOTE]` types, impact-map reminder | P2 | resolved | phase-5 | Delivered in Phase 5 (v0.6.0) — triggers list, `[EVALUATOR]` type, impact-map.json check, hook script reference |
| ENH-013 | Extended naming conventions — `infra:` commit type, SLA column, delete-branch row | P2 | resolved | phase-5 | Delivered in Phase 5 (v0.6.0) — `infra:` for CI/build/deploy, SLA per priority level, delete-after-merge convention |
| ENH-014 | Multi-repo support in Rule 9 — cross-repo doc sync safeguards | P2 | resolved | phase-6 | Delivered in Phase 6 (v0.7.0) — Rule 9 multi-repo block; `/sync-docs` partitions cross-repo `Affects-specs:` paths and surfaces them informationally |
| ENH-015 | Rule 12 — Verify Before Claim (universal, not TDD-specific) | P1 | resolved | phase-6 | Delivered in Phase 6 (v0.7.0) — full hardened version in CLAUDE.md template; condensed in agent-rules/project.md |
| ENH-016 | `/complete-phase` evidence rigor — capture validation output to retrospective.md | P1 | resolved | phase-6 | Delivered in Phase 6 (v0.7.0) — Step 3 captures stdout/stderr; Step 6 appends "Verification Evidence" section; Release section gated on evidence existing |
| ENH-017 | CLAUDE.md project-name customization survives `momentum upgrade` | P2 | open | unscheduled | Discovered in Phase 6 dogfood: title `# Project Rules: <Project Name>` lives in the managed section, so the user's customization (e.g., "momentum") is replaced on every upgrade. Need a mechanism — title-as-extension or a one-time-set placeholder substitution at install — that preserves the customization. Workaround today: re-edit title after each upgrade. |
| ENH-018 | Tarball-shape test — assert published npm artifact contains expected paths | P1 | resolved | phase-7b | Delivered in Phase 7b. `tests/tarball.test.js` runs `npm pack --dry-run --json`, asserts required Claude + Codex adapter paths, and blocks leaked repo/test/AppleDouble paths. `prepublishOnly` now runs `npm test`. |
| ENH-019 | GitHub Actions auto-publish on tag — `.github/workflows/release.yml` | P1 | open | phase-7b-or-standalone | Surfaced during Phase 7a v0.8.0 release: `npm publish` blocked on expired local npm session. Manual `npm login` per release is friction; also a single-point-of-failure (only the owner can release). Proposal: a GitHub Actions workflow triggered on `v*` tag push that runs `npm test`, runs the tarball-shape check (ENH-018), then `npm publish --access public` using an `NPM_TOKEN` secret. Pairs naturally with ENH-018 (tarball test runs in CI before publish). Side effect: makes "release from any machine" possible — push a tag from anywhere, CI publishes. |
| FEAT-011 | `momentum upgrade` subcommand — update commands + managed CLAUDE.md with `.bak` backups | P1 | resolved | phase-5 | Delivered in Phase 5 (v0.6.0) — marker-aware `upgradeMarkedFile`; four states (added/updated/unchanged/migrated); pre-marker projects auto-migrate with `.bak` |
| FEAT-012 | Adapter Contract v2 — overlay model for per-agent commands/rules/scripts | P1 | resolved | phase-6 | Delivered in Phase 6 (v0.7.0) — additive-only overlay; CLI walks `core/` then `adapters/<chosen>/`; conflict detection exits non-zero before any writes |
| FEAT-013 | `/review-code` command (Claude Code) — role-based subagent reviews | P1 | resolved | phase-6 | Delivered in Phase 6 (v0.7.0) — Claude-Code-only overlay; dispatches three parallel Task subagents (security/QA/architecture) returning Critical/Important/Minor findings |
| FEAT-014 | `tests/` directory for momentum CLI | P2 | resolved | phase-6 | Delivered in Phase 6 (v0.7.0) — 24 tests via Node `node:test`; covers install, upgrade, marker logic, overlay walk, conflict detection. `npm test` runs serially. |
| FEAT-015 | Adapter Contract v3 — runtime metadata for multi-agent compatibility | P1 | resolved | phase-7b | Delivered in Phase 7b. Adapters declare display name, destinations, primary instruction file, config/hook files, and capability flags. Core remains generic; agent-specific capabilities stay isolated in adapters. |
| FEAT-016 | Adapter: Codex (`AGENTS.md`, `.codex/hooks.json`, command recipes) | P1 | resolved | phase-7b | Delivered in Phase 7b. First non-Claude adapter. Installs Codex primary instructions, Codex hook config, generic specs/scripts, and Codex-owned command recipes via `momentum init/upgrade --agent codex`. |
| FEAT-017 | Cross-agent install/upgrade regression coverage | P1 | resolved | phase-7b | Delivered in Phase 7b. Tests prove Claude Code output remains unchanged while Codex install/upgrade works. Includes dynamic available-agent behavior and overlay conflict protection. |
