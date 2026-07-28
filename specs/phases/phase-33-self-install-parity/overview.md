---
type: Phase
status: in-progress
tags: [self-install, parity, drift, dogfood, verification-integrity]
deps: []
---

# Phase 33 — Self-Install Parity

## Goal

momentum's own `.claude/`, `scripts/` and `.momentum/runtime/` must match what a
**fresh install of momentum** would produce — and drift must **fail a test**,
not wait for someone to notice.

Target **v0.44.0**.

## Why

On 2026-07-28, while trying to dogfood the governor, this repo's own install was
found missing three things at once:

| Missing | Consequence |
|---|---|
| `Stop` hook in `.claude/settings.json` | the governor could never govern momentum |
| `cross-repo-gate` PreToolUse hook | momentum ran without its own cross-repo gate |
| `scripts/run-governor.sh` | wiring the hook alone would have silently no-opped |

**momentum shipped a governor it could not itself run.**

That is the sixth variant of one class in a single arc — BUG-002 (tarball glob),
BUG-030 (`findRoot`), BUG-031 (`pollTurn`), BUG-033 (unvendored `hook.js`),
BUG-034 (root from `$PWD`), and now self-install drift — but the first found in
momentum's **own installation** rather than in what it ships to others.

The existing guards do not cover this. Adapter fingerprints verify that a
**fresh** install matches the adapter. Nothing verifies that momentum's **actual**
installed surface matches what it ships. The repo is the one install nobody
checks, which is why it drifted furthest.

## Scope

**In:** `momentum selfcheck` — compute the fresh-install surface and diff it
against this repo's real `.claude/` + `scripts/` + `.momentum/runtime/` · a test
that fails on drift · fixing whatever it finds beyond today's three · wiring into
`npm test` and the release checklist.

**Out:** self-install parity for the other three adapters' surfaces in this repo
(momentum installs itself as claude-code only) · auto-repair — reporting drift is
this phase; deciding to fix it stays the operator's.

## Deliverables

| Deliverable | Verification |
|---|---|
| `core/selfcheck/lib/parity.js` — pure surface diff | `npm test` |
| `momentum selfcheck [--fix]` | `npm test` + CLI smoke |
| `tests/self-install-parity.test.js` — fails on drift | `npm test` — **proven red** on a synthetic drift |
| Whatever real drift it finds, fixed | `npm test` |
| Wired into `npm test` + `specs/project-rules.md` release checklist | `npm test` |

## Acceptance criteria

1. `momentum selfcheck` reports **zero drift** on a clean repo, and names every
   file when drift exists.
2. The test is **proven red** against a deliberately introduced drift, then green
   when reverted — the 32a lesson: a guard nobody has seen fail is a guard nobody
   knows works.
3. It catches all three of today's defects if they are re-introduced.
4. **`--fix` is opt-in.** Reporting is the default; silently repairing would hide
   the very drift this exists to surface.
5. Full suite green; solo behaviour unchanged.

## Reference specs

ADR-0018 (shipped runtime; the fingerprint precedent) · ADR-0007 (multi-adapter
installed state) · `scripts/verify-published.sh` (the sibling guard — that one
checks what users download, this one checks what momentum itself runs)
