---
type: Retrospective
---

# Phase 31b — Ecosystem Enforcement — Retrospective

## What shipped

The gap 31a shipped deliberately (ADR-0016 D8) is closed. Cross-repo discipline
no longer depends on the agent remembering.

- **Layered enforcement** (E1). The routing nudge fires *before* the edit on the
  agent axis; the commit banner fires unconditionally on the git axis; the
  landing gate refuses. Each layer is only as strong as its axis allows, and the
  rules now say which is which.
- **Fleet orient** (ENH-067). `ecosystem status` and the SessionStart banner
  carry each member's active phase, open P0/P1, and lanes.
- **Dependency-ordered landing** (ENH-068). `lanes land` refuses while an
  upstream member has not landed, and the final contribution requires the
  declared integration verify.
- **Cross-repo doc sync is delivered**, not mentioned — into the target's inbox,
  with the ownership rule untouched.
- **The rules text was corrected in the same release as the mechanism** (E7),
  with tests asserting the distinction survives editing.

Suite **1084 → 1135** (+51). Swarm 236/236. OKF 318/318.

## Verification Evidence

Full output in `evidence/verification.md`. Summary:

- `npm test` — **1135/1135** from a 1084 baseline.
- Swarm invariance — **236/236**.
- Solo repo — four commits, no directories, no banner, no extra output.
- Eight acceptance criteria asserted in one e2e replaying the reviewed-session
  narrative.
- Cost **measured**: ~53ms solo, ~35ms in-ecosystem, once per session per member.
- **Live dogfood** against the real 8-member `cerebrio-ecosystem`: a clean true
  negative — every layer correctly silent for genuinely single-repo work, while
  orient still reports real fleet state.

## What went well

**Ordering G2 after G1 was the right call, and it was load-bearing.** A nudge
that says "this is cross-repo work" restates what the agent can already see. The
nudge that shipped says *"frontend: P1 BUG-001 — Cost formatter shows 'Not
specified' for sub-cent values"*. That difference is the entire value, and it
only existed because orient landed first.

**Two scoping rules kept the landing gate from crying wolf.** An edge to a
member with no contribution does not block, and a `land` event only counts for
the initiative it names. Without either, every registered edge would become a
permanent blocker the moment any initiative opened — and an operator who learns
to reach for `--force-order` by reflex has a gate in name only.

**Live data beat synthetic fixtures, twice.** Fleet orient looked correct
against fixtures and was unreadable against the real ecosystem, where P1 titles
run to full paragraphs. And the fleet view immediately surfaced 30 open lanes
across 5 members — accumulated stale state nobody had noticed.

## What was hard

**Four bugs in this phase shared one failure mode: silence.** Two `2>/dev/null`
redirects that suppressed the very messages the hooks exist to print; a realpath
asymmetry that made the nudge never fire for a new file in a new directory; and
an ecosystem-root resolver that walked up but not sideways. Every one produced a
feature that looked implemented, passed inspection, and emitted nothing. None
would have been caught by reading the code.

That is now the phase's clearest lesson: **a feature whose failure mode is
silence cannot be verified by inspection — it has to be run.** Both prior phases
in this arc found their worst defect the same way (BUG-028 was a matcher that
could never deliver; this phase found four).

**The packaging constraint generated a third duplicate.** An installed project
receives no copy of `core/`, so `cross-repo.js` joined `eco-event.js` and
`orient.js` as a self-contained shipped module. The parity-test discipline is
holding, but three instances is a pattern. Filed as **TD-012**, with the
explicit note that it should be settled before a fourth is written.

## What was deferred

- **TD-012** — a real shipped-runtime story instead of per-feature duplicates.
- **TD-013** — five ecosystem-root resolvers, two different algorithms. Worked
  around here rather than unified, since `findRoot`'s up-only semantics may have
  callers that depend on them.
- **Forge webhooks** — server-side merges remain visible only on next local
  integration. Structural: momentum stays forge-neutral.
- **30 stale lanes** across the fleet — observed, out of scope, left to the
  operator's `momentum lanes reconcile`.

## What was learned

**Understating is as corrosive as overstating.** BUG-009 was filed for a rule
claiming "(Automatic)" over prose no mechanism backed. 31a over-corrected into
"convention, not enforcement" — correct then, wrong the moment detection
shipped. An agent that finds the rules text wrong once discounts all of it, and
cannot tell whether the error was optimistic or pessimistic. So the fix is not
"be conservative", it is **be specific**: name each layer's strength separately,
say why, and assert it in a test so the next editor cannot quietly undo it.

**A gate that fires on legitimate work is worse than no gate**, because the
override becomes reflex. That is the whole reason `--force-order` records a
`forced` flag on the event rather than passing silently — the
`MOMENTUM_SKIP_HOOKS` posture, not the `--no-verify` one.
