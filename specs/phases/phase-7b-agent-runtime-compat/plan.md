# Phase 7b — Agent Runtime Compatibility: Implementation Plan

```
Sequential: Group 0 → Group 1 → Group 2 → Group 3 → Group 4
```

Rationale: Group 0 freezes the adapter contract before CLI or adapter work. Group 1 makes the CLI capable of using the contract. Group 2 adds Codex. Group 3 proves behavior with tests and packaging. Group 4 completes tracking and release prep.

---

## Group 0 — Adapter Audit + Contract

**Sequential.** Blocks all implementation.
**Commit:** `docs(phase-7b): adapter runtime compatibility contract`

Tasks:
- Create `specs/phases/phase-7b-agent-runtime-compat/adapter-audit.md` with a Claude/Codex capability matrix and file classification.
- Update README Adapter Authors section for Adapter Contract v3:
  - Primary instruction file
  - Commands destination
  - Config/hook files
  - Capability flags
  - Rule: core generic, adapter-specific capabilities isolated in adapters
- Add FEAT-015/016/017 tracking to backlog.
- Mark Group 0 tasks complete after docs are written.

Verification:
- `grep -q "Adapter Contract v3" README.md`
- `grep -q "Codex" specs/phases/phase-7b-agent-runtime-compat/adapter-audit.md`

---

## Group 1 — CLI Adapter Plumbing

**Sequential.** Depends on Group 0.
**Commit:** `feat(cli): adapter contract v3 metadata and dynamic agents`

Tasks:
- Replace hard-coded available-agent messaging with dynamic adapter discovery.
- Extend adapter metadata with optional:
  - `displayName`
  - `primaryInstruction`
  - `configFiles`
  - `capabilities`
- Generalize root instruction install/upgrade so adapters can own `CLAUDE.md`, `AGENTS.md`, or future equivalents.
- Preserve current Claude install/upgrade behavior.

Verification:
- `node bin/momentum.js --help` lists `claude-code`.
- Unknown agent error lists available adapters dynamically.
- Existing install/upgrade tests pass for Claude.

---

## Group 2 — Codex Adapter

**Sequential.** Depends on Group 1.
**Commit:** `feat(adapter/codex): install AGENTS.md hooks and command recipes`

Tasks:
- Add `adapters/codex/adapter.js`.
- Add Codex-specific `AGENTS.md` with marker-aware project extensions.
- Add `.codex/hooks.json` wiring reusable scripts where verified.
- Add Codex command recipes under a Codex-owned command surface.
- Ensure `momentum init/upgrade --agent codex` installs specs, scripts, agent rules, Codex instructions, Codex commands, and Codex hooks.

Verification:
- Fresh Codex install contains `AGENTS.md`, `.codex/hooks.json`, Codex commands, `specs/status.md`, `scripts/check-history-reminder.sh`.
- Codex upgrade preserves the `## Project Extensions` block in `AGENTS.md`.

---

## Group 3 — Tests + Packaging

**Sequential.** Depends on Groups 1 and 2.
**Commit:** `test(adapter): codex install upgrade and tarball shape`

Tasks:
- Add Codex install/upgrade tests.
- Add Claude regression assertions for current output shape.
- Add tarball-shape test using `npm pack --dry-run --json`.
- Add `prepublishOnly` script running `npm test`.

Verification:
- `npm test` passes.
- Deliberate required-path coverage includes both `adapters/claude-code/` and `adapters/codex/`.

---

## Group 4 — Tracking + Release Prep

**Sequential.** Final group.
**Commit:** `chore(release): prepare v0.9.0 agent runtime compatibility`

Tasks:
- Bump `package.json` version to `0.9.0`.
- Update `specs/status.md`, roadmap, backlog, changelog, phase tasks/history.
- Capture verification evidence path in phase history.
- Stop before merge/tag/publish and ask for user approval.

Verification:
- `npm test` passes after release prep.
- `git status --short` contains only intended changes before final commit.
