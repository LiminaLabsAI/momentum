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

## Group 2 — Lifecycle head: brainstorm + start *(∥ G1)* ✅
- [x] `/brainstorm-initiative` — mirror of `/brainstorm-phase` incl. the gate contract
- [x] Gate: `.momentum/brainstorm-active` at ecosystem root; zero disk writes pre-approval
- [x] Elicit: objective, members, edges, non-goals, completion acceptance criteria; orients across the fleet first (reads each member's status + P0/P1 backlog — the miss that let one session rewrite code already covered by BUG-001)
- [x] `initiative start <slug>` wired as a real CLI subcommand (was `create`-only)
- [x] `--contribute <member>:<kind>:<ref>` declares per-member work records
- [x] Write `Per-repo contributions` table from the declaration — **closes TD-011 for that section**; other body sections proven byte-untouched by test
- [x] **Register dependency edges in `ecosystem.json`** via `--edge <from>:<to>:<kind>` — the first code in momentum's history to write one; tagged with the initiative that discovered it
- [x] Set active via the 30e attributed fragment (falls back to legacy `.state/`)
- [x] Refuse-not-overwrite: silently repointing a member's contribution is rejected (it would orphan the evidence trail the completion gate depends on); idempotent re-run adds no duplicates
- [x] Refuses closed initiatives, unknown members, non-participating members, malformed/self-referential/bad-kind edges, and an invalid resulting manifest
- [x] **Never writes into a member repo** — asserted by test. `start` declares and routes; each member's own `/start-phase`/`/hotfix` scaffolds, honoring the same ownership boundary `/sync-docs` enforces
- [x] `parseFlags` gained an additive `list` type for repeatable flags
- [x] Routing prose updated in the member pointer + both ecosystem instruction templates — labelled **convention, not enforcement** (D8)
- [x] Verify `npm test` green — **1069/1069** (+41 from 1028); commit G2

## Group 3 — Lifecycle tail: completion gate *(needs G2)* ✅
- [x] `/complete-initiative <slug>` recipe — mirror of `/complete-phase`
- [x] `momentum ecosystem initiative complete <slug> [--dry-run] [--skip-verify]`
- [x] Cross-repo Rule 12 evidence gate **reusing `land.js`'s `evidenceSection`** (exported for this) — two graders that drift would let work pass one gate and fail the other
- [x] `integration_verify_command` run when declared; **explicit "NOT DECLARED" gap notice** when absent (never a silent pass, D6)
- [x] `--skip-verify` does NOT buy a pass on a declared check
- [x] On pass: populate `Close` + `Deploy chronology` from recorded git events, `status: closed` + `closed:`, clear the active fragment
- [x] Failure output names the member and the reason
- [x] Test: **refusal path** when a member lacks evidence (**AC-3**)
- [x] Test: declared-but-failing integration verify blocks, and its output is shown
- [x] Test: empty `## Verification Evidence` section refuses; no-contributions refuses; re-close refuses
- [x] Test: a member with **no local checkout blocks** rather than silently passing
- [x] **Fixed a real defect found here**: `process.exit(exitCode)` in bin/momentum.js zeroed any `process.exitCode` set by a non-throwing command — the gate printed REFUSED and exited 0. Now `exitCode || process.exitCode || 0`
- [x] Verify `npm test` green — **1080/1080** (+52 from 1028); commit G3

## Group 4 — Record writers + adapter parity *(needs G1 + G3)* ✅
- [x] **Deploy chronology writer** — `tag`/`merge` events for contributing members; a `tag` event is now recorded by `pre-push` on a release-tag push (git has no post-tag hook, and a tag means nothing until pushed, so the push IS the release moment)
- [x] **Linked-decisions writer** — scans each contributing member's `specs/decisions/` for the opt-in `initiative: <slug>` frontmatter stamp; ignores unstamped and other-initiative ADRs (asserted); empty state explains HOW to populate rather than sitting blank
- [x] **TD-011 fully closed** — all three dead template sections now have writers
- [x] 2 new recipes projected to all 4 adapters by the ADR-0011 generator (no wiring needed)
- [x] Added both to `ROOT_SURFACE_COMMANDS` (`ensureRootCommandSurface`) — the coordination root is where they're run; advertising them without shipping them would reproduce the ENH-049 failure mode
- [x] `/initiative` recipe documents the full lifecycle + the ADR stamp convention
- [x] 4 fingerprints re-baselined (drift inspected via `--check` each time)
- [x] `momentum okf check` — **311 files conformant**; fixed a pre-existing Phase-29 violation (`evidence/self-repo-dogfood.md` missing frontmatter, landed in `9bfd5fd`, untouched by this branch)
- [x] Verify `npm test` green — **1083/1083** (+55 from 1028); commit G4

## Group 5 — Verification & release prep *(last)*
- [ ] Two-clone multi-repo e2e: brainstorm → start → worktree commits → complete
- [ ] Assert every acceptance criterion incl. zero-conflict concurrent merge
- [ ] Full suite 1028 + net-new green; **236 swarm tests green**
- [ ] No-ecosystem / single-machine byte-unchanged
- [ ] Self-repo dogfood against a real cross-repo change (not synthetic — Phase 20 lesson)
- [ ] Capture evidence under `evidence/`
- [ ] `/sync-docs` → retrospective → `/complete-phase` at the operator gate
