# Phase 21c — Lanes Fly — Retrospective

> Built as **v0.25.0** (2026-07-03) on the stacked branch
> `phase-21c-lanes-fly` (parent: `phase-21b-lanes-run` → `phase-21a-lanes-walk`).
> Release parked on operator approval behind 21a/21b. Closes the
> Parallel Lanes family (Walk → Run → Fly) and FEAT-028.

## What was delivered

- **One recursive wave engine** — `core/waves/lib/waves.js`: Kahn
  layering over `{from depends-on to}` edges, lexicographic in-wave
  stability, cycle/self-dependency errors with participants,
  label-parametrized error strings for adapter compatibility.
- **Swarm rewired as the top-scale consumer** —
  `core/swarm/lib/wave-ordering.js` is now a thin adapter with its
  Phase 17 surface pinned byte-stable ({index, repos} shape + error
  text); the full swarm test surface and e2e scenarios pass unchanged.
- **Dependency annotations as data in existing files** — task groups:
  `## Group N — title (deps: G0, G1)` heading suffix (all-`[x]` groups
  satisfied); phases: `"deps"` arrays in `specs/phases/index.json`
  (complete phases satisfied).
- **`momentum waves` CLI** — phase scale (wave-1 `lanes open`
  suggestions) and task scale (default = the phase bound to the current
  branch per Rule 15, status.md fallback); `--json` unstable; clear
  cycle reporting.
- **3-ideas e2e demo** — waves plan → CLI-opened lanes → work → queue
  landings with a real stale-refusal/rebase/land cycle → completed wave
  unblocks the dependent phase. Committed evidence captured by an
  env-gated one-shot script (npm test never rewrites it — TD-006
  lesson applied).
- **Lane-state contract decision** — stays INTERNAL; the irreversible
  publication call is handed to the operator with a
  publish-after-multi-week-dogfood recommendation (ADR-0003 §5).
- **ADR-0003**; docs: site parallel-work Fly section + lanes recipe
  waves section.

## What went well

- The swarm extraction was clean: the Phase 17 algorithm generalized
  without a single behavioral change (parity test pins it), retiring a
  scale-specific implementation while keeping its battle-tested
  semantics.
- Annotations-as-heading-suffix required no new files and reads
  naturally in every tasks.md this repo already has.
- The e2e demo exercised the whole family in one test: 21c's waves,
  21b's lanes/queue, 21a's binding conventions.

## What didn't go well

- Nothing significant; the phase was compact by design. One judgment
  call absorbed silently: plan.md was folded into overview.md for this
  phase (logged in history) — fine for a small phase, but /validate's
  four-file expectation will flag it; noted below as follow-up.

## Follow-ups (not blocking)

- `/validate` expects `plan.md` in every phase dir — either scaffold a
  pointer file at completion or teach /validate the folded-plan case.
  (Left as-is: /validate reports it as a failure only in --deep scans of
  this phase dir; a pointer plan.md is added at completion to keep the
  structure canonical.)

## Verification Evidence

### `npm test` (full suite, fresh — exit 0)

```
ℹ tests 697
ℹ pass 697
ℹ fail 0
```

(Growth: 684 → 697 = +7 engine incl. swarm-parity pin, +5 waves CLI,
+1 three-ideas e2e. Swarm e2e scenarios: 8/8 unchanged post-rewire.)

### Per-adapter install smoke (exit 0 ×3)

```
claude-code: exit 0, files: 55
codex: exit 0, files: 59
antigravity: exit 0, files: 60
```

### Site build (exit 0)

```
13 page(s) built in 1.79s
dist/parallel-work/index.html: "momentum waves" present ×3 (Fly section live)
```

### Fingerprints

Re-baselined ×3 with meta; drift = lanes recipe waves section only.

### e2e demo evidence

`evidence/three-ideas-demo.txt` — full sanitized transcript of
waves → lanes → sequenced landings → next-wave unblock.

## Acceptance criteria check (overview.md)

1. `momentum waves` at both scales with cycles/satisfied-deps/wave-1
   suggestions — **met** (5/5 CLI tests + demo).
2. Swarm unchanged — **met** (parity test; full suite; e2e 8/8).
3. 3-ideas demo automated + evidence — **met**.
4. Suite green; fingerprints intentional-only; site green — **met**
   (697/697).
5. v0.25.0 built + verified; release parked — **met** (runbook in
   status.md Next Actions #1).
