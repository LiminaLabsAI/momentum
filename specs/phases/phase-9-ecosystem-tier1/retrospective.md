# Phase 9 — Ecosystem (Tier 1): Retrospective

> Completed 2026-06-07. Released as v0.12.0.

## Goal vs. outcome

**Goal:** Add a thin, strictly-additive multi-repo coordination layer so
work spanning multiple momentum-installed repos in one session doesn't
lose momentum's tracking benefits. The cerebrio constellation
(sapience + frontend + infra + others) was the proving ground.

**Outcome:** Delivered the full Tier 1 surface — manifest, initiatives,
auto session log, four CLI subcommands, three slash-command recipes,
schemas, architecture doc, README section, and 30+ tests. All 9
acceptance criteria from overview.md met; single-repo momentum behaves
identically when no ecosystem root is present.

## What went well

1. **The brainstorm did its job.** Five locked decisions in PR #1
   (additive design, separate-git-repo storage, auto-log via hook,
   `add` opt-in, Phase 9 slot) flowed into a plan whose group
   structure mapped 1:1 to commits. No mid-implementation reshape.

2. **Zero-dependency posture held.** Both lib modules
   (`core/ecosystem/lib/index.js`, `lib/initiative.js`) are pure
   Node stdlib. validateManifest and the YAML parser are hand-rolled
   to mirror their JSON Schemas — momentum CLI still ships zero
   runtime deps.

3. **Hook extension was surgical.** The existing
   `check-history-reminder.sh` PostToolUse hook gained ~40 lines
   that route to `session-append.sh` when commit/PR events fire.
   Existing phase-history reminder behavior is byte-identical when
   not in an ecosystem (verified by test 99/101 — the unchanged
   reminder still fires for `Edit` on `specs/status.md`).

4. **End-to-end smoke testing caught issues early.** A tmpdir smoke
   test (ecosystem init → add member → 2 commits in member → check
   session log) ran inline several times during implementation,
   catching the stderr leak from `git status` on non-git members
   before users would have seen it.

5. **Parallel-group structure (G1+G2+G3) shipped as planned.**
   None of the three groups blocked each other; they shared only
   Group 0's schemas.

## What didn't go well

1. **Underestimated test count.** Plan estimated ~12 new tests; the
   reality was 30+. Bigger surface than the original estimate (CLI
   has more pre-flight cases than expected; YAML round-trip needed
   more coverage; hook needed orphan + active-banner cases).

2. **macOS symlink resolution bit the test suite.** First test run
   failed 3/101 — `/var/folders/...` vs `/private/var/folders/...`
   from `fs.realpathSync` not matching `path.resolve`. Easy fix
   (use `path.resolve` consistently in test assertions) but should
   have been caught in the plan with a "cross-platform" note.

3. **History entries written out of order.** Inserting Group 4-6
   entries above the Group 3 anchor produced a `0 1 2 4 5 6 3` chronology
   in history.md. Append-only Rule 8 was technically honored
   (no entries modified) but the read-order is now inconsistent.
   Lesson: for future phases, append at end-of-file, not before an
   anchor.

4. **Phase 8 unmerged when Phase 9 started.** The roadmap and
   index.json reflected staging-vs-main drift from Phase 8 sitting
   on its branch. Phase 9 bookkeeping noted this honestly (status
   line + rationale) but didn't resolve it. Phase 8's release is
   queued as a separate workstream.

## Lessons learned

1. **Group 0 first, always.** Schema + lib + layout doc before any
   CLI surface. Made Groups 1-3 trivially parallel.

2. **Hand-roll the validators when the schema is small.** Adding ajv
   would have shaved ~150 LOC of validation code but added a runtime
   dep. The trade-off favored hand-rolling. Re-confirm if the schema
   surface grows >5x.

3. **Discovery via walk-up beats env vars.** No `$MOMENTUM_ECOSYSTEM_ROOT`
   env var needed — the hook just walks up looking for siblings.
   Self-contained, survives tab-switching across terminals, works in
   CI without setup.

4. **Strictly-additive design pays.** The only touch on member repos
   is one fenced HTML-commented line in CLAUDE.md / AGENTS.md.
   Reversible. Read-only otherwise. Users can opt out by
   `git rm`-ing the manifest entry and the fenced block — no manual
   cleanup of anyone's `specs/`.

## Cross-repo impact

This phase's design was directly informed by a 2026-06-05 → 2026-06-07
session in the **cerebrio constellation** (sapience + frontend + infra
shipping the Memory module v1 + multiple P0 hotfixes). That session
exposed every single-repo limitation that Tier 1 addresses. Initiative
`0001-memory-module` will retroactively capture that work once an
ecosystem is bootstrapped over cerebrio (per the [NOTE] history entry).

## Tier 2 follow-ups (deferred)

- `/switch-repo` with context carry-over
- Federated impact-map / cross-repo `/sync-docs`
- Shared rules of record (Rules 1–12 single source)
- Deploy-order awareness / merge-order enforcement
- Multi-repo `/review-code`
- Inter-repo parallel agent orchestration (extending Phase 8)

Tracked as the Phase 13 "Platform" entry in roadmap.md (alongside
MCP / `/specify` / `/decide`).

## Verification Evidence

Captured fresh during `/complete-phase` on 2026-06-07.

### `npm test`

Exit code: 0.

```
1..101
# tests 101
# suites 0
# pass 101
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 5138.267166
```

Full log archived at `/tmp/momentum-phase-9-test.log` during the
release-day session; abbreviated tail (last passing tests + counts)
shown above. The new Phase 9 suites contributed:

- `tests/ecosystem-cli.test.js` — 13 tests
- `tests/ecosystem-initiative.test.js` — 10 tests
- `tests/ecosystem-hook.test.js` — 7 tests

Previously: 64 tests. After Phase 9: 101 tests. +37 net.

### End-to-end smoke (manual, executed during impl + at completion)

```
$ node bin/momentum.js ecosystem init demo                    # → "Initialized ecosystem demo"
$ node bin/momentum.js ecosystem add ../member-a              # → "Added member member-a (platform)"
$ node bin/momentum.js ecosystem status                       # → manifest + git state
$ node bin/momentum.js ecosystem add ../member-a              # → "No changes" (idempotent)
$ # in member-a: git commit -m "noop"                         # → triggers PostToolUse hook
$ cat ../demo/sessions/$(date -u +%F).md                      # → header + commit line
$ node bin/momentum.js ecosystem remove member-a              # → manifest + pointer stripped
```

All steps observed at expected outcomes. No errors, no stderr leaks
(after the v0.12.0-RC1 fix that suppressed `git status` stderr in
`printGitState`).
