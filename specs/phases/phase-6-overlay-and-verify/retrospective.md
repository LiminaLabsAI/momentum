---
type: Retrospective
---

# Phase 6 — Adapter Overlay & Verification: Retrospective

> **Released**: v0.7.0 (2026-05-08)

## What Shipped

**Pillar A — Adapter Contract v2 (structural)**
- `bin/momentum.js install` and `upgrade` walk `core/<sub>/` first, then overlay `adapters/<chosen>/<sub>/` for `commands/`, `agent-rules/`, `scripts/` — destinations declared in adapter's `module.exports.destinations`
- Conflict detection: a filename present in both `core/` and an adapter's matching subdir aborts the CLI **before any writes** with a clear "duplicate overlay files" error
- Adapter contract documented in `adapters/claude-code/adapter.{js,sh}` headers and the new "Adapter Authors" section in root `README.md`
- Proven end-to-end by `/review-code` (Pillar B's proof-of-concept)

**Pillar B — Verification Rigor (functional)**
- **Rule 12 "Verify Before Claim"** added to `core/specs-templates/CLAUDE.md` (full hardened version: Red Flags table + 5 anti-rationalization counters, structured like Rules 10/11) and `core/agent-rules/project.md` (condensed)
- `/complete-phase` Step 3 now requires running validation commands and capturing their stdout/stderr; Step 6 appends a `## Verification Evidence` section to `retrospective.md`; the Release section is gated behind that evidence existing
- `/review-code` (Claude-Code-only overlay) — first per-agent command, dispatches three parallel Task subagents (security/OWASP+STRIDE, QA/test-coverage, architecture/rule-compliance), consolidates findings into Critical/Important/Minor severity, asks the user which to act on
- ENH-014 — Rule 9 in template + agent-rules + `/sync-docs` gain a multi-repo safeguard: never modify docs in another repo; flag `Affects-specs: ../...` entries informationally

**Internal quality**
- `tests/` directory at repo root — 24 tests via Node's built-in `node:test` (no new deps), serial runner via `--test-concurrency=1`. Coverage: marker logic (with regression guards for the Phase-5 trailing-whitespace and double-marker bugs), install (full scaffold + skip-if-exists + 12-rule check + flag handling), upgrade (no-op + extensions preserved + pre-marker migration + executable bits + overlay add-on-upgrade), overlay (recursive listing + conflict detection + CLI integration)
- `package.json` — `npm test` script wired; adapter overlay subdirs added to the published `files` array

## What Went Well

- **Two-pillar framing held under load.** The adapter-overlay-vs-verification-rigor split survived implementation: each pillar landed cleanly without the other contaminating it. Pillar A enabled Pillar B's `/review-code` proof; Pillar B's Rule 12 informed Pillar A's tests.
- **Tests caught no surprises** — the 24-test suite passes from the first commit of Group 3 onward. Phase-5 dogfood discoveries (trailing-whitespace marker, double-marker bug) are now regression-guarded, so future phases can't reintroduce them.
- **Conflict detection on the first try.** The pre-flight conflict check fires before any writes — the test asserts the target dir is empty when the CLI aborts, and that holds.
- **Dogfood revealed something real (ENH-017)** without breaking anything. The Phase 5 marker design has a known UX seam (project-name title in the managed section), and Phase 6 dogfood made it concrete enough to tag for Phase 7 instead of letting it linger as folklore.
- **Incremental Rule 2 tracking paid off at /sync-docs time.** Status, roadmap, backlog, changelog were all current as we closed the phase — `/sync-docs` had nothing to do beyond enriching the impact-map.
- **Auto mode worked for execution.** Group 0 → 1 → 2 → 3 → 4 → 5 ran without per-step approval. The decisions were all locked in brainstorm; the execution was mechanical.

## What Didn't Go Well

- **`npm test` initially failed with concurrent-file races.** Two tests failed because the conflict-detection test in `overlay.test.js` mutates the real `adapters/claude-code/commands/` dir, and parallel test files (default Node test runner behavior) caught the polluted state. Fixed by adding `--test-concurrency=1` to the npm script. A cleaner long-term fix would be to make the conflict test use an isolated mini-momentum fixture in `/tmp` so concurrency could be re-enabled — logged as soft tech debt; not worth a backlog item yet.
- **`.agent/rules/project.md` was older than expected.** The repo's local `.agent/rules/project.md` hadn't been kept in sync — it was still the pre-Phase-5 condensed rules with old wording for Rule 10 and no Rule 11. The marker-aware migration handled it correctly (back up + write fresh + append old under marker), but the appended legacy content was just stale duplicate rule definitions and had to be de-duped manually. The migration design is sound; the lesson is that the dogfood needs to be exercised more often so drift doesn't compound.
- **Project-name customization is fragile.** ENH-017 (title in CLAUDE.md gets reset on upgrade) is a UX paper-cut that's been latent since Phase 5 marker design. The Phase 5 brainstorm chose to put the marker AFTER the title for self-documentation reasons, but didn't grapple with what the title customization workflow actually looked like. That's now Phase 7 work.
- **Stale `brainstorm-project.md` lingered for 3+ phases.** It was renamed in Phase 3 (ENH-006) but never deleted from the repo's local install — `momentum upgrade` only adds/updates, never removes. Removed manually during dogfood. An "orphan command sweep" is a real feature ask but is risky (could delete user-created commands) so not pursued. Worth revisiting if more orphans accumulate.

## Lessons Learned

1. **Brainstorm is where the phase wins or loses.** Phase 6 had three meaningful brainstorm rounds (initial scope, "this should be generic", "let's do roadmap commitment for Phase 7+"). Each round narrowed scope and clarified the structural-vs-functional split. By the time Group 0 started, every implementation decision was already pre-decided — execution was 90% mechanical. This is the cleanest brainstorm-to-execution ratio across phases 0-6.

2. **The right way to ship Claude-Code-specific features is the overlay, not branching `core/`.** Before Phase 6, the only way to add a Claude-Code-specific command would have been to either (a) lobotomize it to fit `core/` or (b) put per-agent forks inside `core/` files. Both are wrong. The overlay is the third option that didn't exist before. Phase 7's subagent execution engine, SessionStart hook, and the rest of the v2-improvement-ideas Tier 2 list all assume this overlay structure.

3. **Persuasion-hardening pays off at the moment of slippage.** Rule 12's Red Flags + anti-rationalization counters were not abstractly satisfying when written — they read like over-engineering. But the moment of `/complete-phase` is exactly when an agent would think "I'm confident this works, the changes are obviously correct, let me skip the test run." The hardening is the rule literally arguing back at that internal voice. Worth replicating for the rules that haven't been hardened yet (1/3/4/5/7/9 in Phase 7, evidence-permitting).

4. **Tests for the CLI itself are the highest-leverage Phase 6 deliverable.** Every Phase 0–5 release shipped at least one bug caught only by smoke testing. The 24-test suite makes that class of bug a CI-level error going forward. The cost was ~2 hours of work; the long-term saving is massive. We should have done this in Phase 4.

5. **Dogfood is where you learn what your tool actually does.** The Phase 6 dogfood surfaced ENH-017, a stale agent-rules file, and an orphan brainstorm-project.md. Without dogfooding, all three would have shipped to users. The pattern is: every phase's last sub-step should be dogfood, regardless of how mechanical the phase looks.

## Phase 7 Inputs

The dogfood and execution surfaced these inputs for Phase 7 brainstorm:

- ENH-017 (project-name customization survives upgrade) — concrete user-facing UX issue, not speculative
- The serial-test workaround (`--test-concurrency=1`) — minor tech debt; revisit if test count grows
- Rules 1/3/4/5/7/9 hardening candidates — only with actual slippage evidence; not speculative

## Verification Evidence

> Per Rule 12 — captured in this session before the Release section was entered.
> Evidence dir: `/tmp/phase-6-evidence-12958/`

### `npm test` — Full unit + integration test suite

```
Command: npm test
Exit code: 0

# tests 24
# suites 0
# pass 24
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 848.530291
```

Last 30 lines of output (per-test summary):
```
ok 17 - detectOverlayConflicts — flags duplicate filenames per subdir
ok 18 - CLI install — exits non-zero with conflict listed BEFORE writes
ok 19 - CLI install — adapter overlay file lands in target
ok 20 - upgrade — no-op on freshly-installed project reports unchanged
ok 21 - upgrade — preserves Project Extensions byte-for-byte
ok 22 - upgrade — pre-marker file gets backed up and migrated
ok 23 - upgrade — script files keep their executable bit
ok 24 - upgrade — adapter overlay files are present after upgrade on a project that lacked them
```

### Smoke 1 — Fresh `momentum init --agent claude-code`

```
Command: rm -rf /tmp/momentum-final-smoke && node bin/momentum.js init /tmp/momentum-final-smoke
Exit code: 0

Asserts:
  - grep -c "^### Rule " CLAUDE.md  → 12
  - .claude/commands/review-code.md → present (sourced from adapter overlay)
```

### Smoke 2 — Conflict detection aborts before any writes

```
Command (after placing a duplicate adapters/claude-code/commands/log.md):
  rm -rf /tmp/momentum-final-conflict
  node bin/momentum.js init /tmp/momentum-final-conflict
Exit code: 1 (expected non-zero)

Output:
Error: duplicate overlay files in core/ and adapters/claude-code/.
Each file may live in EITHER core/ OR exactly one adapter, never both.
  - commands/log.md

Resolution: keep the file in core/ if it is generic across agents, or in
adapters/<agent>/ if it exploits an agent-specific capability. Delete the
duplicate from the other location.

Asserts:
  - exit code: 1 (non-zero)
  - target dir /tmp/momentum-final-conflict was NEVER created (no writes pre-conflict)
```

### Smoke 3 — Dogfood: `momentum upgrade` on this repo

```
Command: node bin/momentum.js upgrade .
Exit code: 0

Output:
→ Upgrading slash commands...
  ↑ upgraded: .claude/commands/complete-phase.md (original saved as .bak)
  ↑ upgraded: .claude/commands/sync-docs.md (original saved as .bak)
→ Upgrading hook scripts...
→ Upgrading agent rules...
  ↻ migrated: .agent/rules/project.md (no marker — original saved as .bak)
→ Upgrading CLAUDE.md...
  ↑ upgraded: CLAUDE.md (managed section replaced; extensions preserved; original saved as .bak)
→ Overlaying (upgrade) commands from adapter...
  + added:    .claude/commands/review-code.md
→ Upgrading Claude Code hooks...

✓ Upgrade complete.
  CLAUDE.md:           updated
  agent-rules:         migrated
```
