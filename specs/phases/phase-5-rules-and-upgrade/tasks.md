# Phase 5 — Rules & Upgrade Safety: Tasks

> Mirrors `plan.md`. Mark `[x]` when complete, `[/]` when in progress.

## Group 0 — Template Foundation (Sequential)

- [x] 0a. Add `## Project Extensions` marker section to `core/specs-templates/CLAUDE.md`
- [x] 0b. Add `## Project Extensions` marker section to `core/agent-rules/project.md`
- [x] 0c. Add Rule 10 + Rule 11 stub headings to template
- [x] 0d. Update rule count references throughout template (9 → 11)
- [x] 0e. Add `[EVALUATOR]` to entry types table in Rule 8

## Group 1 — Rules Content & Hardening (Parallel with 2, 3)

- [x] 1a. Write Rule 10 body — additive vs decisional spec changes (monorepo only)
- [x] 1b. Write Rule 11 body — evaluator discipline / lock before loops
- [x] 1c. Expand Rule 8 — triggers list, `[EVALUATOR]`, impact-map.json reminder, hook script reference
- [x] 1d. Persuasion-harden Rule 2 (auto-update tracking) — Red Flags + ≥3 counters
- [x] 1e. Persuasion-harden Rule 6 (git lifecycle) — Red Flags + ≥3 counters
- [x] 1f. Persuasion-harden Rule 8 (history logging) — Red Flags + ≥3 counters
- [x] 1g. Persuasion-harden Rule 10 (architecture stability) — Red Flags + ≥3 counters
- [x] 1h. Persuasion-harden Rule 11 (evaluator discipline) — Red Flags + ≥3 counters
- [x] 1i. Add ENH-013 naming conventions: `infra:` commit type, SLA column, delete-branch row
- [x] 1j. Mirror all rule changes to `core/agent-rules/project.md`

## Group 2 — Upgrade-Safe CLI (Parallel with 1, 3)

- [x] 2a. Add `partitionByMarker(content)` helper
- [x] 2b. Marker-aware CLAUDE.md upgrade — replace managed, preserve extensions
- [x] 2c. Pre-marker fallback — backup + write fresh + append old content under marker
- [x] 2d. Apply same logic to `.agent/rules/project.md`
- [x] 2e. Update upgrade summary output with per-file states

## Group 3 — `--agent` Flag Rename (Parallel with 1, 2)

- [x] 3a. Rename flag parsing in `bin/momentum.js` (+ install.sh)
- [x] 3b. Update `--help` output
- [x] 3c. Update README install/upgrade examples
- [x] 3d. No `--coding-agent` refs in `core/commands/*.md` (verified by grep)
- [x] 3e. `adapters/claude-code/adapter.js` doesn't read the flag (verified)
- [x] 3f. No flag examples in `core/specs-templates/CLAUDE.md` to update

## Group 4 — Wiring & Dogfooding (Sequential)

- [x] 4a. Migrate momentum's own `CLAUDE.md` to marker format
- [x] 4b. Smoke test: `momentum init` against scratch dir — 11 rules + marker present
- [x] 4c. Smoke test: `momentum upgrade` preserves extensions byte-for-byte
- [x] 4d. Smoke test: pre-marker migration creates `.bak` + appends old content
- [x] 4e. Smoke test: `--coding-agent` flag exits 1 with rename message
- [x] 4f. Found + fixed mid-execution: `partitionByMarker` was lossy (stripped trailing whitespace) — rewrote as lossless slice; added missing marker section to `core/agent-rules/project.md`; removed double-marker concatenation in `upgradeMarkedFile`

## Group 5 — Release Verification (Sequential)

- [ ] 5a. Update `CHANGELOG.md` — v0.6.0 entry with "Breaking Changes" subsection
- [ ] 5b. Update `specs/status.md` — Phase 5 complete, v0.6.0 latest
- [ ] 5c. Update `specs/planning/roadmap.md` — Phase 5 complete, Phase 6 placeholder
- [ ] 5d. Update `README.md` — `--agent` everywhere, mention marker-based upgrade safety
- [ ] 5e. Run `/sync-docs`
- [ ] 5f. Run `/complete-phase` (handles tag + npm publish per Rule 9)
