---
type: Tasks
status: in-progress
---

# Phase 31a — Ecosystem Lifecycle Spine — Tasks

> Mirrors `plan.md`. `[x]` done · `[/]` in-progress · `[ ]` todo. Verify before
> claiming done (Rule 12). Execution: G0 → (G1 ∥ G2) → G3 → G4 → G5.
> Closes BUG-028 + ENH-066/067/068. Target v0.40.0.
> Lane `phase-31a-ecosystem-lifecycle-spine`.

## Group 0 — Contracts, BUG-028, backlog intake *(blocks)* ✅
- [x] Author **ADR-0016** — Ecosystem Lifecycle Spine (D1–D8)
- [x] Ecosystem config surface + `integration_verify_command` registered — `ecosystem.json` `config{}` (the root has no `specs/`, so `specs/config.md` is unavailable); `readEcosystemConfig()` returns `null` when undeclared, never a fabricated default
- [x] Initiative frontmatter extension — `contributions[]`, back-compatible
- [x] **BUG-028** — `adapters/claude-code/settings.json` PostToolUse `Edit|Write` → `Edit|Write|Bash`; self-repo `.claude/settings.json` dogfooded too
- [x] Regression test `tests/hook-matcher-reachability.test.js` — reads the INSTALLED config, asserts every `$TOOL_NAME = "X"` guard is deliverable by that adapter's matcher (claude-code + codex), plus an opencode plugin-dispatch assertion
- [x] Demonstrate the new test **fails pre-fix** (2 failures, exact diagnostic), passes post-fix — evidence captured
- [x] Re-baseline claude-code fingerprint — `--check` first proved drift = exactly `.claude/settings.json`, other 3 adapters zero drift
- [x] File backlog: BUG-028, ENH-066 (lifecycle), ENH-067 (fleet orient), ENH-068 (dep-ordered landing), TD-011 (records without writers) — filed 2026-07-26 at brainstorm (Rule 3)
- [x] Verify `npm test` green — **1046/1046** (+18 net-new from 1028); commit G0

## Group 1 — Git-native event write path *(∥ G2)* ✅
- [x] `post-commit` hook → attributed event fragment (`core/team/lib/fragments`)
- [x] `post-merge` hook (captures forge-side merges on next local integration)
- [x] Member resolution via `git rev-parse --git-common-dir` (replaces `$PWD` matching)
- [x] `sessions/` compiled from fragments (`momentum ecosystem sessions [--date] [--write]`); legacy `session-append.sh` untouched
- [x] Event kinds `commit` / `merge` / `tag`; attribution via `core/identity`
- [x] Hook budget — **measured ~35ms marginal** (85ms vs 50ms bypassed baseline; 629ms cold first run); fail-open on every path, never blocks a commit
- [x] Test: commit from a **lane worktree outside `members[].path`** lands in the log (**AC-1**)
- [x] Test: no-ecosystem / non-repo / unregistered-repo are silent no-ops
- [x] **E2E through the real git hook** — `momentum init` wires it, a plain `git commit` records, nothing invoked by hand (the test shape whose absence let BUG-028 ship)
- [x] Test: `MOMENTUM_SKIP_HOOKS=1` suppresses capture, like every other momentum hook
- [x] **Parity fence** — hook-side writer vs `core/team/lib/fragments` (byte-identical), `core/identity` slug, and `core/ecosystem/lib/events` member resolution
- [x] Caught pre-ship: `eco-event.js` failed `installHookFiles`' momentum-ownership check → would have installed once and never upgraded (BUG-011 class); ownership marker added + guarded by test
- [x] Self-repo `.githooks/` mirrored (dual-maintenance parity I2); 4 fingerprints re-baselined after `--check` showed exactly the intended 4-file drift
- [x] Verify `npm test` green — **1058/1058** (+30 from 1028); commit G1

## Group 2 — Lifecycle head: brainstorm + start *(∥ G1)*
- [ ] `/brainstorm-initiative` — mirror of `/brainstorm-phase` incl. the gate contract
- [ ] Gate: `.momentum/brainstorm-active` at ecosystem root; zero disk writes pre-approval
- [ ] Elicit: objective, members, edges, non-goals, completion acceptance criteria
- [ ] `initiative start <slug>` — fan-out creating/linking per-member phase or ad-hoc records
- [ ] Stamp each member record with `initiative: <slug>`
- [ ] Write `Per-repo contributions` from the fan-out result
- [ ] **Register dependency edges in `ecosystem.json`** (first writer ever)
- [ ] Set active via the 30e attributed fragment
- [ ] Refuse-not-overwrite on re-run
- [ ] Routing prose added to rules — labelled **agent-convention**, not enforced (D8)
- [ ] Verify `npm test` green; commit G2

## Group 3 — Lifecycle tail: completion gate *(needs G2)*
- [ ] `/complete-initiative <slug>` — mirror of `/complete-phase`
- [ ] Cross-repo Rule 12 evidence gate, reusing the `lanes land` evidence reader
- [ ] `integration_verify_command` run when declared; **explicit "not declared" output** when absent
- [ ] On pass: populate `Close`, finalize chronology, `status: closed` + `closed:`, clear active
- [ ] Failure output names the member and the reason
- [ ] Test: **refusal path** when a member lacks fresh evidence (AC-3)
- [ ] Test: declared-but-failing integration verify blocks
- [ ] Verify `npm test` green; commit G3

## Group 4 — Record writers + adapter parity *(needs G1 + G3)*
- [ ] Deploy chronology writer consuming `tag` events
- [ ] Linked-decisions writer (member ADR carrying `initiative:` stamp)
- [ ] Project 3 new commands to all 4 adapters via ADR-0011 projection
- [ ] Install into ecosystem root surface via `ensureRootCommandSurface()`
- [ ] Re-baseline 4 fingerprints via `scripts/rebaseline-fingerprints.js` (zero-drift proven first)
- [ ] `momentum okf check` bundle conformant
- [ ] Verify `npm test` green; commit G4

## Group 5 — Verification & release prep *(last)*
- [ ] Two-clone multi-repo e2e: brainstorm → start → worktree commits → complete
- [ ] Assert every acceptance criterion incl. zero-conflict concurrent merge
- [ ] Full suite 1028 + net-new green; **236 swarm tests green**
- [ ] No-ecosystem / single-machine byte-unchanged
- [ ] Self-repo dogfood against a real cross-repo change (not synthetic — Phase 20 lesson)
- [ ] Capture evidence under `evidence/`
- [ ] `/sync-docs` → retrospective → `/complete-phase` at the operator gate
