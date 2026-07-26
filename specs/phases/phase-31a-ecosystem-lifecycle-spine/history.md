---
type: History
status: in-progress
---

# Phase 31a — Ecosystem Lifecycle Spine — History

### [DISCOVERY] 2026-07-26 — Five-session ecosystem review: records without writers
Topics: ecosystem, multi-repo, session-log, initiative, enforcement, review
Affects-phases: phase-31a-ecosystem-lifecycle-spine
Affects-specs: specs/backlog/backlog.md
Detail: Operator supplied retrospectives from five independent multi-repo
sessions. Grounding each claim against the code found the ecosystem tier ships
its data model without a write path: `Deploy chronology` / `Per-repo
contributions` / `Linked decisions` exist in the initiative template with **zero
code references**; `ecosystem.json` `dependencies[]` is initialized empty and
pruned on `remove` but **no command ever adds an edge**; `complete-phase.md`
contains zero occurrences of ecosystem or initiative; `momentum lanes` has no
ecosystem awareness; and nothing anywhere detects that a session has touched a
second member repo. Filed as ENH-066/067/068 + TD-011.

---

### [DISCOVERY] 2026-07-26 — BUG-028: ecosystem session log is dead code on Claude Code
Topics: bug-028, hooks, matcher, session-log, claude-code, adapter-parity
Affects-phases: phase-31a-ecosystem-lifecycle-spine
Affects-specs: adapters/claude-code/settings.json, core/scripts/check-history-reminder.sh
Detail: `check-history-reminder.sh:95` guards the ecosystem session-log append on
`tool_name = "Bash"` — the only code path that writes commit/PR events to
`sessions/`. But `adapters/claude-code/settings.json:15` registers that hook with
matcher `"Edit|Write"`, so Bash events never reach it. Codex uses
`apply_patch|Bash`; opencode delegates bash explicitly. **Claude Code — the
default adapter — is the only one broken.** `tests/ecosystem-hook.test.js:140`
passes because it pipes `tool_name:'Bash'` directly into the script, bypassing
the matcher entirely. This is BUG-007's exact class (Codex `apply_patch|shell`
never matching `Bash`) recurring on a second adapter, with the same
synthetic-test-masks-dead-wiring signature. Explains the `sessions/` = only
`.gitkeep` evidence reported independently by two of the five sessions. The fix
is one line; the durable fix is a test that reads the installed matcher and fails
when a hook guards on a tool its own matcher can never deliver.

---

### [DECISION] 2026-07-26 — D1: enforcement axis moves to git, not agent tool-hooks
Topics: adr-0016, enforcement, git-native, worktrees, forge-api
Affects-phases: phase-31a-ecosystem-lifecycle-spine
Affects-specs: specs/decisions/0016-ecosystem-lifecycle-spine.md
Detail: Operator decision. Momentum's gates live on the agent tool-hook axis,
which cross-repo work routinely bypasses in three ways: lane worktrees (the flow
Rule 15 itself recommends), forge-API merges, and sessions launched from a
container directory that is neither the ecosystem root nor a member. Git hooks
fire regardless of agent, cwd, or launch directory and need no per-adapter
parity work. Consistent with the git-native direction of ADR-0012/0015. Agent
hooks are demoted to in-session nudges; they are not the mechanism.

---

### [DECISION] 2026-07-26 — D2/D3: cross-repo entry is brainstorm→initiative, mirroring Rule 1
Topics: adr-0016, initiative, lifecycle, routing, symmetry
Affects-phases: phase-31a-ecosystem-lifecycle-spine
Affects-specs: specs/decisions/0016-ecosystem-lifecycle-spine.md
Detail: Operator rejected all four proposed gate designs (block-at-landing,
warn+auto-record, block-at-edit, combined) in favor of a stronger answer: when a
session begins cross-repo work with no initiative, momentum should **brainstorm
with the user first, produce the initiative, then run the identical lifecycle
structure**. This reuses a proven momentum pattern — Rule 1's unfounded-project
route, which does not block or warn but routes to `/start-project` to author the
missing foundational record (ADR-0008). The initiative lifecycle therefore
becomes a structural mirror of the phase lifecycle one tier up:
`/brainstorm-initiative` → `initiative start` → work → sync →
`/complete-initiative`, with the same gate contract and the same Rule 12
evidence discipline. Near-zero new vocabulary for any agent.

---

