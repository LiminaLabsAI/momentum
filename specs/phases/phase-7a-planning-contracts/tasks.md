# Phase 7a — Tasks

## Group 0 — Contracts

- [x] Author Brainstorm Gate Contract text (sentinel lifecycle, gate marker, red-flag table, approval phrasing)
- [x] Author Autonomous Execution Contract text (hard stop, discretionary stop, pre-authorized actions, anti-patterns)
- [x] Define PreToolUse hook contract (tools matched, paths matched, exit codes, stderr message)
- [x] Group 0 commit: `docs(phase-7a): author brainstorm-gate and autonomy contracts` (commit `1058592`)

## Group 1 — Brainstorm command hardening (parallel with Group 2)

- [x] Update `core/commands/brainstorm-phase.md` — Step 0 sentinel; Step 6 in-conversation only; Step 8 sentinel removal + write; Gate Contract section; red-flag table
- [x] Update `core/commands/brainstorm-idea.md` — same pattern adapted for idea-exploration flow
- [x] Update `core/commands/start-project.md` — same pattern adapted for scaffold-from-idea flow
- [x] Verified no overlay duplicates in `adapters/claude-code/commands/` (only `review-code.md` lives there)
- [x] Group 1 commit: `feat(commands): brainstorm write-gate discipline across planning commands` (commit `a64ff0f`)

## Group 2 — Hook + sentinel + .gitignore (parallel with Group 1)

- [x] Create `adapters/claude-code/scripts/brainstorm-gate.sh` (bash, jq with regex fallback, fail-open on env/parse errors)
- [x] `chmod +x` the script
- [x] Register PreToolUse hook in `adapters/claude-code/settings.json` (PostToolUse history-reminder preserved)
- [x] Root `.gitignore` (`._*`, `.DS_Store`, `.momentum/`, `node_modules/`, `*.log`) — pulled forward to commit `3943d3a` (hygiene commit) after AppleDouble files leaked into the brainstorm commit
- [x] `core/specs-templates/.gitignore` (same content) — also in commit `3943d3a`
- [x] `package.json` `files` field verified — `adapters/**/scripts/**` already ships scripts
- [x] Smoke test: 6 scenarios via direct hook invocation — all pass
- [x] Group 2 commit: `feat(claude-code): brainstorm-gate PreToolUse hook` (commit `65151fd`)

## Group 3 — /start-phase autonomy contract

- [x] Rewrite `core/commands/start-phase.md` with `## Autonomous Execution Contract` section
- [x] Cross-references to Rule 6 (Git Lifecycle), Rule 8 (History), Rule 12 (Verify Before Claim) included
- [x] Anti-pattern table embedded ("DO NOT ask 'should I commit Group N now?'" etc.)
- [x] New "After Setup: Execute the Plan Autonomously" section with per-group execution loop
- [x] Verified no overlay duplicate at `adapters/claude-code/commands/start-phase.md`
- [x] Group 3 commit: `feat(commands): start-phase autonomous-execution contract` (commit `3c556fc`)

## Group 4 — Tests + dogfood verification

- [x] Create `tests/brainstorm-gate.test.js` — 10 tests (Scenarios A/B/C/D plus Edit/MultiEdit/fail-open variants)
- [x] Create `tests/start-phase-contract.test.js` — 7 tests asserting all required contract sections present
- [x] Create `tests/command-gates.test.js` — 17 tests (5 × 3 commands + 2 settings.json sanity tests)
- [x] Test glob fix: `package.json` test script `tests/` → `tests/*.test.js` so macOS AppleDouble `._*.test.js` no longer load as tests
- [x] Run `npm test` — **58/58 pass, 0 fail** (24 existing + 34 new)
- [x] Manual dogfood completed during Group 2 (6 hook scenarios via direct invocation)
- [x] Group 4 commit: `test(phase-7a): brainstorm gate + autonomy contract coverage (58/58)` (commit `b46cb51`)

## Group 5 — Roadmap + STOP for merge/release

- [x] Update `specs/planning/roadmap.md` (Timeline + Dependencies + Milestones sections — Phase 7 split into 7a/7b/7c; downstream phases renumbered)
- [x] Update `specs/changelog/2026-05.md` with phase completion entry
- [x] Update `specs/phases/phase-7a-planning-contracts/{tasks,history}.md` final state
- [ ] **STOP — await user approval for merge + release** (per Autonomous Execution Contract: this is the single hard stop)
- [ ] On approval: `/complete-phase` → retrospective + merge `phase-7a-planning-contracts` → `staging` → `main`, tag `v0.8.0`
- [ ] On approval: `npm publish --access public` (project-specific rule — explicit OK required)
