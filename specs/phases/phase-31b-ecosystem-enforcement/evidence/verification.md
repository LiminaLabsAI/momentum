---
type: Evidence
---

# Phase 31b — Verification Evidence (2026-07-27)

All output produced in-session against the code as committed on
`phase-31b-ecosystem-enforcement`.

## Full suite

```
npm test
ℹ tests 1135
ℹ pass 1135
ℹ fail 0
```

Baseline on `main` (v0.40.0) was **1084**. Net-new: **+51**.

## Invariance gates

**Swarm:**

```
node --test tests/swarm*.test.js
ℹ tests 236   ℹ pass 236   ℹ fail 0
```

**Solo repo — no ecosystem, no behavioral change.** Fresh `momentum init` repo,
four ordinary commits:

```
commits: 4 | .momentum/team: NONE | sessions: NONE
--- commit output (must be plain git only) ---
[main acf58eb] feat: solo 4
 1 file changed, 1 insertion(+)
```

No banner, no directories, no extra output. The PreToolUse nudge in a solo repo
costs **53ms/call** (node startup dominates) and prints nothing.

**OKF bundle:** `✓ specs/ is an OKF v0.1 conformant bundle (318 markdown files)`

## Acceptance criteria

All eight are asserted in `tests/ecosystem-enforcement-e2e.test.js`, which
replays the reviewed-session narrative: an agent drifts from backend into
frontend, where BUG-001 is already open against the very formatter it is about
to rewrite.

```
node --test tests/ecosystem-enforcement-e2e.test.js
✔ ecosystem enforcement: drift is caught, order is enforced, sync is delivered
ℹ tests 1   ℹ pass 1   ℹ fail 0
```

| # | Criterion | Evidence |
|---|---|---|
| 1 | Nudge fires **before** the edit, never blocks | e2e + `cross-repo-nudge.test.js` |
| 2 | Plain `git commit` surfaces the banner, no agent | e2e (asserted on `git commit` stderr) |
| 3 | `ecosystem status` carries phase + P0/P1 + lanes | e2e + `ecosystem-orient.test.js` |
| 4 | Nudge names the target member's open P0/P1 | e2e + `cross-repo-nudge.test.js` |
| 5 | `lanes land` refuses out-of-order, naming the blocker | e2e + `ecosystem-landing-order.test.js` |
| 6 | Last contribution requires the integration verify | e2e + `ecosystem-landing-order.test.js` |
| 7 | Cross-repo doc sync delivered to the target inbox | e2e (asserts the file, and that the target's `specs/` stays untouched) |
| 8 | Rules distinguish best-effort from enforced | e2e + 3 assertions in `cross-repo-nudge.test.js` |

### The nudge, verbatim

```
⚠ Cross-repo work with no initiative: backend + frontend
  frontend: P1 BUG-001 — Cost formatter shows "Not specified" for sub-cent values
  → Run /brainstorm-initiative to open one before going further.
    (Cross-repo work belongs to an initiative — see ADR-0016.)
```

That second line is AC-4 and the whole point of ordering G2 after G1.

## Measured cost

| Path | Cost |
|---|---|
| PreToolUse nudge, solo repo | ~53ms/call |
| PreToolUse nudge, in ecosystem | ~35ms/call |
| `post-commit` (31a baseline, unchanged) | ~35ms marginal |

Node startup dominates. The nudge fires **once per session per member**, so the
per-session cost is bounded by member count, not edit count.

## Live self-repo dogfood (not synthetic)

momentum is a registered member of `cerebrio-ecosystem` (8 members).

```
=== detection ===
members touched: momentum
crossRepo: false | covered: false | shouldRoute: false

=== landing gate ===
applicable: false (no initiative declares a momentum contribution — correct)

=== SessionStart banner ===
▸ Ecosystem: cerebrio-ecosystem (8 members)
▸ Active initiative: portable-deployment-substrate
▸ Fleet: 5 members with open P0/P1 · 5 active phases · 30 open lanes
```

This is a **true negative**, and deliberately reported as such: this session is
genuinely single-repo work, so every enforcement layer correctly stays silent
inside a real multi-member ecosystem, while the orient layer still reports real
fleet state. A gate that fires here would be the defect.

Fleet orient was additionally validated against all 8 real members during G1 —
which is where the paragraph-length-title defect was found and fixed.

### Observed, not fixed

The fleet line reports **30 open lanes** across 5 members. That is almost
certainly accumulated stale lane state (the BUG-026 class, whose cleanup shipped
in Phase 27), not 30 live workstreams. Out of scope for this phase and left to
the operator: `momentum lanes reconcile` in the affected members. Recorded
because the new fleet view is what made it visible at all.
