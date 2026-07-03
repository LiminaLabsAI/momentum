# Lane A (G2) — Trial Session Report

> Captured verbatim by the conductor from the Lane A agent session's final
> report (2026-07-03). Lane A ran in worktree `.claude/worktrees/lane-a` on
> branch `phase-21a-lanes-walk-g2`, concurrently with Lane B.

## Timing
- **Start:** 00:39:00 — **End:** 01:29:54 — **Total: ~51 minutes** wall-clock (includes one session stall/reconnect, the BUG-012 investigation, and two full suite runs)
- **Tracking-file updates (contention-overhead metric): ~4 minutes total** — Step 3 block 01:28:00→01:29:40 (~2 min for tasks.md + status.md + history.md + changelog, including re-reads forced by a file-state reset after the interruption) + ~2 min earlier for the BUG-012 backlog append.

## Phase resolution (Step 0 evidence)
- Branch: `phase-21a-lanes-walk-g2` (confirmed via `git branch --show-current` in the worktree; tree clean at start).
- **Mechanism: status.md fallback**, confirmed independently: `specs/phases/phase-21a-lanes-walk-g2/` does not exist; only `specs/phases/phase-21a-lanes-walk/` does → per Rule 15 the binding falls back to the status.md Active Phase table → **phase-21a-lanes-walk**, and my lane owns only the G2 section/row.
- Mechanical resolver output, verbatim:

> HISTORY REMINDER: 'specs/status.md' was modified — if this reflects a decision, scope change, or discovery, append an entry to the active phase history (specs/phases/phase-21a-lanes-walk/history.md — resolved from the status.md Active Phase table; the current branch does not bind to a phase directory).

## Files changed (13 committed)
Templates/adapters (5): `core/specs-templates/CLAUDE.md` (Rule 15 full section after Rule 14; Rules 2/4/5/8 lane-scoped; Rule 6 "Landing Order — Concurrent Lanes (Rule 15)" subsection; Rule 15 at L351 vs `## Project Extensions` marker at L459 — genericity grep clean), `core/specs-templates/specs/status.md` (multi-row lane board + none-row placeholder), `core/agent-rules/project.md` (condensed Rule 15 + lane-scoped Rules 2/8), `adapters/codex/instructions/AGENTS.md` (3 surgical edits: /log table row, hook description, numbered rule 8), `adapters/antigravity/instructions/AGENTS.md` (2 surgical edits: hook description, numbered rule 8).
Fingerprints (3): `tests/fixtures/v0.18.0-claude-code-fingerprint.json`, `v0.20.4-codex-fingerprint.json`, `v0.20.4-antigravity-fingerprint.json`.
Tracking (5): `specs/phases/phase-21a-lanes-walk/tasks.md`, `specs/status.md`, `.../history.md`, `specs/changelog/2026-07.md`, **+ `specs/backlog/backlog.md`** (deviation from the brief's 4-file list — Rule 3 required filing BUG-012 immediately).
Uncommitted environment-only: `chmod +x` on 7 scripts (invisible to git under `core.fileMode=false`).

## Verification (Rule 12)
- First `npm test`: 5 failures — 3 expected fingerprint drifts **+ 2 unexpected** (see discovery below); the 2 were fixed before proceeding, per brief.
- Fingerprint preview (no `--write`): drift per adapter = **only** primary instruction file + `.agent/rules/project.md` + `specs/status.md` (claude-code 53→53, codex 57→57, antigravity 58→58 files). Re-baselined ×3 with the specified note.
- Final suite: **tests 651, pass 651, fail 0** (30.3s). Tail includes the upgrade-marker tests green ("AGENTS.md preserves Project Extensions byte-for-byte" ×2) — the Step 1e upgrade-path check verified by the actual suite.

## Discovery — BUG-012 (filed P1)
The 2 unexpected failures were **not my edits and not load flake** (coordinator's flake hypothesis checked and ruled out — still red in isolation, deterministic): 7 shipped scripts (`brainstorm-gate.sh`, `sessionstart-handoff.sh`, `session-append.sh` in core + `scripts/` mirrors, `adapters/claude-code/adapter.sh`) are **committed mode 100644**; `core.fileMode=false` + never-committed local exec bits mask it in the primary tree, so **every fresh clone/CI/lane worktree gets 2 red tests out of the box** — directly relevant to the lanes trial itself. Causal chain verified: `check-history-reminder.sh:83-85` execs `session-append.sh` → silent no-op → `sessions.length` 0. Fixed in-lane via `chmod +x` (23/23 green in isolation after); filed as BUG-012 + [DISCOVERY] history entry.

## Tracking updates — lane-scoped: YES
tasks.md: only Group 2 boxes → `[x]` with evidence notes. status.md: verified via `git show` — diff is exactly one line, my own row (`pending` → `done — awaiting landing`). history.md: two appended entries ([DISCOVERY] + [FEATURE]), append-only. changelog: one bullet appended at end of the 2026-07-03 section, nothing reordered. backlog: one row appended. **No other lane's row/section touched anywhere.**

## Confusion/misorientation events: 0 true misorientations
Phase/branch/file ownership was unambiguous throughout. Honest near-misses: (1) the BUG-012 investigation was a ~15-min detour deciding "my edits vs pre-existing" — resolved with evidence, but it's real per-lane overhead every fresh worktree will pay until BUG-012 is fixed; (2) the coordinator's post-reconnect "ground truth" was slightly stale (said tracking untouched when backlog.md was already edited) — no wrong action resulted; (3) the interruption reset file-read state, forcing two re-reads (~1 min).

## Commit
**`2d65e752a09bd0ab6cb58410082a53b65bc64de1`** — `feat(templates): multi-lane spec conventions` (13 files, +152/−37; commit-msg hook passed; TD-006 evidence churn left unstaged; **not pushed**, per guardrails).
