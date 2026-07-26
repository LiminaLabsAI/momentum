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

## Group 3 — Dependency-ordered landing gate (ENH-068) *(∥ G1)* ✅
- [x] `core/ecosystem/lib/landing.js` — `landingCheck` / `checkLines` / `recordLand`
- [x] Upstream = every edge where `from == this member`; those `to` members land first (E4)
- [x] Require a recorded `land` event per upstream **for this initiative** since it started (E5)
- [x] **Refuses naming member, contribution, and edge kind** (AC-5) — "not landable" alone leaves the operator to go find out why
- [x] An edge to a member with **no contribution** does not block — a standing dependency this initiative isn't changing has nothing to land
- [x] A land event for a **different initiative** does not unblock
- [x] Integration verify required when this is the **LAST** contribution (AC-6); undeclared → explicit gap warning
- [x] `land` event recorded on successful `--execute`, carrying `initiative` and `forced`
- [x] `--force-order` — lands, records the event **flagged forced** (visible in the stream, the `MOMENTUM_SKIP_HOOKS` posture rather than `--no-verify`)
- [x] `landing_order: warn` reports without blocking; `off` disables entirely
- [x] **SOLO SAFETY asserted** — no ecosystem, non-member, member-without-initiative, and closed-initiative all return `applicable: false` with zero output
- [x] The `lanes land` call site is wrapped so an absent/unreadable ecosystem layer can never break single-repo landing
- [x] Verify `npm test` green — **1121/1121** (+37 from 1084); commit G3

## Group 2 — Detection + routing nudge *(needs G1)* ✅
- [x] `post-commit` prints a routing banner for a commit in an uncovered second member
- [x] Banner is **agent-independent** — verified by a plain `git commit` with no agent (AC-2)
- [x] `core/scripts/cross-repo-gate.sh` — PreToolUse nudge before the write
- [x] Fast exit when not in an ecosystem / not inside a member
- [x] **Exit 0, never 2** — advice, not a block (asserted by a source guard)
- [x] Fires **once per session per member** — keyed by adapter `session_id`, time-throttled (30 min) when none is supplied
- [x] **Nudge carries the target member's open P0/P1** (AC-4) — verified naming BUG-001 and its title
- [x] Degrades to a detail-free message when orient is unavailable — detail is a bonus, never a precondition
- [x] Registered on all 4 adapters (claude-code, codex, antigravity shim, opencode plugin dispatch); asserted
- [x] `cross-repo.js` **parity-fenced against `detect.js`** across every coverage case
- [x] Cost measured: ~35–50ms per call (node startup dominates)
- [x] **Three bugs caught by running it rather than reasoning about it**: `2>/dev/null` on the gate swallowed the nudge (stderr is where it writes); the same suppression in `post-commit`/`post-merge` hid the banner; and realpath asymmetry meant the nudge silently never fired for a new file in a new directory
- [x] 4 fingerprints re-baselined (`--check` first: exactly the intended 6-file surface)
- [x] Verify `npm test` green — **1131/1131** (+47 from 1084); commit G2

## Group 4 — Doc-sync delivery, Rule rewrite, parity *(needs G2 + G3)* ✅
- [x] `/sync-docs` cross-repo entries → structured handoff in the target member's `.momentum/inbox/` via the existing `orchestration.handoff` writer
- [x] **Ownership rule unchanged** — still never edits a `../` path; "Delivery is not ownership" stated explicitly
- [x] Receiving session surfaces it at SessionStart via `/continue`
- [x] Removed "they're informational only" — a chat message dies with the session, which was the entire failure
- [x] **E7 Rule rewrite**: a 3-row table stating each layer's real strength — write path **unconditional**, landing gate **enforced**, nudge **best-effort** (with *why* each is what it is)
- [x] Removed 31a's now-wrong "convention, not enforcement" phrasing from the templates and the member pointer — **without** replacing it with a blanket "enforced" claim
- [x] **Tests assert the distinction survives editing** (templates + pointer + sync-docs), mechanizing the BUG-009 lesson in both directions
- [x] Filed **TD-012** — three shipped self-contained duplicates is now a pattern; settle the packaging story before a fourth
- [x] 4 fingerprints re-baselined; `momentum okf check` **318 files conformant**
- [x] Verify `npm test` green — **1134/1134** (+50 from 1084); commit G4

## Group 5 — Verification & release prep *(last)*
- [ ] Two-clone e2e: uncovered edit → nudge w/ P0 detail → commit banner → initiative opened → out-of-order land refused → in-order land → last-member verify → sync handoff delivered
- [ ] Assert every acceptance criterion
- [ ] Full suite green; **236 swarm tests green**
- [ ] No-ecosystem / solo repo byte-unchanged (incl. no PreToolUse slowdown)
- [ ] Self-repo dogfood against real activity (not synthetic — Phase 20 lesson)
- [ ] Capture evidence under `evidence/`
- [ ] `/sync-docs` → retrospective → `/complete-phase` at the operator gate
