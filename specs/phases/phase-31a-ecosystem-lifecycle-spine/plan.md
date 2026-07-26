---
type: Plan
status: planned
tags: [ecosystem, initiative, lifecycle, git-native, write-path]
---

# Phase 31a — Ecosystem Lifecycle Spine — Plan

```
# Execution:  G0 → (G1 ∥ G2) → G3 → G4 → G5
```

Lane `phase-31a-ecosystem-lifecycle-spine`. Target v0.40.0.
Baseline suite: **1028/1028** on `main` (v0.39.0).

> **Invariance gate for the whole phase.** No-ecosystem and single-machine
> behavior must stay byte-unchanged, and the **236 swarm tests** must stay green.
> Anything that can't hold that is a design error, not a test to update.

---

## Group 0 — Contracts, BUG-028, backlog intake *(Sequential — blocks everything)*

**Sequential.** No external dependencies.
**Commit:** `docs(phase-31a): ADR-0016 ecosystem lifecycle spine + BUG-028 fix`

Everything downstream reads these contracts, so they land first and alone.

1. **ADR-0016 — Ecosystem Lifecycle Spine.** Records D1–D8: the enforcement axis
   moves to git; the initiative lifecycle mirrors the phase lifecycle; the
   evidence contract for cross-repo completion; and the explicit statement that
   31a's routing is convention, made mechanical in 31b (D8 — do not repeat
   BUG-009's overstatement).

2. **Ecosystem config surface.** Decide and document where ecosystem-level
   settings live (`ecosystem.json` vs a root `specs/config.md` analogue) and
   register `integration_verify_command`. Follow the ADR-0009 separation: the
   *trust layer* is invariant, the *mechanisms* are config.

3. **Initiative frontmatter extension.** Link member contributions to real
   records: per-repo `{ member, kind: phase|adhoc, ref, evidence }`. Must be
   back-compatible with every initiative already on disk — existing files
   validate unchanged.

4. **BUG-028 — Claude Code PostToolUse matcher.** `adapters/claude-code/settings.json`
   `Edit|Write` → `Edit|Write|Bash`. Restores the brainstorm-gate shell-redirect
   path (`> specs/…`) and unblocks the legacy session-log append until G1
   supersedes it.

5. **The regression-proof test.** This is the important half of #4. The existing
   `tests/ecosystem-hook.test.js` passes while the wiring is dead because it
   pipes `tool_name:'Bash'` straight into the script, bypassing the matcher.
   Add a test that reads the **installed adapter settings**, checks the matcher
   against the tool names the script actually branches on, and fails when a hook
   guards on a tool its own matcher can never deliver. This is BUG-007's exact
   class recurring on a second adapter — the test must close the class, not the
   instance, for all four adapters.

6. **Backlog intake.** File the review's remaining findings (ENH-066/067/068,
   TD-011) so 31b plans from a groomed list rather than from a conversation.

**Verification:** `npm test` — new matcher test **fails before** the settings fix
and passes after (demonstrate both).

---

## Group 1 — Git-native event write path *(Parallel with Group 2)*

**Parallel with Group 2.** Depends on G0 contracts. External: git ≥2.5 (worktrees).
**Commit:** `feat(ecosystem): git-native event write path`

Records get writers, on an axis nothing routinely bypasses.

1. **`post-commit` hook** in member repos (via the existing `core.hooksPath`
   → `.githooks/` install, additive and self-healing per BUG-011) appending one
   attributed event to the ecosystem fragment substrate
   (`core/team/lib/fragments`, Phase 30e). Zero-conflict by own-prefix
   construction, so N members and N clones never collide.

2. **`post-merge` hook** for merges that arrive by fetch — the local half of the
   `gh`-API-merge blind spot. Server-side merges cannot fire a local hook; this
   captures them on the next integration. Document the residual honestly.

3. **Member resolution via `git rev-parse --git-common-dir`** (D5), replacing
   `$PWD` realpath-matching. Resolve the common dir to the true repo root, then
   match against `members[].path`. Lane worktrees, nested cwds, and
   scratchpad checkouts all resolve correctly.

4. **`sessions/` compiled from fragments** rather than appended in place —
   inherits 30e's zero-conflict merge, so the `mkdir`-lock (BUG-004) is no longer
   load-bearing for cross-member concurrency. Keep the legacy append path
   working for un-migrated ecosystems.