### [ARCH_CHANGE] 2026-07-26 — D4: no new unit of cross-repo work; complete the existing spine
Topics: adr-0016, initiative, swarm, architecture, concept-space
Affects-phases: phase-31a-ecosystem-lifecycle-spine
Affects-specs: core/swarm/schema/manifest.schema.json, core/ecosystem/lib/initiative.js
Detail: An initial read suggested `initiative` / `swarm` / `dispatch` were
overlapping cross-repo concepts needing unification. Checking the code corrected
this: `core/swarm/schema/manifest.schema.json:8` makes `initiative` a **required**
field that "must reference a real `<eco>/initiatives/NNNN-<slug>.md`";
`conductor.js:88` validates the slug; phase briefs carry `initiative:`
frontmatter; `start-phase` reads `MOMENTUM_SWARM_INITIATIVE`. The concept space
is already correctly layered — initiative = the unit of cross-repo work, swarm =
its parallel execution engine, member phase = the per-repo lane. What is missing
is the middle: you can `create` an initiative, and a full `/swarm` is wired
end-to-end, but nothing connects the two and nothing writes results back. This
phase completes the middle and introduces no fourth concept.

---

### [DECISION] 2026-07-26 — D6: integration verification is config-declared, not owned
Topics: adr-0016, verification, rule-12, forge-neutral, config
Affects-phases: phase-31a-ecosystem-lifecycle-spine
Affects-specs: specs/config.md, specs/decisions/0016-ecosystem-lifecycle-spine.md
Detail: Two of the five sessions shipped production defects (alembic multiple
heads; a message-less evidence turn) that a cross-repo integration verify would
have caught. momentum is forge-neutral and ships no CI, so it cannot own that
check. Resolution follows ADR-0009's separation: `complete-initiative` **always**
requires per-member Rule 12 evidence, and additionally requires an ecosystem
`integration_verify_command` **when declared**. When undeclared, the gate says so
explicitly in its output — a missing integration verify is a stated gap, never a
silent pass.

---

### [SCOPE_CHANGE] 2026-07-26 — 31a/31b split; routing is convention in 31a (D7/D8/D9)
Topics: scope, phasing, renumber, honesty, bug-009
Affects-phases: phase-31a-ecosystem-lifecycle-spine, phase-32-intelligence, phase-33-platform
Affects-specs: specs/status.md, specs/planning/roadmap.md
Detail: Operator chose a two-phase arc over a single phase or a 30a/b/c-style
three-phase split. 31a ships the spine (lifecycle + git-native write path +
completion gate) and is independently dogfoodable; 31b ships enforcement
(mid-session cross-repo detection and routing, fleet orient, dependency-ordered
landing, cross-repo doc-sync delivery). Consequence made explicit as D8: in 31a
the routing rule is **agent-convention**, and the rules text will say so rather
than implying enforcement — BUG-009 was filed against Rule 6 for exactly that
overstatement, and this phase will not repeat it. Renumber: Intelligence → 32,
Platform → 33.

