# Phase 4 — Enhanced Commands: Tasks

> Execution order: Group 0 → Group 1 → (Groups 2 + 3 in parallel) → Group 4

---

## Group 0 — Upgrade Infrastructure

- [x] Add `upgradeMode` to `copyDir()` in `bin/momentum.js` (backup + overwrite if different, add if missing, skip silently if identical)
- [x] Scaffold `upgrade()` function in `bin/momentum.js` (upgrades commands, agent-rules, scripts, delegates to adapter)
- [x] Wire `upgrade` subcommand in CLI entry point with optional path arg (default: CWD)
- [x] Update `--help` output to include `upgrade [path]` subcommand
- [x] Commit: `feat(cli): add upgradeMode to copyDir and scaffold upgrade() function`

---

## Group 1 — Claude Code Adapter: runUpgrade()

- [x] Add `runUpgrade()` to `adapters/claude-code/adapter.js` (backup + overwrite `.claude/settings.json`)
- [x] Commit: `feat(adapters): add runUpgrade() to claude-code adapter`

---

## Group 2 — `/validate` Command (parallel with Group 3)

- [x] Write `core/commands/validate.md` — default mode (index-first, steps 1–6)
- [x] Write `core/commands/validate.md` — `--deep` flag section (steps 7–10: full walk, backlog ID cross-reference, history field check, changelog check)
- [x] ~~Register `validate` in `adapters/claude-code/settings.json`~~ — N/A: commands auto-installed via copyDir; no registration needed
- [x] Commit: `docs(commands): add validate and migrate slash commands`

---

## Group 3 — `/migrate` Command (parallel with Group 2)

- [x] Write `core/commands/migrate.md` — gap detection step
- [x] Write `core/commands/migrate.md` — gap report + user confirmation step
- [x] Write `core/commands/migrate.md` — fill gaps (skip-if-exists) step
- [x] Write `core/commands/migrate.md` — phase index reconciliation step
- [x] Write `core/commands/migrate.md` — result report step
- [x] ~~Register `migrate` in `adapters/claude-code/settings.json`~~ — N/A: commands auto-installed via copyDir; no registration needed
- [x] Commit: `docs(commands): add validate and migrate slash commands`

---

## Group 4 — Verification + Release

- [x] Smoke test: upgrade backs up modified command file (`.bak` created, file overwritten)
- [x] Smoke test: upgrade adds new file (removed file reappears after upgrade)
- [x] Smoke test: upgrade with no changes runs silently (no spurious output)
- [x] Read-check: `validate.md` has default mode steps + `--deep` section
- [x] Read-check: `migrate.md` has all 5 steps including confirmation + index reconciliation
- [x] ~~Verify: `settings.json` contains validate/migrate~~ — N/A: no registration in settings.json
- [x] Bump version to `0.5.0` in `package.json`
- [x] `npm pack --dry-run` — `validate.md` and `migrate.md` confirmed included
- [ ] Commit: `chore: verify Phase 4 enhanced commands; bump to v0.5.0`
