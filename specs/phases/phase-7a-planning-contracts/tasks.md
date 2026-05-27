# Phase 7a — Tasks

## Group 0 — Contracts

- [ ] Author Brainstorm Gate Contract text (sentinel lifecycle, gate marker, red-flag table, approval phrasing)
- [ ] Author Autonomous Execution Contract text (hard stop, discretionary stop, pre-authorized actions, anti-patterns)
- [ ] Define PreToolUse hook contract (tools matched, paths matched, exit codes, stderr message)
- [ ] Group 0 commit: `docs(phase-7a): author brainstorm-gate and autonomy contracts`

## Group 1 — Brainstorm command hardening (parallel with Group 2)

- [ ] Update `core/commands/brainstorm-phase.md` — Steps 6, 6.5, 8 + Gate Contract section + red-flag table
- [ ] Update `core/commands/brainstorm-idea.md` — same pattern adapted
- [ ] Update `core/commands/start-project.md` — same pattern adapted
- [ ] Verify no overlay duplicates in `adapters/claude-code/commands/` for these files
- [ ] Group 1 commit: `feat(commands): brainstorm write-gate discipline across planning commands`

## Group 2 — Hook + sentinel + .gitignore (parallel with Group 1)

- [ ] Create `adapters/claude-code/scripts/brainstorm-gate.sh` (bash, reads hook JSON stdin)
- [ ] `chmod +x` the script
- [ ] Register PreToolUse hook in `adapters/claude-code/settings.json`
- [ ] Create root `.gitignore` (`._*`, `.DS_Store`, `.momentum/`, `node_modules/`, `*.log`)
- [ ] Create `core/specs-templates/.gitignore` (same content)
- [ ] Verify `package.json` `files` field still ships the new template `.gitignore`
- [ ] Group 2 commit: `feat(claude-code): brainstorm-gate PreToolUse hook + .gitignore hygiene`

## Group 3 — /start-phase autonomy contract

- [ ] Rewrite `core/commands/start-phase.md` with `## Autonomous Execution Contract` section
- [ ] Cross-reference Rule 6 (Git Lifecycle), Rule 8 (History), Rule 12 (Verify Before Claim)
- [ ] Add anti-pattern callouts ("DO NOT ask 'should I commit?' between groups")
- [ ] Verify no overlay duplicate at `adapters/claude-code/commands/start-phase.md`
- [ ] Group 3 commit: `feat(commands): start-phase autonomous-execution contract`

## Group 4 — Tests + dogfood verification

- [ ] Create `tests/brainstorm-gate.test.js` (Scenarios A/B/C/D)
- [ ] Create `tests/start-phase-contract.test.js`
- [ ] Create `tests/command-gates.test.js`
- [ ] Run `npm test` — capture stdout/stderr for retrospective evidence
- [ ] Manual dogfood: scratch dir, simulated hook input, verify exit codes
- [ ] Group 4 commit: `test(phase-7a): brainstorm gate + autonomy contract coverage`

## Group 5 — Roadmap + stop for merge/release

- [ ] Update `specs/planning/roadmap.md` (split Phase 7 row)
- [ ] Update `specs/changelog/2026-05.md` (or current month)
- [ ] **STOP**: ask user to approve merge + release
- [ ] On approval: `/complete-phase`
- [ ] On approval: `npm publish --access public`
