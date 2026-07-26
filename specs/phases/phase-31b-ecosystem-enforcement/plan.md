---
type: Plan
status: in-progress
tags: [ecosystem, enforcement, detection, orient, landing-order]
---

# Phase 31b — Ecosystem Enforcement — Plan

```
# Execution:  G0 → (G1 ∥ G3) → G2 → G4 → G5
```

Lane `phase-31b-ecosystem-enforcement`. Target v0.41.0.
Baseline suite: **1084/1084** on `main` (v0.40.0).

> **Invariance gate for the whole phase.** No-ecosystem and single-repo
> behavior must stay byte-unchanged, and the **236 swarm tests** must stay
> green. A hook that fires on every edit must not make a solo repo slower or
> noisier.

> **Why G2 comes after G1:** the routing nudge's whole value is that it carries
> the *target member's* open P0/P1 items (AC-4). That summary is G1's orient.
> A nudge that only says "this is cross-repo" restates what the agent can see.

---

## Group 0 — Contracts *(Sequential — blocks everything)*

**Sequential.** No external dependencies.
**Commit:** `docs(phase-31b): ADR-0017 layered ecosystem enforcement`

1. **ADR-0017 — Layered Ecosystem Enforcement.** Records E1–E7: why enforcement
   is split across two axes rather than consolidated on one; the detection query
   and its coverage definition; the landing-order contract derived from
   registered edges; and the honesty correction to ADR-0016 D8.

2. **`core/ecosystem/lib/detect.js`** — the coverage query.
   - `touchedMembers(ecosystemRoot, {actor, sinceHours})` → members with events
     in the window, from the 31a event stream.
   - `coverage(ecosystemRoot, members)` → which in-progress initiative (if any)
     covers them, via `repos[]` and `contributions[]`.
   - `uncovered(ecosystemRoot, opts)` → `{ members, initiative, uncovered[] }`.
   - Pure over the fragment stream + `initiatives/`. No git calls, so it is
     cheap enough for a PreToolUse hook.

3. **`land` event kind** — added to `EVENT_KINDS`, recorded by
   `lanes land --execute` on success. E5: landed-ness is recorded, never
   inferred from branch state in repos this machine may not have.

4. **Config keys** — `ecosystem.json.config`:
   - `detect_window_hours` (default 24) — how far back the coverage query looks.
   - `landing_order` (`enforce` | `warn` | `off`, default `enforce`) — per
     ADR-0009, the trust layer is invariant but the mechanism is configurable.

**Verification:** `npm test` — detect.js unit tests over synthetic fragment
streams (covered / uncovered / single-member / closed-initiative-does-not-cover).

---

## Group 1 — Fleet orient *(Parallel with Group 3)*

**Parallel with Group 3.** Depends on G0.
**Commit:** `feat(ecosystem): fleet orient`

Closes **ENH-067**.

1. **`core/ecosystem/lib/orient.js`** — per-member summary by file parsing only:
   - active phase — the member's `specs/status.md` Active Phase table
   - open **P0/P1** backlog items — id + title, from `specs/backlog/backlog.md`
   - lane state — from the member's lane registry when present
   - degrades gracefully: a member with no `specs/`, no checkout, or an
     unparseable file yields a partial summary, never an error. A fleet view
     that dies on one bad member is useless exactly when it matters.

2. **`momentum ecosystem status`** renders it per member, under the existing git
   state. `--brief` keeps today's output for scripts.

3. **SessionStart banner** — extend `sessionstart-handoff.sh`'s existing
   ecosystem banner with a condensed fleet line (e.g. `▸ Fleet: 2 members with
   open P0/P1 · 1 active phase`). Budget: the banner's existing <100ms target
   still holds, so the summary is read lazily and capped.

**Verification:** `npm test` — a fixture ecosystem whose members carry a known
phase, a known P0 and P1, and a lane; assert all three surface. Assert a member
with a missing/corrupt `specs/` degrades rather than throwing.