---
### [DECISION] 2026-07-27 — G0 complete: ADR-0016 authored + contracts landed
Topics: adr-0016, g0, contracts, ecosystem-config, initiative-contributions
Affects-phases: phase-31a-ecosystem-lifecycle-spine
Affects-specs: specs/decisions/0016-ecosystem-lifecycle-spine.md, core/ecosystem/schema/ecosystem.schema.json, core/ecosystem/schema/initiative.schema.json
Detail: Group 0 done. ADR-0016 records D1–D8: enforcement axis moves to
git-native/event-sourced; cross-repo entry routes to a brainstorm rather than
blocking (mirroring Rule 1's unfounded-project route, ADR-0008); the initiative
lifecycle is a structural mirror of the phase lifecycle; no new unit of
cross-repo work; integration verification is config-declared not owned; and 31a's
routing is labelled agent-convention, not enforcement (the BUG-009 lesson).
Two additive schema surfaces landed: `ecosystem.json.config` carrying
`integration_verify_command` (the coordination root has no `specs/`, so
`specs/config.md` is unavailable to it) with `readEcosystemConfig()` returning
null when undeclared; and initiative frontmatter `contributions[]`. Dependency
edges gained an optional `initiative` field recording which initiative
registered them. Both surfaces are strictly additive — pre-31a manifests and
initiatives validate unchanged, asserted explicitly. Suite 1028 → 1046.

---

### [ARCH_CHANGE] 2026-07-27 — contributions are flat triples, and carry no status
Topics: initiative-contributions, frontmatter, serializer, rule-12, adr-0016
Affects-phases: phase-31a-ecosystem-lifecycle-spine
Affects-specs: core/ecosystem/schema/initiative.schema.json, core/ecosystem/lib/initiative.js
Detail: `contributions[]` was first designed as an array of objects
({member, kind, ref, status, evidence}). Inspecting the serializer before
building on it found this cannot work: `serializeFrontmatter` flattens arrays
via `formatScalar` → `String(v)`, so nested objects round-trip as
"[object Object]". Supporting them would mean growing a YAML implementation
inside a parser whose own header calls for staying "strict and dependency-free"
— the wrong trade for three fields. Reworked to flat `member:kind:ref` strings,
which round-trip through the existing serializer unchanged (asserted by test).
The second change is the more important one: `status` and `evidence` were
DROPPED from the record entirely. A completion status the agent previously wrote
into the initiative is self-reported completion, which is exactly what Rule 12
exists to reject — so `initiative complete` (G3) must resolve both LIVE from
each member's own record instead of trusting a cached field. The data model got
smaller and more correct at the same time.

---

### [DISCOVERY] 2026-07-27 — BUG-028 fixed; the test that closes its class
Topics: bug-028, bug-007, hooks, matcher, dead-code, test-design
Affects-phases: phase-31a-ecosystem-lifecycle-spine
Affects-specs: adapters/claude-code/settings.json, tests/hook-matcher-reachability.test.js
Detail: Matcher fixed (`Edit|Write` → `Edit|Write|Bash`), in the shipped adapter
and in this repo's own installed `.claude/settings.json` (self-dogfood — momentum
is a `cerebrio-ecosystem` member and was subject to its own bug). The durable
half is `tests/hook-matcher-reachability.test.js`, which closes the CLASS rather
than the instance: it reads the INSTALLED adapter config and asserts that for
every explicit `$TOOL_NAME = "X"` guard in a hook script, X — when in that
adapter's tool vocabulary — is deliverable by that adapter's matcher. This is the
shape both BUG-007 and BUG-028 took, and both shipped green precisely because the
existing tests invoke the hook SCRIPT directly with a synthesized payload,
bypassing the matcher that was broken. Verified per Rule 12 by reverting the fix:
2 tests fail with the exact diagnostic, then pass once restored. Deliberately
scoped to equality guards — brainstorm-gate.sh's `case` arm lists every adapter's
tool names in one union that is intentionally broader than any single matcher, so
asserting on it would produce false positives. claude-code fingerprint
re-baselined; `--check` first proved the drift was exactly `.claude/settings.json`
with zero drift on the other three adapters.

---
### [FEATURE] 2026-07-27 — G1 complete: git-native event write path
Topics: g1, write-path, git-hooks, post-commit, worktrees, fragments, adr-0016
Affects-phases: phase-31a-ecosystem-lifecycle-spine
Affects-specs: core/git-hooks/eco-event.js, core/ecosystem/lib/events.js, bin/ecosystem.js
Detail: The ecosystem write path moves off the agent tool-hook axis onto git.
New `post-commit` / `post-merge` hooks (wrappers → `run-check.js` dispatch →
`core/git-hooks/eco-event.js`) record attributed events as per-actor fragments
in the ecosystem repo; `core/ecosystem/lib/events.js` compiles them into
`sessions/<date>.md`, exposed as `momentum ecosystem sessions [--date] [--write]`.
Three failure modes of the old path are closed at once: it now fires regardless
of which agent (or human, or script) made the commit; `git rev-parse
--git-common-dir` resolves lane worktrees to their true member where `$PWD`
matching silently dropped them (AC-1); and the line format stays byte-compatible
with what `session-append.sh` always wrote, so readers and docs are unaffected —
the change is the WRITE path, not the format. Compile-on-read is deliberate: the
hook does NOT rewrite `sessions/` per commit, since rewriting a tracked file on
every commit would reintroduce the merge conflicts fragments exist to avoid
(BUG-004's lock becomes unnecessary rather than reimplemented). Measured cost
~35ms marginal per commit (85ms vs 50ms bypassed), fail-open on every path.
Suite 1046 → 1058.

---

### [DISCOVERY] 2026-07-27 — eco-event.js would have been frozen forever by upgrade
Topics: bug-011, installer, hook-ownership, near-miss
Affects-phases: phase-31a-ecosystem-lifecycle-spine
Affects-specs: core/git-hooks/eco-event.js, tests/eco-event-write-path.test.js
Detail: `installHookFiles()` in bin/momentum.js decides whether an existing
`.githooks/` file is momentum-owned — and therefore upgradeable — by matching
/momentum[^\n]*hook/i against its CONTENT. Anything failing that check is
classified foreign and left untouched permanently. The new `eco-event.js` header
happened not to put "momentum" and "hook" on one line, so it would have
installed exactly once and then never received another update: a silently
frozen file, invisible until someone wondered why a fixed bug persisted
downstream. Caught by checking all seven hook files against the predicate before
committing rather than after. Ownership marker added with a comment explaining
why the phrasing is load-bearing, plus a test asserting every shipped hook file
satisfies it. Same family as BUG-011 (upgrade silently skipping hook installs).

---

### [ARCH_CHANGE] 2026-07-27 — hook-side writer is a fenced duplicate, by necessity
Topics: duplication, parity-test, githooks, packaging, adr-0016
Affects-phases: phase-31a-ecosystem-lifecycle-spine
Affects-specs: core/git-hooks/eco-event.js, tests/eco-event-write-path.test.js
Detail: The git hook cannot reuse `core/team/lib/fragments` — an installed
project receives NO copy of momentum's `core/` (a fresh install ships exactly
four files into `.githooks/`), and downstream repos do not depend on momentum as
a package. Verified against the fingerprint fixture rather than assumed. So
`core/git-hooks/eco-event.js` reimplements the needed slice (repo-root
resolution, ecosystem discovery, member match, actor slug, fragment write) with
node builtins only, following the precedent `contract.js` already set. Since two
silently-drifting implementations is the exact bug class this phase closes, the
duplication is fenced by a parity test asserting the hook-side writer produces
byte-identical fragment files to `core/team/lib/fragments.writeFragment`, the
same actor slugs as `core/identity`, and the same member resolution as
`core/ecosystem/lib/events`. Precedent exists in-repo: `session-append.sh` and
`state.js` already carry parallel walk implementations.

