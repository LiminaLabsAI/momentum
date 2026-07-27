---
type: Retrospective
---

# Phase 31c — Shipped Runtime — Retrospective

## What shipped

Closes **TD-012**, **TD-013**, **BUG-030**. Target v0.42.0.

- **One `findRoot`** — up-walk → sibling scan → registration fallback. Discovery
  went from **7 implementations across 3 algorithms** to 1, including both bash
  walkers. Fixing the resolver fixed **BUG-030** as a consequence.
- **A vendored runtime** — 12 core modules copied verbatim into
  `.momentum/runtime/`, committed so a fresh clone has working hooks.
- **The mirrors deleted** — the three hook-side helpers now require real core
  modules. `eco-event.js` 277→178 lines, `cross-repo.js` 176→136,
  `orient.js` with zero lane-registry parsing.
- **An enumerative production-call-path guard** — the mechanism for this arc's
  recurring failure.

## Verification Evidence

Full detail in [`evidence/verification.md`](evidence/verification.md).

```
suite        1161/1161   (baseline 1140)
swarm         236/236    invariance held
okf check     326 files conformant
fingerprints  4 adapters, no drift
```

**BUG-030 through the real CLI**, nothing injected:

```
✗ ecosystem[attachments]: 'backend' has not landed its contribution
  (phase:p12) — it is upstream of 'frontend' via a api-contract edge
✗ lane 'fix-a1' is not landable
```

**Live dogfood** — `findRoot` from this repo returned `null` before 31c and now
resolves the real `cerebrio-ecosystem`; 40 real commit fragments captured today
by the rewired hooks; all 12 vendored files byte-identical.

**Cost measured, not assumed**: `session-append.sh` 77ms/call (replacing a
python3 spawn), SessionStart banner 92ms (inside its <100ms budget).

## What this phase was actually about

Three bugs in the 31a/31b arc shared one shape: **the test exercised a path
production does not take.** BUG-028's test bypassed the hook matcher. BUG-029's
mirror had no authority to check against. BUG-030's tests injected the root
production must discover.

The uncomfortable part is that Phase 31b shipped a matcher-reachability test
*specifically to close that class* — and the class reproduced twice within
hours. That is the finding worth keeping: **a parity fence detects drift after
someone writes a duplicate, and a retrospective note prevents nothing.** The
answer had to be structural — remove the duplicates so there is nothing to
fence, and make the guard enumerative so nobody has to remember.

## What went well

- **Measuring the premise.** The duplication existed because "shipping core
  would be too heavy" went unexamined for three phases. It is 96 kB against a
  1.4 MB package. One measurement dissolved the whole justification.
- **The guard earned its keep immediately** — it found two entry points on its
  first run that I did not know existed.
- **The self-cleaning allowlist** made phase progress visible in the test:
  `eco-event.js` was listed `pending G2 rewire`, and G2 *had* to remove the entry
  or the suite failed.
- **Group discipline caught a sequencing error.** Removing `scripts/orient.js` in
  G1 broke consumers not rewired until G2/G3; restoring it as explicitly
  transitional kept every group boundary green.

## What was harder than expected

- **Four silent failures in one phase.** The gate's stderr redirect, the
  post-commit redirect, the realpath mismatch, and `readJson` deleted with the
  mirror block. Every one produced a feature that *looked* fine and emitted
  nothing. Fail-open is right for hooks, but it means correctness must be
  asserted **positively, on content** — AC-4 caught the last one only because it
  asserts the literal string `BUG-001` rather than "a nudge appeared".
- **Two near-miss behaviour narrowings** during what was labelled a refactor:
  orient would have started spawning git per member, and `discover.js` would have
  silently stopped logging non-git members. Both were caught by tests whose
  fixtures were *more permissive than production* — usually a smell, here the
  only reason they surfaced.
- **My own estimate was wrong.** The closure is 12 files / 96 kB, not the 9 / 65
  kB quoted at brainstorm. Corrected in the ADR rather than trimming entry points
  to fit the guess.

## Decisions worth carrying forward

- **R2's literal path, plus a depth-1 assertion**, over a resolver with a
  candidate list. One constraint that fails loudly beats flexibility that fails
  silently. (The hook entry points still need a 2-candidate rule for
  template-vs-installed; that is documented, uniform, and unavoidable.)
- **Narrow a guard by contract, never by convenience.** G0 kept an explicit
  allowlist because tuning the regex would have hidden real offenders; G4
  narrowed the scan because the excluded idiom is genuinely a different contract.
  The test that distinguishes them: *could the excluded thing ever be the bug you
  are hunting?*
- **Fences are removed with the code they guarded.** Three went in G2 — including
  one asserting `cross-repo.js` "stays dependency-free", which pinned in place the
  exact constraint that caused BUG-029.

## Known gaps

- **The landing gate stayed broken on npm** from v0.41.0 until this ships (R8,
  operator decision). Nothing regressed — it never worked — and the failure was
  fail-open.
- **96 kB vendored** into every installed project, visible in upgrade diffs.
- **The depth-1 constraint** on adapter install layouts is asserted, not enforced
  by design. A future adapter that violates it fails the suite rather than
  mis-resolving silently — which is the intended trade.
