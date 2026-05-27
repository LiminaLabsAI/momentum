# Phase 7a — Planning Contracts: Retrospective

> **Released**: v0.8.0 (2026-05-27)

## What Shipped

**Pillar A — Brainstorm Gate Contract (write discipline)**
- `core/commands/brainstorm-phase.md`, `brainstorm-idea.md`, `start-project.md` each carry a `## Brainstorm Gate Contract` section with sentinel lifecycle, red-flag table, and anti-rationalization counters
- New Step 0 in each command creates `.momentum/brainstorm-active`; the approval step removes it before writes
- `adapters/claude-code/scripts/brainstorm-gate.sh` — pure-bash PreToolUse hook (with jq + regex-fallback JSON parsing) that blocks `Write`/`Edit`/`MultiEdit` to `specs/**` while the sentinel exists; fails open on missing env or malformed input
- `adapters/claude-code/settings.json` registers the PreToolUse hook alongside the existing PostToolUse history-reminder

**Pillar B — Autonomous Execution Contract (engine target)**
- `core/commands/start-phase.md` rewritten with two new sections: an 8-step per-group execution loop and the full Autonomous Execution Contract (hard stop, discretionary stop, pre-authorized actions, anti-patterns, Rule 6/8/12 cross-refs)
- Contract is spec-only; engine implementation deferred to Phase 7b — the engine reads this contract as its operating rules

**Internal quality**
- 34 new tests (`tests/brainstorm-gate.test.js` 10, `tests/start-phase-contract.test.js` 7, `tests/command-gates.test.js` 17) — actually invoke the hook binary via `spawnSync` with synthetic Claude Code JSON; assert presence and structure of every contract section
- `package.json` test glob tightened `tests/` → `tests/*.test.js` so macOS AppleDouble `._*.test.js` no longer load as tests
- `.gitignore` at repo root + `core/specs-templates/` covering `._*`, `.DS_Store`, `.momentum/`, `node_modules/`, `*.log`
- `specs/phases/phase-7a-planning-contracts/contracts.md` — canonical source-of-truth for all three contract texts; downstream groups embed verbatim
- Roadmap rewritten: Phase 7 row expanded into 7a/7b/7c; Hardening & Activation inserted as Phase 8; Reach renumbered to Phase 9; Intelligence/Platform to 10/11

## What Went Well

- **Ate our own dog food.** The user said "let's start the execution" and granted authority to run end-to-end. The execution then proceeded under the very Autonomous Execution Contract being authored — Groups 0 through 4 ran without per-step approvals, hitting only the merge/release hard stop at the end. The dogfood validated the contract before the engine that obeys it was even written.
- **Three brainstorm commands hardened consistently.** A single canonical `contracts.md` defines the embedded section text once; all three commands quote it verbatim. Tests assert the marker strings are present. If they ever drift, the test suite catches it.
- **Hook smoke-tested before the test suite landed.** 6 manual scenarios in Group 2 (allow/block × tools × sentinel × path) all passed before any test file existed. The test suite (Group 4) was confirmation, not discovery.
- **Group structure held under the parallel pressure.** Groups 1 and 2 ran in parallel because they touched disjoint file sets (`core/commands/*.md` vs `adapters/claude-code/{scripts,settings.json}`). Both landed cleanly in sequence within a single execution window with no merge conflicts.
- **`/sync-docs` was unnecessary** because Rule 2 (auto-update tracking after changes) kept `status.md`, `phases/index.json`, `phases/README.md`, and `changelog/2026-05.md` current in real time during execution. The history.md log was the canonical decision record; the other docs never lagged behind it.

## What Didn't Go Well

