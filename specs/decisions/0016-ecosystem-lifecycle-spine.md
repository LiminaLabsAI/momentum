---
type: ADR
---

# ADR-0016: Ecosystem Lifecycle Spine

## Status

Accepted (Phase 31a — Ecosystem Lifecycle Spine)

## Context

Single-repo momentum is self-enforcing. Its rules are not advice the agent
chooses to follow — they are mechanism: `CLAUDE.md` is auto-loaded, a
`SessionStart` hook orients before work, `commit-msg` validates the message,
and `pre-push` blocks a protected-branch push without the single-use
`.momentum/merge-approved` sentinel. Low operator intervention is a *byproduct*
of that enforcement being local and unavoidable.

The ecosystem tier is not. On 2026-07-26 the operator supplied retrospectives
from **five independent multi-repo sessions**. Every one shipped its feature;
every one left the ecosystem's own records rotted. Grounding each claim against
the code (rather than accepting the reports) found the failures are structural,
and reducible to two causes.

### Cause 1 — the enforcement axis is wrong

Momentum's gates live on the **agent tool-hook axis** (`PreToolUse` /
`PostToolUse`). Cross-repo work constantly does the three things that bypass
that axis:

- it runs in **lane worktrees** — the flow Rule 15 itself recommends;
- it merges via the **forge API** (`gh pr merge`), which never runs a local hook;
- it launches from a **container directory** that is neither the ecosystem root
  nor any member, so no member's `CLAUDE.md` or `.claude/settings.json` loads.

A gate that a normal workflow routinely walks around is not a gate.

The sharpest instance is **BUG-028**. `core/scripts/check-history-reminder.sh`
guards the ecosystem session-log append on `tool_name = "Bash"` — the only code
path that writes commit/PR events into `<eco>/sessions/`. But
`adapters/claude-code/settings.json` registers that hook with matcher
`"Edit|Write"`, so Bash events never arrive and the branch is unreachable.
Codex uses `apply_patch|Bash`; opencode delegates bash calls explicitly. **Claude
Code — the default adapter — is the only one broken.** `tests/ecosystem-hook.test.js`
passes because it pipes `{tool_name:'Bash'}` straight into the script, bypassing
the matcher. This is **BUG-007's exact class** (Codex `apply_patch|shell` never
matching the canonical `Bash`) recurring on a second adapter, with the identical
synthetic-test-masks-dead-wiring signature. It explains, precisely, the
`sessions/` = only `.gitkeep` evidence reported independently by two sessions
after ~10 commits and 5 PRs.

A second, independent instance: `core/ecosystem/scripts/session-append.sh`
resolves member identity by realpath-matching **`$PWD`** against
`members[].path`. Work performed in a lane worktree — outside that path —
resolves to no member and silently no-ops. Momentum's own recommended
concurrency flow is invisible to its own audit trail.

### Cause 2 — the tier shipped records without writers

The data model landed in Phases 9/10; the write path never did.

| Record | Writer |
|---|---|
| `initiatives/…` `## Per-repo contributions` | none — zero code references |
| `initiatives/…` `## Linked decisions` | none |
| `initiatives/…` `## Deploy chronology` | none |
| `ecosystem.json` `dependencies[]` | initialized `[]`, pruned on `remove`; **nothing ever adds an edge** |
| `<eco>/sessions/` | dead on the default adapter (BUG-028) |

Consequences observed: a dependency graph that had silently become a lie; a
day of cross-repo work producing zero log entries; initiative chronologies
empty; and in one session two defects reaching production that a cross-repo
verification gate would have caught.

### What is NOT missing

Two findings materially narrow the problem.

**The coordination substrate exists.** Phase 30e (ADR-0015) built a real
git-native plane at the ecosystem tier: per-actor fragments with zero-conflict
merge, `refs/momentum/*` compare-and-swap leases, attributed presence,
remote-URL members. This ADR builds on it and adds no new substrate.

**The concept space is already coherent.** An initial read suggested
`initiative` / `swarm` / `dispatch` were competing cross-repo concepts. The code
says otherwise: `core/swarm/schema/manifest.schema.json` makes `initiative` a
**required** field that must reference a real `initiatives/NNNN-<slug>.md`;
`conductor.js` validates the slug; phase briefs carry `initiative:` frontmatter;
`start-phase` reads `MOMENTUM_SWARM_INITIATIVE`. The layering is already right —
**initiative = the unit of cross-repo work, swarm = its parallel execution
engine, member phase = the per-repo lane.**

What is missing is the **middle**. You can `create` an initiative
(`bin/ecosystem.js` states outright: *"Currently only `create` is…"*), and a full
`/swarm` is wired end to end — but nothing connects the two, and nothing writes
results back. The spine has a head and a tail and no body.

## Decision

### 1. Enforcement is git-native and event-sourced

The write path and the gates move onto **git itself** — `post-commit`,
`post-merge`, and `pre-push` hooks feeding the ADR-0015 fragment substrate —
not onto agent tool-hooks. Git hooks fire regardless of which agent runs, what
the cwd is, whether the checkout is a worktree, or where the session launched.
They also require no per-adapter parity work, where an agent-hook gate needs
four implementations and four fingerprint re-baselines.

Agent tool-hooks are **demoted to in-session nudges**. They remain useful —
they can prompt *before* a mistake, where a git hook only fires after the
commit — but they are no longer the mechanism anything depends on.

