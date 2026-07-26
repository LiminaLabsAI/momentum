---
type: Phase
status: planned
tags: [ecosystem, multi-repo, enforcement, detection, orient, landing-order, initiative]
---

# Phase 31b — Ecosystem Enforcement

## Goal

Make Phase 31a's cross-repo routing **mechanical**, give the fleet a real
**orient**, and extend Rule 6's Landing Order to the **ecosystem tier** — so
multi-repo discipline stops depending on the agent remembering.

Closes **ENH-067**, **ENH-068**. Second half of the 31a/31b arc.
Target **v0.41.0**.

## Why

31a built the spine: an entry point, a git-native write path, and a completion
gate. It deliberately shipped one gap, stated plainly in ADR-0016 D8 — **nothing
detects that a session has drifted into a second member repo.** The routing is
prose in the rules; the rules say so.

That gap is the single largest remaining cause of the behavior the five reviewed
multi-repo sessions exhibited. All five did cross-repo work; none opened an
initiative; one read the pointer telling it to and did so anyway. Prose loses to
a long session, which is exactly why single-repo momentum uses mechanism rather
than advice.

Two further findings from those sessions are unaddressed by 31a and closed here:

**Nothing orients across the fleet.** Rule 1 ("read `status.md` first") is
per-repo and fires at session start; nothing performs the equivalent when a
session reaches into a sibling mid-flight. `momentum ecosystem status` prints git
state, presence, and the active initiative — but not each member's active phase,
open P0/P1 items, or lanes. The concrete cost reported: a session rewrote a cost
formatter in a member repo **whose own backlog already tracked BUG-001 against
that exact formatter**. Another discovered a concurrent lane by accident, from
files changing between two `git status` calls (ENH-067).

**Nothing orders cross-repo landings.** Rule 6's Landing Order — one lane at a
time, suite green between, remaining lanes rebase — is enforced in-repo by
`momentum lanes land`. Nothing does this across members. One session opened five
PRs across three repos with a real ordering dependency (a backend wire-contract
change had to land before the frontend rendered it) and tracked the order **in
prose**; two production defects followed (ENH-068).

31a made those failures *recordable*. 31b makes them *preventable*.

## Key decisions

| # | Decision | Rationale |
|---|---|---|
| E1 | **Layered enforcement** — git-native teeth, agent-hook nudge | A git hook cannot fire before the mistake; an agent hook is bypassed by the three things cross-repo work does constantly (worktrees, forge merges, container-dir launches). Each covers the other's blind spot. ADR-0016 D1 already sanctioned this split when it demoted agent hooks to nudges *"they remain useful — they can prompt before a mistake, where a git hook only fires after the commit"*. Operator decision 2026-07-27. |
| E2 | Detection **queries the 31a event stream** — no new substrate | `{actor, ts, member}` is already recorded per commit by the G1 write path. "This actor has events in ≥2 members and no in-progress initiative covers them" is a query over data momentum already collects. Adding a parallel tracking mechanism would be a second source of truth to keep honest. |
| E3 | **`lanes land` becomes ecosystem-aware**; no new cross-repo orchestrator | Each member still lands with its own command; that command now additionally checks the `ecosystem.json` edges 31a began registering. Introduces no fourth concept (ADR-0016 D4) and reaches across no ownership boundary — a cross-repo orchestrator would have to drive merges in repos it does not own. |
| E4 | Landing order derives from **registered edges**, not a declared sequence | Edge `{from: frontend, to: backend}` means frontend depends on backend, so backend lands first. Deriving from the graph means the order cannot drift from the dependency it represents — and 31a already made edge registration automatic. |
| E5 | "Landed" is a **recorded `land` event**, not an inferred state | Adds one event kind to the existing stream. Inferring from branch or merge state means guessing about repos this machine may not have checked out (the same reason the completion gate blocks on absent members rather than skipping them). |
| E6 | Cross-repo doc sync travels **via the handoff inbox**, never by editing | `/sync-docs` keeps its ownership rule exactly (never edit `../` paths). The inbox is the designated cross-repo channel (Phase 11) and it survives the session, where the current "flag it to the user" is a chat message that dies with the context. |
| E7 | The **Rule text is corrected in the same release** as the mechanism | 31a labelled routing "convention, not enforcement" (D8). Shipping detection without fixing that wording makes the rules wrong in the opposite direction. The honest post-31b statement is specific: the nudge is **best-effort** (agent-hook, bypassable), the landing gate is **enforced**. BUG-009 was filed for exactly this class of drift between what the rules claim and what the code does. |