- **AppleDouble files leaked into the brainstorm commit.** The T7 Shield external drive spawns macOS `._*` sidecar files for every file touched. The first commit (`2b1bd9f`) used `git add specs/phases/phase-7a-planning-contracts/` which swept in 4 `._*` files. Recovery cost: a follow-up `git rm --cached` + `.gitignore` commit (`3943d3a`). Lesson: when running on a non-POSIX filesystem, `.gitignore` is not optional — pull it forward to the very first commit of any phase.
- **`node:test` loaded AppleDouble files as test modules.** First `npm test` of Group 4 reported 7 spurious failures because `tests/` directory scan picked up `tests/._*.test.js`. Recovery: change the test glob to `tests/*.test.js` (bash `*` excludes leading dots). Real fix is general (not T7-specific) and now ships with v0.8.0 so other contributors on macOS won't hit it.
- **`core.fileMode=true` on the T7 Shield made every file look modified.** First `git status` of the session showed ~140 files with `100644 → 100755` mode flips. Recovery: `git config core.fileMode false` (per-clone, not committed). This is a one-time onboarding tax for anyone working on a non-POSIX-permissioned filesystem; logged as TD-004 to update `developer-guide.md` properly.
- **`developer-guide.md` is significantly stale beyond Phase 7a's scope.** Wrong git URL (`cerebrio/momentum` instead of `avinash-singh-io/momentum`), references the long-defunct `template/` directory (renamed to `core/specs-templates/` in Phase 1/3), references `install.sh` testing instead of `npm test`. Scope-limited: this phase only patches the Phase-7a-relevant content (brainstorm gate, T7 workarounds, `npm test`). Broader cleanup logged as TD-004.
- **Pre-existing `phase-7-subagent-engine` branch was a surprise.** A previous brainstorm session left an unmerged Phase 7 brainstorm + start-phase scaffolding (commits `fdc3d1d`, `476a0e2`). It surfaced during reconnaissance, not at brainstorm time. Decision: leave it intact (no destructive ops without user OK); the user can reference or delete it later. Logged in history as `[DISCOVERY]`.

## Lessons Learned

1. **Eating your own dog food in real-time is the highest-leverage validation.** Phase 7a wrote a contract AND obeyed it AND tested it AND released it AND merged it — all in a single execution arc. The contract's red-flag tables describe failure modes the model would have hit during Group 5 if the contract hadn't existed: "I'll just dump notes to disk for safekeeping," "the user approved the brainstorm, no point waiting." Knowing the contract was about to ship made it sticky in a way that reading an abstract rule never is.

2. **Hygiene fixes pull forward.** Both the `.gitignore` and the test-glob fix were originally scheduled for Group 2 and Group 4 respectively. But both became blocking earlier — the `.gitignore` after the first commit, the test glob after the first `npm test`. The right policy: when a deferred fix turns out to be blocking, pull it forward in a small dedicated commit. Don't wait for the planned group; don't pollute the planned group either.

3. **Spec-then-engine is a real shape, not a cop-out.** Splitting Phase 7 into "write the contract" (7a) and "build the engine that obeys it" (7b) was a structural decision, not a scope reduction. The contract authored in 7a is consumed by 7b as immutable input — it cannot evolve during 7b's implementation without explicit ADR-amendment. This pattern (spec phase before engine phase) is reusable for any future phase where the design decisions are big and the engine work is also big.

4. **The brainstorm gate works because both layers are in agreement.** Markdown discipline + PreToolUse hook + sentinel is three mechanisms enforcing the same intent. Each could fail individually (model ignores markdown; hook fails open on env error; sentinel deleted prematurely) but the combination is robust. This is the "defense in depth" pattern argued for in Rule 12 — applied to a workflow gate instead of a verification check.

5. **Auto mode worked, but not blindly.** The user granted end-to-end autonomy, but the model still asked a discretionary clarification (the existing `phase-7-subagent-engine` branch surprise — logged but not acted on; not a stop). This is the right shape for the contract: pre-authorize the common path, leave room for judgment on the unusual.

## Phase 7b Inputs

Surfaced during 7a brainstorm + execution as inputs for 7b:

- **Existing `phase-7-subagent-engine` branch** (commits `fdc3d1d`, `476a0e2`) contains an earlier Phase 7 brainstorm + start-phase scaffolding. The plan.md content there may inform 7b's autonomous-engine design. Reference, don't blindly adopt.
- **Contract from 7a `start-phase.md`** is the engine's operating spec. 7b cannot change it without an ADR.
- **Retry-budget 3-strikes** was deferred from 7a (Group 0 contract text says "Phase 7b will codify a 3-strikes retry budget"). 7b authors that policy and wires it into the engine.
- **Tarball-shape test (ENH-018)** was originally scoped to 7a but pushed to 7b — fits naturally with engine-level concerns about what gets shipped.
- **TDD Rule 13 (opt-in)** ships in 7b alongside the engine.