---

## Group 3 — Dependency-ordered landing gate *(Parallel with Group 1)*

**Parallel with Group 1.** Depends on G0 (`land` events, config).
**Commit:** `feat(ecosystem): dependency-ordered landing gate`

Closes **ENH-068**. This is the gate that would have caught the alembic
multiple-heads defect at the moment it mattered.

1. **`lanes land` becomes ecosystem-aware** (E3). When the repo is a member and
   an in-progress initiative covers it:
   - resolve every edge where `from == this member` → those `to` members are
     upstream and must land first (E4)
   - for each upstream, require a recorded `land` event since the initiative
     started (E5)
   - refuse with the blocker named: *"backend has not landed its contribution
     (phase:phase-12-attachments) for initiative `attachments` — it is upstream
     of frontend via an api-contract edge."*

2. **Integration verify before the LAST member lands.** When this land would
   complete the final outstanding contribution, the declared
   `integration_verify_command` must pass first — the same check
   `initiative complete` runs, at the moment it can still prevent the bad state
   rather than merely refusing to record it.

3. **Record the `land` event** on successful `--execute`.

4. **Override** — `--force-order`, which lands anyway and records a `land` event
   flagged `forced`, with a loud warning naming what was skipped.
   *Explicitly modelled on the `MOMENTUM_SKIP_HOOKS` precedent: auditable and
   visible, rather than an invisible `--no-verify`-style bypass.* The
   `landing_order` config key can also relax the whole gate to `warn`/`off` for
   projects whose edges are not trustworthy yet.

5. **Solo-safe:** with no ecosystem, no initiative, or no edges, `lanes land`
   behaves exactly as it does today. Asserted, not assumed.

**Verification:** `npm test` — the **refusal is the headline assertion** (AC-5);
an in-order landing sequence passes; the last-member integration verify blocks
(AC-6); `--force-order` lands and marks the event; a solo repo is unaffected.

---

## Group 2 — Detection + routing nudge *(Sequential — needs G1)*

**Sequential.** Depends on Groups 0 and 1.
**Commit:** `feat(ecosystem): cross-repo detection + routing nudge`

The teeth-and-nudge pair (E1).

1. **Git-native banner (post-commit).** After recording the event, run the
   coverage query; when the commit lands in an uncovered second member, print a
   routing banner to stderr. Agent-independent — it fires for a human, a script,
   or any other tool. Never blocks (post-commit runs after the commit anyway).

2. **Agent nudge — `core/scripts/cross-repo-gate.sh` (PreToolUse).** Fires
   before a write to a path inside a member repo:
   - resolve the target path's member; exit immediately when not in an ecosystem
     or not inside a member (the common case must be nearly free)
   - when this is a **different** member from the ones already touched this
     session, and no initiative covers the set → emit the nudge
   - **exit 0, never 2** — this is advice, not a block (E1/E7). The teeth are in
     G3's landing gate.
   - **fire once per session per member-pair**, not per edit. Nudge fatigue is
     how a gate becomes noise the agent learns to skip.

3. **The nudge carries orient (AC-4).** It names the target member's open P0/P1
   items, so the message is *"you're about to touch frontend, which has BUG-001
   open on the cost formatter"* rather than *"this is cross-repo work"*. This is
   the specific miss reported from the sessions.

4. **Projection to all 4 adapters** with correct per-adapter matchers — and a
   matcher-reachability assertion for the new hook, since this is precisely the
   BUG-007/BUG-028 shape (`tests/hook-matcher-reachability.test.js` already
   generalizes; confirm it covers the new script).

**Verification:** `npm test` — nudge fires on the second member and not the
first; carries P0/P1 detail; does not fire when an initiative covers the work;
fires at most once per member-pair; is silent outside an ecosystem; **and is
reachable through every adapter's registered matcher.**

---

## Group 4 — Doc-sync delivery, Rule rewrite, parity *(Sequential — needs G2 + G3)*

