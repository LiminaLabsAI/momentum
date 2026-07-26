---
type: History
status: planned
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
