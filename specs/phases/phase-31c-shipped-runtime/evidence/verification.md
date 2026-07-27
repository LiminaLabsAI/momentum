---
type: Evidence
---

# Phase 31c — Verification Evidence

Captured 2026-07-27 on `phase-31c-shipped-runtime`.

## Suite

```
npm test  →  ℹ tests 1161 | pass 1161 | fail 0        (baseline 1140 on v0.41.1)
swarm     →  ℹ tests 236  | pass 236  | fail 0        (invariance gate held)
okf check →  ✓ 326 markdown file(s) conformant
fingerprints → ✓ 4 adapters, no drift
```

## AC-1 — BUG-030 falsified through the real CLI

Before 31c, in the standard sibling layout:

```
findRoot(frontend)      = null
landingCheck (no root)  = applicable: false      ← gate silently skipped
landingCheck (explicit) = applicable: true       ← what every 31b test did
```

After, driven through `momentum lanes land` with nothing injected
(`tests/shipped-runtime-e2e.test.js`):

```
✗ ecosystem[attachments]: 'backend' has not landed its contribution
  (phase:p12) — it is upstream of 'frontend' via a api-contract edge
✗ lane 'fix-a1' is not landable          (exit ≠ 0)
```

## AC-2 — one discovery implementation

Was 7 across 3 algorithms. Now 1, asserted two ways: a self-cleaning allowlist
(`tests/unified-discovery.test.js`) that fails both on a new offender and on a
stale entry, and **0 bash walkers** remaining.

## AC-3 — byte-identity, live

```
all 12 vendored files byte-identical to their core originals
```

## AC-4 — no re-implemented core logic

```
eco-event.js   277 → 178 lines   0 sibling scans left
cross-repo.js  176 → 136 lines   detect mirror gone
orient.js                        0 registry parsing left  (BUG-029's home)
```

## AC-5 — the production-call-path guard

Enumerative: scans for `opts.ecosystemRoot || <discover>` and fails when a
function using it has no no-injection test. Found 2 unknown entry points on its
first run (both the opposite contract — a guard clause, not a fallback).

## AC-6 — fresh clone, no upgrade

`tests/shipped-runtime-e2e.test.js` clones a committed install, touches nothing,
and asserts every runtime module is present *and loads*.

## AC-7 — solo invariance, measured not assumed

A repo with no ecosystem: `git commit` silent, `session-append.sh` exit 0 with no
output, SessionStart banner empty, `lanes board` unchanged.

## Cost (measured, per ADR-0018 R5)

```
session-append.sh   77ms/call   (replaces a python3 spawn — baseline was not 0)
SessionStart banner 92ms/call   (inside its <100ms budget)
```

## Live dogfood — this repo as a `cerebrio-ecosystem` member

```
findRoot(momentum)      → /Users/.../cerebrio-ecosystem     (was null pre-31c)
discover.js             → <root>\tmomentum
fleet orient (runtime)  → 8 members | 5 with open P0/P1 · 5 active phases
event fragments today   → 40 real commits captured by the rewired hooks
vendored runtime        → all 12 byte-identical
```

Not synthetic (the Phase 20 lesson): every line above is the live 8-member
ecosystem this repo belongs to.