**Sequential.** Depends on Groups 2 and 3.
**Commit:** `feat(ecosystem): cross-repo doc-sync delivery + rule rewrite`

1. **Handoff-delivered cross-repo doc sync (E6).** `/sync-docs` keeps its
   ownership rule verbatim — it still never edits a `../` path. What changes is
   the delivery: partitioned cross-repo entries are written as a structured
   handoff into the target member's `.momentum/inbox/`, which the receiving
   session surfaces at SessionStart via `/continue`. The current behavior
   (flag it in chat) is a message that dies with the context — which is why one
   reviewed session's glossary propagation never happened despite the rule
   working exactly as designed.

2. **Ecosystem-tier Rule rewrite (E7).** State precisely what is enforced:
   - the routing **nudge** is best-effort — an agent hook, bypassable by
     worktrees, forge merges, and container-dir launches
   - the **landing gate** is enforced — it refuses
   - the **write path** is unconditional — a git hook, agent-independent

   Remove 31a's "convention, not enforcement" phrasing where it is now wrong,
   and do **not** replace it with a blanket "enforced" claim. Add a test
   asserting the rules text contains the distinction, so this cannot silently
   drift back (the BUG-009 lesson, mechanized).

3. **Adapter parity + fingerprints** — 4 adapters, `--check` before every
   re-baseline to prove the drift is exactly the intended surface.

**Verification:** `npm test` + `momentum okf check`.

---

## Group 5 — Verification & release prep *(Sequential — last)*

**Sequential.** Depends on all prior groups.
**Commit:** `test(ecosystem): two-clone enforcement e2e`

1. **Two-clone e2e** — one scenario asserting every acceptance criterion:
   uncovered second-member edit → nudge with P0 detail → commit banner →
   initiative opened → out-of-order land refused → in-order land accepted →
   last-member integration verify → cross-repo sync handoff delivered.
2. **Full suite** + **236 swarm green** + no-ecosystem byte-unchanged.
3. **Self-repo dogfood** — this repo is a live `cerebrio-ecosystem` member; the
   Phase 20 lesson says synthetic-only evidence does not count.
4. **`/sync-docs`** → retrospective → `/complete-phase` at the operator gate.

**Verification:** `npm test` green; evidence under
`specs/phases/phase-31b-ecosystem-enforcement/evidence/`.

---

## Reference Specs

- `specs/architecture/ecosystem.md` — the ecosystem architecture doc. Read as a
  stable reference during implementation (Rule 10); any gap found is logged as
  `[ARCH_CHANGE]` in `history.md` and reconciled at `/sync-docs`, never edited
  mid-phase.
- `specs/decisions/0016-ecosystem-lifecycle-spine.md` — ADR-0016. This phase
  closes the gap its D8 declared and corrects that wording (E7).
- `specs/decisions/0009-*` — the trust-layer/mechanism separation the new config
  keys follow.

---

## Risks

| Risk | Mitigation |
|---|---|
| PreToolUse cost on **every** edit | Fast non-ecosystem exit before any parsing; cached member resolution; the coverage query is pure file reads with no git calls. Measure it (31a measured the post-commit hook rather than estimating; do the same here). |
| Nudge fatigue → agents learn to ignore it | Once per session per member-pair, never per edit. If it fires more than a couple of times in a session, the design is wrong. |
| False landing blocks from a wrong edge | Blocker named precisely; `--force-order` documented and auditable; `landing_order: warn` for projects whose edges are not yet trustworthy. |
| `--force-order` becomes the habitual bypass | It records a `land` event flagged `forced`, so overuse is visible in the event stream rather than invisible — the `MOMENTUM_SKIP_HOOKS` precedent over the `--no-verify` one. |
| Rules overclaiming again | G4 ships a test asserting the nudge/gate distinction is present in the rules text. |
| Scope creep | The out-of-scope list in `overview.md` is binding. New findings go to backlog (Rule 14). |
