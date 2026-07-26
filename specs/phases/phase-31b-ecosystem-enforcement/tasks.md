---
type: Tasks
status: in-progress
---

# Phase 31b — Ecosystem Enforcement — Tasks

> Mirrors `plan.md`. `[x]` done · `[/]` in-progress · `[ ]` todo. Verify before
> claiming done (Rule 12). Execution: G0 → (G1 ∥ G3) → G2 → G4 → G5.
> Closes ENH-067 + ENH-068. Target v0.41.0.
> Lane `phase-31b-ecosystem-enforcement`.

## Group 0 — Contracts *(blocks)* ✅
- [x] Author **ADR-0017** — Layered Ecosystem Enforcement (E1–E7)
- [x] `core/ecosystem/lib/detect.js` — `touchedMembers` / `coverage` / `openInitiatives` / `detect`
- [x] Coverage counts only **in-progress** initiatives (asserted: a closed one covers nothing)
- [x] **Partial coverage does not count** — the unplanned member is precisely the point; it's named in `uncovered[]`
- [x] `contributions[]` count toward coverage, not just `repos[]`
- [x] `opts.extra` folds in a member with no event yet — the PreToolUse case, since the nudge must fire *before* the commit
- [x] Pure over the fragment stream + `initiatives/` — **no git calls**, asserted by a source guard
- [x] `land` event kind added to `EVENT_KINDS`
- [x] Config keys: `detect_window_hours` (null when undeclared), `landing_order` (`enforce`|`warn`|`off`, **defaults to enforce** — a gate momentum derives itself must not silently default off)
- [x] Tests: covered / uncovered / single-member / closed-initiative / partial / per-actor / window / absent-ecosystem
- [x] Updated a 31a assertion that deep-equalled the whole config object — now per-key, since the surface is designed to grow
- [x] Verify `npm test` green — **1098/1098** (+14 from 1084); commit G0

## Group 1 — Fleet orient (ENH-067) *(∥ G3)* ✅
- [x] `core/ecosystem/lib/orient.js` — per-member summary by file parsing only
- [x] Active phase from the member's `specs/status.md` Active Phase table (handles "(none active)", separators, headers)
- [x] Open **P0/P1** items from the member's backlog — resolved and P2/P3 excluded; **P0 sorted first**
- [x] Lane state from the member's lane registry when present
- [x] **Degrades, never throws** — missing checkout, no `specs/`, corrupt tables all yield partial summaries (asserted)
- [x] `momentum ecosystem status` renders it; **`--brief` preserves pre-31b output** for scripts
- [x] SessionStart banner carries a `▸ Fleet:` line; best-effort and silent on any failure
- [x] **Made `orient.js` dependency-free and shipped it into `scripts/`** — an installed project has no `core/`, the same packaging constraint that forced `eco-event.js` to stand alone in 31a. Guarded by a test asserting it requires only `fs`/`path`
- [x] `momentum init`/`upgrade` install it; asserted by test
- [x] **Live dogfood found a usability defect**: real backlog titles run to full paragraphs, making the fleet view unreadable — added `condense()` (strips detail links / code fences / bold, cuts at a natural break, hard-caps at 72)
- [x] Verified live against the real 8-member `cerebrio-ecosystem`
- [x] 4 fingerprints re-baselined (`--check` first: identical 2-file drift)
- [x] Verify `npm test` green — **1108/1108** (+24 from 1084); commit G1

## Group 3 — Dependency-ordered landing gate (ENH-068) *(∥ G1)*
- [ ] `lanes land` resolves the active initiative + this member's upstream edges
- [ ] Upstream = every edge where `from == this member`; those `to` members land first
- [ ] Require a recorded `land` event per upstream since the initiative started
- [ ] **Refuse with the blocker named** — member, its contribution, and the edge kind (AC-5)
- [ ] Integration verify required before the **LAST** member lands (AC-6)
- [ ] Record a `land` event on successful `--execute`
- [ ] `--force-order` override — lands, records the event flagged `forced`, warns loudly
- [ ] `landing_order: warn|off` relaxes the gate for untrustworthy edge graphs
- [ ] **Solo-safe** — no ecosystem / no initiative / no edges → behaviour identical to today (asserted, not assumed)
- [ ] Test: out-of-order land refused; in-order sequence passes; last-member verify blocks; `--force-order` marks the event; solo repo unaffected
- [ ] Verify `npm test` green; commit G3

## Group 2 — Detection + routing nudge *(needs G1)*
- [ ] `post-commit` prints a routing banner for a commit in an uncovered second member
- [ ] Banner is **agent-independent** — fires for humans, scripts, any tool (AC-2)
- [ ] `core/scripts/cross-repo-gate.sh` — PreToolUse nudge before the write
- [ ] Fast exit when not in an ecosystem / not inside a member (the common case must be nearly free)
- [ ] **Exit 0, never 2** — advice, not a block (teeth live in G3)
- [ ] Fires **once per session per member-pair**, never per edit (nudge fatigue is how a gate becomes noise)
- [ ] **Nudge carries the target member's open P0/P1 items** (AC-4 — the BUG-001 miss)
- [ ] Projected to all 4 adapters with correct per-adapter matchers
- [ ] **Matcher-reachability asserted for the new hook** — this is exactly the BUG-007/BUG-028 shape
- [ ] Measure hook cost (31a measured rather than estimated; do the same)
- [ ] Test: fires on second member, not first; carries P0/P1; silent when covered; at most once per pair; silent outside an ecosystem
- [ ] Verify `npm test` green; commit G2

## Group 4 — Doc-sync delivery, Rule rewrite, parity *(needs G2 + G3)*
- [ ] `/sync-docs` cross-repo entries → structured handoff in the target member's `.momentum/inbox/`
- [ ] Ownership rule **unchanged** — still never edits a `../` path
- [ ] Receiving session surfaces it at SessionStart via `/continue`
- [ ] Ecosystem-tier Rule rewrite: nudge = **best-effort**, landing gate = **enforced**, write path = **unconditional**
- [ ] Remove 31a's now-wrong "convention, not enforcement" phrasing — without replacing it with a blanket "enforced" claim
- [ ] **Test asserting the rules text carries the distinction** (BUG-009 lesson, mechanized)
- [ ] 4-adapter projection + fingerprint re-baselines (`--check` first, every time)
- [ ] `momentum okf check` conformant
- [ ] Verify `npm test` green; commit G4

## Group 5 — Verification & release prep *(last)*
- [ ] Two-clone e2e: uncovered edit → nudge w/ P0 detail → commit banner → initiative opened → out-of-order land refused → in-order land → last-member verify → sync handoff delivered
- [ ] Assert every acceptance criterion
- [ ] Full suite green; **236 swarm tests green**
- [ ] No-ecosystem / solo repo byte-unchanged (incl. no PreToolUse slowdown)
- [ ] Self-repo dogfood against real activity (not synthetic — Phase 20 lesson)
- [ ] Capture evidence under `evidence/`
- [ ] `/sync-docs` → retrospective → `/complete-phase` at the operator gate
