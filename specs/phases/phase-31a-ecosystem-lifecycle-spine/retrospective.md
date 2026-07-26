---
type: Retrospective
---

# Phase 31a — Ecosystem Lifecycle Spine — Retrospective

## What shipped

Cross-repo work now has the same lifecycle structure that makes single-repo
momentum self-enforcing, and the ecosystem's records keep themselves true
without agent cooperation.

- **Enforcement moved onto the git axis** (D1). `post-commit` / `post-merge`
  hooks and a `tag` capture on release push feed attributed per-actor fragments
  in the ecosystem repo. Member identity resolves via `git rev-parse
  --git-common-dir`, so lane worktrees — momentum's own Rule 15 flow — are no
  longer invisible to momentum's own audit trail.
- **An entry point** (D2/D3). `/brainstorm-initiative` mirrors
  `/brainstorm-phase` including its gate contract, and orients across the fleet
  before planning. `initiative start` declares contributions, writes the
  contributions table, and registers dependency edges.
- **A completion gate** (D6). `initiative complete` is the first cross-repo
  Rule 12 gate momentum has had: it refuses to close until every contribution
  carries evidence, runs the declared integration check, and reports an
  undeclared one as an explicit gap.
- **BUG-028 fixed**, and its class closed by a test that reads the installed
  matcher rather than driving the script.
- **TD-011 closed** — all three initiative template sections that shipped in
  Phase 9 with no writing code now have writers.

Suite **1028 → 1084** (+56). Swarm 236/236. OKF 311/311.

## Verification Evidence

See `evidence/verification.md` for full output. Summary:

- `npm test` — **1084/1084**, from a 1028 baseline on `main`.
- Swarm invariance — **236/236**.
- No-ecosystem solo repo — commits clean, no directories created, no stray
  output.
- `momentum okf check` — 311 files conformant.
- BUG-028 regression test **run against the unfixed code**: 2 failures with the
  exact diagnostic, then 4/4 green once restored.
- Two-clone e2e asserting all six acceptance criteria: 1/1 green.
- Hook cost **measured**: ~35ms marginal (85ms vs 50ms bypassed).
- **Live dogfood**: four real commits of this phase captured into the real
  `cerebrio-ecosystem` log, SHAs cross-checked against `git log`.

## What went well

**Grounding the review before designing.** The five session retrospectives
contained two claims that were simply wrong — that `brainstorm-gate.sh`
enforces plan-before-code (it only blocks `specs/` writes during a brainstorm),
and that the ecosystem root ships no command surface (ENH-049 shipped one).
Checking each claim against code before planning meant the phase solved the real
problems instead of the reported ones, and it surfaced the actual defect
(BUG-028) that no report had identified.

**The design got smaller under scrutiny, twice.** `contributions[]` began as an
array of objects and became flat `member:kind:ref` strings once the serializer
was read — and dropping `status`/`evidence` from the record made it *more*
Rule-12-correct, since a cached status is self-reported completion. Likewise
`initiative start` was specified as a cross-repo "fan-out" and became declare +
route once the ownership boundary was taken seriously.

**Checking wiring rather than libraries.** Three defects were found only because
the check went one level below the obvious: `eco-event.js` failing the
installer's ownership predicate (would have installed once and frozen forever),
the refusing gate exiting 0, and BUG-028 itself. All three would have passed a
library-level test suite.

## What was hard

**Two implementations, unavoidably.** An installed project receives no copy of
`core/`, so the git hook cannot reuse `core/team/lib/fragments`. Verified
against the fingerprint fixture rather than assumed. The duplication is fenced
by a parity test asserting byte-identical fragment output — the honest
mitigation, but it is still a second implementation to keep honest.

**Fingerprint churn.** Four adapters × four re-baselines. Each was preceded by
`--check` to prove the drift was exactly the intended surface, which caught
nothing bad but is the only reason that confidence is warranted.

## What was deferred

- **Mid-session cross-repo detection** — the routing in 31a is agent convention,
  and the rules text says so (D8). This is the single largest gap, and it is
  Phase 31b's first deliverable.
- **Fleet orient** (ENH-067) and **dependency-ordered landing** (ENH-068) — 31b.
- **Forge-side merges** stay invisible until the next local integration.
  Structural: momentum is forge-neutral and ships no webhook. `post-merge`
  captures them on fetch; forge branch protection remains the real backstop.
- **A full initiative lifecycle across two real `cerebrio-ecosystem` members** —
  would require writing phase records into sibling repos carrying in-flight
  work. Operator's call.

## What was learned

**A gate that exits 0 is worse than no gate.** `initiative complete` printed a
complete REFUSED report and returned success, because `bin/momentum.js` ended
with `process.exit(exitCode)` and the refusal path set `process.exitCode`
instead of throwing. Caught only by checking `$?` rather than reading the
output. Authoritative-looking output plus a success status is how a broken gate
survives review.

**"The test passes" and "the feature works" are different claims.** BUG-028
lived through its entire life with a green test, because the test invoked the
hook script directly with a synthesized payload and bypassed the matcher that
was broken. This is the second instance of that exact class (BUG-007 was the
first), which is why the fix was a test that reads the installed configuration
rather than one more test of the script.

**Records without writers rot silently.** Three template sections and
`dependencies[]` sat unwritten across four phases while looking, in every
review, exactly like features. Worth a habit: when adding a template section or
a manifest field, the same change should add the code that writes it — or say
out loud that it is documentation.