Member identity resolves via **`git rev-parse --git-common-dir`**, never
`$PWD`. The common dir is shared by a repo and all of its worktrees, so a lane
worktree resolves to its true member.

### 2. The cross-repo entry point routes; it does not block

When work is cross-repo and no initiative covers it, momentum **brainstorms one
with the operator first**, then proceeds. This is deliberately modeled on Rule 1's
unfounded-project route (ADR-0008): momentum does not block or warn when
`status.md` says *Not founded* — it routes to `/start-project` to author the
missing foundational record. Cross-repo work with no initiative is the same
situation one tier up.

Rejected alternatives, and why:

- **Block at the edit boundary** — fires on legitimate cross-repo chores (a
  dependency bump across three repos) and needs an escape hatch that then
  becomes the default habit.
- **Warn + auto-record** — an agent mid-flow notes the warning and continues.
  That is what already happened five times.
- **Block at the landing boundary only** — better, and retained as a *backstop*
  in 31b, but a gate at the end does not help an operator who wanted a plan at
  the beginning.

### 3. The initiative lifecycle mirrors the phase lifecycle

The ecosystem tier gets no new ceremony. It gets the **same** ceremony, one tier
up:

| Single-repo | Ecosystem |
|---|---|
| Rule 1: unfounded → `/start-project` | cross-repo, no initiative → `/brainstorm-initiative` |
| `/brainstorm-phase` (gate contract; no disk writes until approval) | `/brainstorm-initiative` — same gate contract |
| `/start-phase` | `initiative start` — fans out member phase/ad-hoc records |
| Rule 2/8: `tasks.md`, `history.md`, changelog | `Per-repo contributions`, `Linked decisions`, `Deploy chronology` |
| `/sync-docs` | cross-repo sync — ownership-preserving, delivered by handoff (31b) |
| `/complete-phase` (Rule 12 evidence) | `/complete-initiative` — evidence across all members |
| Rule 6 Landing Order | dependency-ordered cross-repo landing (31b) |

The value is that an agent already knows this shape. Near-zero new vocabulary is
the point, not a side effect.

### 4. No new unit of cross-repo work

Per the Context finding, `initiative → swarm → member-phase` stands. This phase
completes the middle and introduces no fourth concept.

### 5. Integration verification is config-declared, not owned

momentum is forge-neutral and ships no CI, so it cannot own an integration
check. Following ADR-0009's separation — the trust layer is invariant, the
mechanisms are config — `complete-initiative`:

- **always** requires per-member Rule 12 evidence for every listed contribution;
- **additionally** requires an ecosystem `integration_verify_command` to pass
  **when one is declared**;
- when none is declared, **says so explicitly in its output**. A missing
  integration verify is a stated gap, never a silent pass.

Ecosystem-level config lives in `ecosystem.json` under an optional `config`
object. The ecosystem root deliberately has no `specs/` (see
`core/ecosystem/layout.md`), so `specs/config.md` is not available to it.

### 6. In Phase 31a the routing is convention; 31b makes it mechanical

31a ships the door — `/brainstorm-initiative` and the lifecycle behind it — and
a rules change telling agents to use it. **That rules change will be labelled
agent-convention, not enforcement.** 31b adds the mid-session detection that
makes it mechanical.

This is stated as a decision because momentum has made the opposite mistake
before: **BUG-009** was filed against Rule 6 for a header reading "(Automatic)"
over behaviors that no mechanism backed, and that overstatement shipped verbatim
to every downstream install. Describing 31a's routing as enforced would repeat
it exactly.

## Consequences

**Positive**

- The audit trail survives the three things that broke it: worktrees, forge-API
  merges, and container-dir launches.
- Cross-repo work acquires an entry point, so the plan exists *before* the code
  — the operator's most-repeated manual intervention across all five sessions.
- Three dead template sections and `dependencies[]` get real writers, so the
  ecosystem's records stop drifting from reality by default.
- `complete-initiative` gives cross-repo work a Rule 12 gate it has never had.
- No new substrate, no new concept, no per-adapter enforcement parity.

**Negative / accepted**

- **Forge-side merges remain invisible until next local integration.** A
  `gh pr merge` executes server-side; no local hook can fire. `post-merge`
  captures it on the next fetch. Closing this properly needs a forge webhook,
  which would break forge-neutrality — the honest backstop remains the forge's
  own branch protection, as `core/lifecycle-contract.md` already recommends.
- **`post-commit` runs on every commit in every member.** Mitigated by a hard
  <50ms budget, fail-open behavior, and never blocking a commit — but it is
  non-zero cost on a hot path.
- **Git hooks fire after the fact.** They cannot prompt before a mistake. This
  is precisely why agent-hook nudges are demoted rather than deleted.
- **31a leaves a known gap** — routing without detection — for one release.

## References

- ADR-0008 — Founding contract (the unfounded-project route this mirrors)
- ADR-0009 — Trust layer vs. configurable mechanisms
- ADR-0011 — Instruction files as projection (how the new commands ship to 4 adapters)
- ADR-0012 / 0013 / 0014 — Team Mode (identity, fragments, ref-CAS)
- ADR-0015 — Ecosystem team mode (the substrate this builds on)
- BUG-007 — Codex matcher never matching `Bash` (the class BUG-028 repeats)
- BUG-009 — Rule 6 overstating enforcement (the mistake §6 avoids)
- BUG-028, ENH-066, ENH-067, ENH-068, TD-011 — the findings this ADR answers