## Verification Evidence

> Per Rule 12 — captured in this session before the Release section was entered.
> Evidence log: `/tmp/phase-7a-npm-test.log`

### `npm test` — Full unit + integration test suite

```
Command: npm test
Exit code: 0

# tests 58
# suites 0
# pass 58
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 1320.982833
```

Last 25 test names (Phase 7a coverage):
```
ok 16 - brainstorm-idea.md contains the Brainstorm Gate Contract section
ok 17 - brainstorm-idea.md creates the sentinel on entry
ok 18 - brainstorm-idea.md removes the sentinel before/after approval
ok 19 - brainstorm-idea.md has the red-flags table
ok 20 - brainstorm-idea.md has anti-rationalization counters
ok 21 - start-project.md contains the Brainstorm Gate Contract section
ok 22 - start-project.md creates the sentinel on entry
ok 23 - start-project.md removes the sentinel before/after approval
ok 24 - start-project.md has the red-flags table
ok 25 - start-project.md has anti-rationalization counters
ok 26 - claude-code settings.json registers the brainstorm-gate PreToolUse hook
ok 27 - claude-code settings.json preserves the existing PostToolUse history-reminder hook
ok 28 - init — fresh install produces all expected files
ok 29 - init — CLAUDE.md ships all 12 rules
ok 30 - init — skip-if-exists preserves user content in agent-rules/project.md
ok 31 - init — unknown agent exits non-zero
ok 32 - init — deprecated --coding-agent flag exits with rename hint
ok 47 - start-phase.md contains the Autonomous Execution Contract section
ok 48 - start-phase.md declares the hard stop at merge + release
ok 49 - start-phase.md lists pre-authorized actions
ok 50 - start-phase.md has the anti-pattern table
ok 51 - start-phase.md cross-references Rules 6, 8, 12
ok 52 - start-phase.md has the per-group execution loop section
ok 53 - start-phase.md keeps the original setup steps
ok 58 - upgrade — adapter overlay files are present after upgrade on a project that lacked them
```

### Smoke 1 — Hook script blocks Write to specs/ during active sentinel (Group 2 dogfood)

```
Command: 6-scenario manual invocation of brainstorm-gate.sh via stdin

Scenario A: Read tool, no sentinel              → exit 0  ✓
Scenario B: Write, no sentinel                  → exit 0  ✓
Scenario C: Write, sentinel, path in specs/     → exit 2 + stderr  ✓
Scenario D: Write, sentinel, path outside specs → exit 0  ✓
Scenario E: Edit, sentinel, path in specs/      → exit 2  ✓
Scenario F: MultiEdit, sentinel, relative path  → exit 2  ✓
```

### Smoke 2 — Fresh `momentum init --agent claude-code` ships the new hook

```
Command: node bin/momentum.js init /tmp/momentum-phase7a-smoke
Exit code: 0

Asserts:
  - scripts/brainstorm-gate.sh present (overlaid from adapters/claude-code/scripts/)
  - scripts/brainstorm-gate.sh has executable bit set
  - .claude/settings.json has PreToolUse hook with matcher "Write|Edit|MultiEdit"
  - .claude/settings.json preserves existing PostToolUse history-reminder hook
```

### Smoke 3 — End-to-end phase execution under the autonomy contract (this very session)

```
Run: brainstorm Phase 7a → user approval → /start-phase ops → Groups 0-5 → STOP at merge gate

Asserts (per autonomy contract):
  - 8 implementation commits landed without per-group approval prompts
  - Each group ran verification before marking [x]
  - tasks.md, history.md, status.md kept current via Rule 2 (auto-tracking)
  - Engine STOPPED at the merge/release gate (the contract's single hard stop)
  - User approved the release; npm test rerun under /complete-phase confirmed evidence
```

Conclusion: the contract authored in this phase governed this phase's own execution. The hard stop fired correctly. Rule 12 evidence captured before this Release section was entered.