5. **Event kinds:** `commit`, `merge`, `tag` (feeds G4's chronology writer).
   Attribution comes from `core/identity`.

**Verification:** `npm test` + a lane-worktree case asserting a commit made from
a worktree outside `members[].path` still lands in the log (acceptance
criterion 1). Assert no-ecosystem is a silent no-op.

---

## Group 2 — Lifecycle head: brainstorm + start *(Parallel with Group 1)*

**Parallel with Group 1.** Depends on G0 contracts.
**Commit:** `feat(ecosystem): initiative brainstorm + start`

The missing entry point — cross-repo work gets a door that produces the record.

1. **`/brainstorm-initiative`** — structural mirror of `/brainstorm-phase`,
   including its gate contract: a `.momentum/brainstorm-active` sentinel at the
   ecosystem root, **zero disk writes until explicit approval**, draft lives in
   conversation. Elicits objective, member repos, dependency edges between them,
   non-goals, and the acceptance criteria that will later gate completion.

2. **`initiative start <slug>`** — the fan-out that today does not exist:
   - creates or links a phase / ad-hoc record in each participating member,
     stamped with `initiative: <slug>` (the field `swarm`'s brief schema and
     `start-phase` already read)
   - writes **`Per-repo contributions`** from the fan-out result
   - **registers dependency edges** in `ecosystem.json` — the first code that
     ever adds one
   - sets the initiative active via the 30e attributed fragment

3. **Refuse-not-overwrite** semantics throughout, matching
   `/initiative create`'s existing idempotency principle.

4. **Routing prose (D8).** The instruction change telling agents to route
   cross-repo work here. Labelled agent-convention in the rules text — *not*
   described as enforced. 31b supplies the mechanism.

**Verification:** `npm test` — fan-out creates records in ≥2 members; edges land
in `ecosystem.json`; the gate contract holds (writes blocked while the sentinel
exists); re-running `start` refuses rather than clobbers.

---

## Group 3 — Lifecycle tail: completion gate *(Sequential — needs G2)*

**Sequential.** Depends on Group 2.
**Commit:** `feat(ecosystem): initiative completion gate`

The gate that would have caught two production defects.

1. **`/complete-initiative <slug>`** — mirror of `/complete-phase`, one tier up.

2. **Evidence gate (Rule 12, cross-repo).** Refuse to close unless *every* member
   contribution listed in the initiative is complete **with fresh evidence from
   this session** — reusing the Rule-14-graded evidence reader that
   `lanes land` already implements, rather than inventing a second grader.

3. **Integration verify (D6).** When the ecosystem declares
   `integration_verify_command`, run it and require passing output. When it is
   absent, say so explicitly in the output — an undeclared integration verify is
   a stated gap, never a silent pass.

4. **On pass:** populate `Close`, finalize `Deploy chronology`, set
   `status: closed` + `closed: <date>`, clear the active fragment.

5. **Failure output names the member and the reason** — "backend: no evidence
   since 2026-07-20" beats "not ready".

**Verification:** `npm test` — the **refusal path is the headline assertion**
(acceptance criterion 3); pass path closes and populates; a declared-but-failing
integration verify blocks.

---

## Group 4 — Record writers + adapter parity *(Sequential — needs G1 + G3)*

**Sequential.** Depends on Groups 1 and 3.
**Commit:** `feat(ecosystem): record writers + adapter parity`

1. **Deploy chronology writer** — consumes G1's `tag` events; appends
   `timestamp / member / ref / sha` rows. The template section stops being dead.

2. **Linked decisions writer** — when a member ADR lands carrying the
   `initiative:` stamp, link it into the initiative.

3. **Four-adapter projection** — `brainstorm-initiative`, `initiative start`,
   `complete-initiative` ship to claude-code, codex, opencode, antigravity via
   the ADR-0011 projection (generated, not hand-authored per adapter), and into
   the ecosystem root command surface via `ensureRootCommandSurface()` (ENH-049).

4. **Fingerprint re-baselines** — all four, via `scripts/rebaseline-fingerprints.js`,
   proven zero-drift before use (the Phase 30d procedure).

**Verification:** `npm test` + `momentum okf check` bundle conformance; confirm
drift is exactly the intended surface.

---

## Group 5 — Verification & release prep *(Sequential — last)*

**Sequential.** Depends on all prior groups.
**Commit:** `test(ecosystem): two-clone initiative lifecycle e2e`

1. **Two-clone multi-repo e2e** — the whole spine in one test: two clones, ≥2
   members, brainstorm → start → commits from a lane worktree → complete. Assert
   every acceptance criterion, including that concurrent actors produce a
   zero-conflict merge.
2. **Full suite** — 1028 + net-new; **236 swarm tests green**; no-ecosystem
   byte-unchanged.
3. **Self-repo dogfood** — this repo is a member of `cerebrio-ecosystem`. Run the
   spine against a real cross-repo change; do not accept synthetic-only evidence
   (the Phase 20 lesson).
4. **`/sync-docs`** then **retrospective**, then `/complete-phase` at the operator
   gate.

**Verification:** `npm test` green; evidence captured under
`specs/phases/phase-31a-ecosystem-lifecycle-spine/evidence/`.

---

## Risks

| Risk | Mitigation |
|---|---|
| `post-commit` hooks slow every commit in every member | Hard budget <50ms; fail-open and silent; never block a commit. Fragment append is one small file write. |
| Git hook install conflicts with user-owned hooks | Reuse the BUG-011 additive/self-healing installer; never clobber; honor `core.hooksPath`. |
| `gh`-API merges still invisible locally | Accepted and documented residual — `post-merge` captures on next integration. A forge webhook path is 31b/32 territory, and momentum stays forge-neutral. |
| Fan-out writes into member repos — the ownership boundary | `initiative start` creates *phase records*, which each member owns by convention; it never touches another repo's `specs/architecture/` or docs. The `sync-docs` boundary is unchanged. |
| Scope creep from 31b | The out-of-scope list in `overview.md` is binding. New findings go to backlog, not into this phase (Rule 14). |