## Scope

### In scope

**G0 — Contracts.** ADR-0017 (layered enforcement, the detection query, the
landing-order contract); `core/ecosystem/lib/detect.js` — coverage query over
the event stream; `land` event kind; config keys for the detection window and
the order override.

**G1 — Fleet orient (ENH-067).** `core/ecosystem/lib/orient.js` reads each
member's active phase, open P0/P1 backlog items, and lane state by parsing files
(no member-specific code imported); `momentum ecosystem status` renders it; the
SessionStart banner carries a condensed form.

**G2 — Detection + routing nudge.** `post-commit` prints a routing banner when a
commit lands in an uncovered second member (agent-independent — fires for humans
and other tools too); a new `cross-repo-gate.sh` PreToolUse hook nudges **before**
the edit, projected to all four adapters; the nudge carries the target member's
orient summary.

**G3 — Dependency-ordered landing (ENH-068).** `lanes land` refuses when an
upstream member has not landed its contribution for the active initiative; the
declared `integration_verify_command` must pass before the **last** member lands;
a documented override for genuine false blocks.

**G4 — Doc-sync delivery, Rule rewrite, parity.** Cross-repo `/sync-docs` entries
become structured handoffs in the target member's inbox; the ecosystem-tier Rule
is rewritten with the nudge/gate distinction explicit; 4-adapter projection and
fingerprint re-baselines.

**G5 — Verification.** Two-clone e2e, full suite, swarm invariance, self-repo
dogfood.

### Out of scope

- Owning CI, or shipping any forge-specific guard (momentum stays forge-neutral)
- Forge webhooks — server-side merges remain visible only on next local
  integration, as ADR-0016 already documents
- Editing another repo's `specs/` — the ownership boundary is unchanged
- Replacing or competing with `swarm`

## Deliverables

| # | Deliverable | Verification |
|---|---|---|
| 1 | ADR-0017 + `detect.js` + `land` event kind + config keys | `npm test` |
| 2 | `orient.js` + `ecosystem status` + SessionStart banner (ENH-067) | `npm test` |
| 3 | Detection banner (post-commit) + `cross-repo-gate.sh` nudge, 4 adapters | `npm test` |
| 4 | Ecosystem-aware `lanes land` + integration verify + override (ENH-068) | `npm test` |
| 5 | Handoff-delivered cross-repo doc sync | `npm test` |
| 6 | Ecosystem-tier Rule rewrite + parity + fingerprints | `npm test` |
| 7 | Two-clone enforcement e2e + retrospective | `npm test` |

Verification defaults from `specs/config.md`: `test_command = npm test`;
`build_command = none`. No deviation.

## Acceptance criteria

1. Editing a second member with no covering initiative produces a routing nudge
   **before the edit lands**, naming the members and the command to run.
2. A commit in an uncovered second member prints the same routing banner —
   agent-independent, so it fires for humans and other tools too.
3. `momentum ecosystem status` shows each member's active phase, open P0/P1
   count, and lane state.
4. The nudge surfaces the target member's **open P0/P1 items**. *(Directly
   falsifies the reported miss: a session rewrote a cost formatter in a repo
   whose own backlog already tracked BUG-001 against that formatter.)*
5. `lanes land` **refuses** when an upstream dependency member has not landed its
   contribution for the active initiative, and names the blocker.
6. The **last** member cannot land without the declared
   `integration_verify_command` passing.
7. A cross-repo `/sync-docs` entry produces a handoff in the target member's
   inbox — not just chat output that dies with the session.
8. The rules text distinguishes **best-effort nudge** from **enforced gate**,
   asserted by test. No overstatement in either direction (BUG-009 discipline).
9. Full suite green; **236 swarm tests green**; no-ecosystem repos byte-unchanged.
