---
type: Evidence
---

# Phase 31a — Verification Evidence (2026-07-27)

All output below was produced in-session against the code as committed on
`phase-31a-ecosystem-lifecycle-spine`.

## Full suite

```
npm test
ℹ tests 1084
ℹ pass 1084
ℹ fail 0
```

Baseline on `main` (v0.39.0) was **1028**. Net-new: **+56**.

## Invariance gates

**Swarm — must stay green (the 30e gate):**

```
node --test tests/swarm*.test.js
ℹ tests 236
ℹ pass 236
ℹ fail 0
```

**No-ecosystem / solo repo — no behavioral change:** a fresh `momentum init`
repo with no ecosystem anywhere up the tree, four ordinary commits:

```
commits made: 4
any .momentum/team dir created? NO
any sessions/ dir created?      NO
stray output on commit?         none — normal git output only
```

The `post-commit` hook resolves no ecosystem and exits silently.

**OKF bundle:**

```
momentum okf check
✓ specs/ is an OKF v0.1 conformant bundle (311 markdown file(s))
```

## BUG-028 — the fix is proven, not asserted

The regression test was run **against the unfixed code** by stashing the
settings change, to prove it actually catches the defect:

```
# with matcher reverted to "Edit|Write"
✖ claude-code: every hook script's tool guards are reachable through its matcher
  AssertionError: adapters/claude-code/settings.json PostToolUse matcher
  "Edit|Write" can never deliver tool "Bash", but core/scripts/
  check-history-reminder.sh branches on it — that branch is dead code.
✖ regression: the BUG-028 instance itself — claude-code PostToolUse reaches Bash
ℹ pass 2  ℹ fail 2

# with the fix restored
ℹ tests 4  ℹ pass 4  ℹ fail 0
```

## Acceptance criteria

Every criterion from `overview.md` is asserted in
`tests/ecosystem-lifecycle-e2e.test.js` (two clones, one bare remote, no
network):

| # | Criterion | Where |
|---|---|---|
| 1 | Commit from a lane worktree outside `members[].path` is captured | e2e + `eco-event-write-path.test.js` (AC-1) |
| 2 | create → start → complete end-to-end across 2 members | e2e |
| 3 | `complete` refuses when a member lacks evidence, naming member + reason | e2e + `initiative-complete.test.js` (AC-3) |
| 4 | Contributions / linked decisions / chronology written by machinery | e2e + `initiative-complete.test.js` |
| 5 | Dependency edge registered by `start` is in `ecosystem.json` | e2e + `initiative-start.test.js` |
| 6 | Concurrent actors on two clones merge with zero git conflict | e2e |

```
node --test tests/ecosystem-lifecycle-e2e.test.js
✔ ecosystem lifecycle spine: two clones, worktree commits, refusal then close
ℹ tests 1  ℹ pass 1  ℹ fail 0
```

## Hook cost — measured, not estimated

Five commits with the `post-commit` hook active vs three with
`MOMENTUM_SKIP_HOOKS=1`, same repo:

```
with hook:     629ms (cold), then 86 / 85 / 86 / 85 ms
bypassed:      50 / 50 / 50 ms
marginal cost: ~35ms steady-state
```

Meets the <50ms budget in `plan.md`. The 629ms first run is cold node start +
directory creation.

## Live self-repo dogfood (NOT synthetic — the Phase 20 lesson)

momentum is itself a registered member of `cerebrio-ecosystem`. After G1
installed the hooks into this repo's own `.githooks/`, every subsequent real
commit of this phase was captured into the **real** ecosystem log with no
manual step:

```
momentum ecosystem sessions --ecosystem ../cerebrio-ecosystem

# Session 2026-07-26
Active initiative: portable-deployment-substrate

18:51Z [momentum] commit: feat(ecosystem): git-native event write path (170c8ea) — avinashsingh539
19:04Z [momentum] commit: feat(ecosystem): initiative brainstorm + start (1689904) — avinashsingh539
19:14Z [momentum] commit: feat(ecosystem): initiative completion gate (5c1feb7) — avinashsingh539
19:25Z [momentum] commit: feat(ecosystem): record writers + adapter parity (267a367) — avinashsingh539
```

Cross-checked against `git log`: the four SHAs match exactly. The two earlier
commits of this phase (`1351964`, `f8b4e67`) are correctly absent — they predate
the hook install.

This is the evidence the five reviewed sessions could not produce: their
`sessions/` contained only `.gitkeep` after a full day of commits and PRs.

### What was NOT dogfooded

A complete initiative lifecycle across two **real** `cerebrio-ecosystem`
members was not run. Doing so would require creating phase records inside
sibling repos that carry their own in-flight work, which is the operator's call,
not this lane's. The lifecycle is covered by the two-clone e2e; the live
evidence above covers the write path only. Stated rather than implied.
