---
type: Decision
id: "0011"
title: "Instruction File = Projection of (Principal Constants × Per-Agent Variation Manifest)"
status: accepted
date: 2026-07-10
---

# ADR-0011: The Instruction File Is a Projection of (Principal Constants × Per-Agent Variation Manifest)

## Status

`accepted` (2026-07-10) — Phase 29. Extends ADR-0004; relates to ADR-0007, ADR-0010.

## Context

momentum installs one primary instruction file per coding agent:

- **`CLAUDE.md`** — proprietary to Claude Code; only Claude Code reads it.
- **`AGENTS.md`** — the cross-agent **open standard** read by opencode, Codex,
  Antigravity, and others (Cursor, Zed, Jules, …).

ADR-0004 established build-time generation from `core/instructions/` (constants)
plus per-adapter fragments. ADR-0010 established that the file carries no
hand-authored content — it is a projection of `specs/`. Both are correct, but
the **constant-vs-variable boundary was under-drawn**, producing three problems:

1. **AGENTS.md category error.** momentum generates *N single-agent-branded*
   `AGENTS.md` files — header line "opencode configuration" / "Codex
   configuration" / "Antigravity configuration", agent-specific surface
   sections, and a per-agent `{{TASK_TOOL}}` inside the shared rules body —
   even though `AGENTS.md` exists precisely to be agent-neutral. All three
   AGENTS.md adapters declare `primaryInstruction.destination = ['AGENTS.md']`
   (the same path), so a repo installed for two of them suffers a
   **last-writer-wins collision**. `bin/ecosystem.js` "detects" the agent by
   file (`AGENTS.md ⇒ codex`), unable to tell opencode from Antigravity.
2. **Scattered variation axes (OCP violation).** What varies per agent —
   surface/filename, display name, task tool, integration surfaces — is spread
   across `header.md` + `vars.json` + the generator's hardcoded `TARGETS` array
   + `adapter.js`. Adding an agent means editing several shared switch points.
3. **A constant leaked into the variable (SRP/DRY).** The scaffold line
   `> X configuration for this … project` is copy-pasted per adapter in
   `header.md` and has already drifted (claude-code "for this project" vs the
   rest "for this momentum-managed project"); only the agent *name* should vary.

## Decision

**The instruction file is a projection of `(principal constants × per-agent
variation manifest)`, assembled at generation time.** Three explicit tiers:

### Tier 1 — Principal constants (the neutral spine)

`core/instructions/` holds the navigation table, Rules 1–15, naming,
constraints, and the `## Project Extensions` pointer. This **body is
byte-identical across every agent and both surfaces** (`CLAUDE.md` ≡ `AGENTS.md`
body) — enforced by a suite invariant, not asserted in prose. To make
byte-identity achievable, the agent's **task-tool reference is removed from the
rules body** (Rule 2) and expressed in the Tier-3 integration delta instead. The
header scaffold is a single constant string with only the agent display name as
a token (`> {{AGENT_DISPLAY}} configuration for this momentum-managed project.`).

### Tier 2 — Per-agent variation manifest

`adapters/<agent>/instructions/manifest.json` is the single declarative record
of everything that varies per agent:

```json
{
  "id": "opencode",
  "displayName": "opencode",
  "surface": "agents-md",
  "taskTool": "the built-in **task** tool (subagent fan-out)",
  "taskToolName": "The task tool",
  "hasSurfaceDelta": true
}
```

`surface` is `"claude-md"` or `"agents-md"` and drives the install destination.
The manifest **consolidates the retired `header.md` + `vars.json`** and
**subsumes the generator's hardcoded `TARGETS`**. The generator **auto-discovers
`adapters/*/instructions/`** — adding an agent is additive (drop an adapter dir
with a manifest), with no shared switch point to edit. This is **OCP** (open for
extension, closed for modification) and **DIP** (the generator depends on the
manifest abstraction, not on concrete agent names).

### Tier 3 — Surface delta

`adapters/<agent>/instructions/surfaces.md` holds the *irreducibly*
agent-specific integration prose (recipes/skills/commands, hooks, swarm,
instruction precedence) **plus the task-tool mapping line** moved out of the
spine. It is a clearly-scoped delta — never the file's whole identity (**SRP**).

### AGENTS.md multi-agent composition

`AGENTS.md` serves **all** its installed consumers, so a project can switch
agents or run several at once. When more than one `agents-md` agent is present
in `installed.json.agents` (ADR-0007), install/upgrade composes
`AGENTS.md = neutral spine (once) + one integration section per installed
agents-md agent`. The **single-agent case stays a static committed template**
(the N=1 projection), preserving ADR-0004's fingerprint/tarball-inspection
model; composition is a deterministic function exercised only for N>1, with its
own golden test. This **extends** ADR-0004 (static shipped artifacts for the
common case) rather than reversing it.

## Alternatives Considered

| Option | Pros | Cons |
|--------|------|------|
| Keep N branded AGENTS.md (status quo) | no work | category error; same-path collision; ecosystem detection can't distinguish agents |
| Always compose AGENTS.md at install (no static templates) | uniform code path | reintroduces the install-time assembly ADR-0004 rejected; fingerprint/tarball inspection harder |
| Neutral spine but keep `{{TASK_TOOL}}` in the body (structurally identical, token-rendered) | smaller diff | "neutral" is not byte-testable; the spine still varies per agent |
| Unify `manifest.json` into `adapter.js` now | one source of truth | large blast radius across install wiring; deferred to a follow-up with a consistency test |

## Consequences

- **Positive:** cross-agent neutrality becomes *structural and testable* (a
  byte-identical spine invariant + an OCP synthetic-agent test). Adding Cursor
  (FEAT-007) / Copilot (FEAT-010) becomes drop-in — a manifest plus an optional
  `surfaces.md`. A project can switch or run multiple agents; `AGENTS.md` serves
  every installed AGENTS.md agent; the ecosystem agent-detection bug is fixed by
  reading `installed.json.agents`.
- **Cost:** the rules body loses the concrete task-tool *name* (moved to the
  delta, still loaded by every agent); all four instruction templates +
  fingerprints re-baseline once; a new deterministic composition path exists for
  N>1 AGENTS.md installs. `manifest.json` and `adapter.js` briefly hold
  overlapping facts (surface/destination) — reconciled by a consistency test,
  with full unification left as a follow-up.
- **Relates to:** ADR-0004 (extends the generation model), ADR-0007 (per-agent
  installed state), ADR-0010 (file = projection of `specs/`). Shipped by Phase 29.