---
### [FEATURE] 2026-07-27 — G2 complete: the lifecycle head exists
Topics: g2, brainstorm-initiative, initiative-start, dependency-edges, td-011, adr-0016
Affects-phases: phase-31a-ecosystem-lifecycle-spine
Affects-specs: core/commands/brainstorm-initiative.md, bin/ecosystem.js, core/ecosystem/lib/pointer.js
Detail: Cross-repo work now has an entry point. `/brainstorm-initiative` mirrors
`/brainstorm-phase` including its gate contract (sentinel at the ecosystem root,
zero disk writes until explicit approval) and, unlike anything before it, orients
across the fleet first — reading each member's status and open P0/P1 backlog,
the exact miss that let one reviewed session rewrite a cost formatter already
tracked by BUG-001 in that repo's own backlog. `momentum ecosystem initiative
start` is wired as a real CLI subcommand (the surface had been `create`-only
since Phase 9, as bin/ecosystem.js stated outright): it declares per-member
contributions, writes the `Per-repo contributions` table, and REGISTERS
DEPENDENCY EDGES in ecosystem.json — the first code in momentum's history to
write one, closing the "the dep graph is now a lie" finding. Edges are tagged
with the initiative that discovered them. Suite 1058 → 1069.

---

### [DECISION] 2026-07-27 — `initiative start` declares and routes; it does not scaffold across repos
Topics: ownership, fan-out, initiative-start, sync-docs-boundary, adr-0016
Affects-phases: phase-31a-ecosystem-lifecycle-spine
Affects-specs: bin/ecosystem.js, core/commands/brainstorm-initiative.md
Detail: ADR-0016 described `initiative start` as a "fan-out that creates or links
a phase/ad-hoc record in each participating member". Implementing it forced the
question of whether momentum should reach into a sibling repo and scaffold
`specs/phases/<ref>/` there. Decided NO. Each member owns its own `specs/` —
that is the same boundary `/sync-docs` already enforces by refusing to touch
`../` paths, and violating it here would contradict the rule one tier down.
Equally, the operator's framing was that cross-repo work should "go through the
lifecycle in exactly the same structure": the structure that scaffolds a phase
record IS the member's own `/start-phase`. So `start` DECLARES the contributions,
registers the edges, sets the initiative active, and then ROUTES — printing the
per-member next command. A test asserts it writes nothing inside a member repo.
The word "fan-out" in ADR-0016's Decision §3 should be read as declaration +
routing, not cross-repo scaffolding.

---

### [NOTE] 2026-07-27 — the ADR-0011 projection carried the new command for free
Topics: adapter-parity, adr-0011, projection, fingerprints
Affects-phases: phase-31a-ecosystem-lifecycle-spine
Affects-specs: core/commands/brainstorm-initiative.md
Detail: Adding `core/commands/brainstorm-initiative.md` produced exactly one new
file per adapter with the correct per-adapter destination
(`.claude/commands/`, `.agents/skills/<name>/SKILL.md`, `.agents/workflows/`,
`.opencode/commands/`) with no wiring — the Phase-29 generator auto-discovers.
Worth recording because G4 budgets time for "4-adapter projection"; that line
item is effectively already satisfied for recipes, leaving only the static
recipe-set tables in each adapter's surfaces.md to update by hand.

---
