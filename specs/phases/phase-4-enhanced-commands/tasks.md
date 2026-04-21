# Phase 4 — Enhanced Commands: Tasks

> Execution order: Group 0 → Group 1 → (Groups 2 + 3 in parallel) → Group 4

---

## Group 0 — Upgrade Infrastructure

- [ ] Add `upgradeMode` to `copyDir()` in `bin/momentum.js` (backup + overwrite if different, add if missing, skip silently if identical)
- [ ] Scaffold `upgrade()` function in `bin/momentum.js` (upgrades commands, agent-rules, scripts, delegates to adapter)
- [ ] Wire `upgrade` subcommand in CLI entry point with optional path arg (default: CWD)
- [ ] Update `--help` output to include `upgrade [path]` subcommand
- [ ] Commit: `feat(cli): add upgradeMode to copyDir and scaffold upgrade() function`

---

## Group 1 — Claude Code Adapter: runUpgrade()

- [ ] Add `runUpgrade()` to `adapters/claude-code/adapter.js` (backup + overwrite `.claude/settings.json`)
- [ ] Commit: `feat(adapters): add runUpgrade() to claude-code adapter`

---

## Group 2 — `/validate` Command (parallel with Group 3)

- [ ] Write `core/commands/validate.md` — default mode (index-first, steps 1–6)
- [ ] Write `core/commands/validate.md` — `--deep` flag section (steps 7–10: full walk, backlog ID cross-reference, history field check, changelog check)
- [ ] Register `validate` in `adapters/claude-code/settings.json`
- [ ] Commit: `docs(commands): add validate slash command`

---

## Group 3 — `/migrate` Command (parallel with Group 2)

- [ ] Write `core/commands/migrate.md` — gap detection step
- [ ] Write `core/commands/migrate.md` — gap report + user confirmation step
- [ ] Write `core/commands/migrate.md` — fill gaps (skip-if-exists) step
- [ ] Write `core/commands/migrate.md` — phase index reconciliation step
- [ ] Write `core/commands/migrate.md` — result report step
- [ ] Register `migrate` in `adapters/claude-code/settings.json`
- [ ] Commit: `docs(commands): add migrate slash command`

---

## Group 4 — Verification + Release

- [ ] Smoke test: upgrade backs up modified command file (`.bak` created, file overwritten)
- [ ] Smoke test: upgrade adds new file (removed file reappears after upgrade)
- [ ] Smoke test: upgrade with no changes runs silently (no spurious output)
- [ ] Read-check: `validate.md` has default mode steps + `--deep` section
- [ ] Read-check: `migrate.md` has all 5 steps including confirmation + index reconciliation
- [ ] Verify: `cat adapters/claude-code/settings.json | grep -E '"validate"|"migrate"'` — both present
- [ ] Bump version to `0.5.0` in `package.json`
- [ ] Run `npm pack --dry-run` — confirm `validate.md` and `migrate.md` included, no unexpected files
- [ ] Commit: `chore: verify Phase 4 enhanced commands; bump to v0.5.0`
