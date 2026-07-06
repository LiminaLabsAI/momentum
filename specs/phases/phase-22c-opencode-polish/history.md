# Phase 22c History

## Entry Types
| Type | When |
|------|------|
| `[DECISION]` | ADR created or status/decision changed |
| `[SCOPE_CHANGE]` | Phase scope added to or reduced |
| `[DISCOVERY]` | Bug, tech debt, or enhancement added to backlog |
| `[FEATURE]` | New feature added to phase plan |
| `[ARCH_CHANGE]` | Architectural pattern or integration approach changed |
| `[EVALUATOR]` | Locked evaluator defined or evaluation set changed |
| `[NOTE]` | Anything else worth a future reader's time |

---

### [DECISION] 2026-07-06 — Phase 22c Started: Opencode Polish & Multi-Adapter Support
**Topics**: multi-adapter, installed-json, opencode, bug-020
**Affects-phases**: phase-22c-opencode-polish
**Affects-specs**: specs/decisions/0007-multi-adapter-installed-state.md, bin/momentum.js, adapters/opencode/

**Detail**: Phase 22c addresses BUG-020 (P1) — `momentum upgrade --agent <X>` destroys other adapter's managed files because `installed.json` has a single `agent` lock field. The fix restructures `installed.json` to per-agent manifests (`agents` map) with one-time migration. Also adds three opencode skills (`momentum-track`, `momentum-lanes`, `momentum-validate`), wires ecosystem session log in plugin, and documents run-mode sessionStartHook limitation. This enables true multi-adapter coexistence (claude-code + opencode + codex simultaneously).

---

### [DECISION] 2026-07-06 — ADR-0007 Approach: Option A File Tracking
**Topics**: installed-json, orphan-cleanup, file-tracking
**Affects-phases**: phase-22c-opencode-polish
**Affects-specs**: bin/momentum.js, specs/decisions/0007-multi-adapter-installed-state.md

**Detail**: Chose Option A for per-agent `files` array — tracks only momentum-owned files (what momentum actually wrote), not all files in destination directories. This prevents orphan cleanup from removing user additions to `.claude/commands/` or `.opencode/commands/`. The manifest represents "what momentum owns for this agent," not "what's in the directory."

---

### [SCOPE_CHANGE] 2026-07-06 — A4 Live Swarm Validation Deferred
**Topics**: swarm, validation, opencode
**Affects-phases**: phase-22c-opencode-polish
**Affects-specs**: specs/phases/phase-22c-opencode-polish/overview.md

**Detail**: Live swarm validation (A4) moved to Group 4 (deferred, operator-driven). Requires opencode CLI + 2+ ecosystem repos available in operator's environment. Not blocking for phase completion.

---

### [NOTE] 2026-07-06 — G3+G4 Complete: Verification Script + Live Swarm Validation
**Topics**: verification, multi-adapter, swarm, opencode
**Affects-phases**: phase-22c-opencode-polish
**Affects-specs**: scripts/verify-multi-adapter.sh, specs/adhoc/val-opencode-swarm-live/record.md
**Detail**: Created `scripts/verify-multi-adapter.sh` — automated verification of BUG-020 fix (init claude-code → upgrade opencode → verify both survive → upgrade claude-code → verify both survive, 6/6 pass). Ran live swarm validation against a synthetic ecosystem (eco + 2 opencode members): ecosystem init, add members, scout, dispatch, status all working via momentum CLI. Evidence recorded at `specs/adhoc/val-opencode-swarm-live/record.md`.

---

### [NOTE] 2026-07-06 — A3 Run-Mode Docs: surfaces.md plugin caveat + AGENTS.md regenerated
**Topics**: opencode, run-mode, surfaces, plugin
**Affects-phases**: phase-22c-opencode-polish
**Affects-specs**: adapters/opencode/instructions/surfaces.md, adapters/opencode/instructions/AGENTS.md
**Detail**: Added the run-mode sessionStartHook caveat to the Plugin hook table in `surfaces.md` — the `event (session.created)` handler is registered only in TUI/serve sessions; in `opencode run` (headless/non-interactive) it is skipped because its mere presence hangs `opencode run` on 1.17.x. Ran `npm run generate-instructions` to regenerate the built `AGENTS.md`. Re-snapshotted opencode fingerprint fixture after the 3 new skills were detected. Suite 819/819 green.

---

### [FEATURE] 2026-07-06 — BUG-020 Fixed: Multi-Adapter Installed State
**Topics**: multi-adapter, installed-json, bug-020, migration, orphan-cleanup
**Affects-phases**: phase-22c-opencode-polish
**Affects-specs**: bin/momentum.js, bin/state-commands.js, specs/status.md, specs/phases/phase-22c-opencode-polish/tasks.md

**Detail**: Implemented the ADR-0007 schema change: `installed.json` now uses per-agent `agents` map instead of a single `agent` lock. `loadInstalledState()` detects legacy format (`agent` at root, no `agents`) and one-way migrates to `{ version, agents: { [name]: { version, files } } }`. `saveInstalledState()` writes the new format. `writeInstalledManifest()` updates only the specified agent's entry, preserving all others. `upgrade()` scopes orphan cleanup to the upgraded agent's prior files only — other agents' files are never eligible. `init()` adds to the agents map without removing other agents. `doctor` command updated to read new format. Three new opencode skills created (`momentum-track`, `momentum-lanes`, `momentum-validate`). Migration tests (5) and multi-adapter upgrade tests (5) all green. Full suite 819/819 green.

---