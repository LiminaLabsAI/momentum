---
type: Phase
status: in-progress
epic: autonomous-execution
tags: [epic-tier, scope-grant, jit-derivation, amendments, stacked-lanes, adr-0020, tdd-strict]
deps: [phase-32a-governor]
---

# Phase 32b — Epic Tier

> **Derived, not brainstormed.** Per Epic 0001 **D10**, this phase's specs were
> generated from `specs/epics/0001-autonomous-execution.md` plus what 32a
> learned — with no operator interview. Every decision below was settled on
> 2026-07-27 and is recorded there; none is re-litigated here. This file is the
> first product of the derivation D10 describes, produced by hand because the
> `--derive` mechanism ships in **this** phase.

## Goal

Make the missing rung real: **one feature, several phases, one approval.**

32a made a single phase run hands-off. 32b makes a *set* of phases run as one
unit — with specs derived just-in-time, one scoped authorization instead of one
per merge, and a channel for the operator to change their mind mid-run without
stopping everything.

Second phase of **Epic 0001 — Autonomous Execution**. Target v0.43.0.

## Why

Momentum's vocabulary goes task → group → phase → *(nothing)* → initiative. The
project has been running epics for months under a letter-suffix convention
(`21a/b/c`, `30a/b/c/d/e`, `31a/b/c`) held together by operator memory rather
than by a record. Everything needed to formalize it now exists: 32a shipped the
runner, the manifest, and the authority model, and its schema already reserves
`grant` and `amendments` fields for exactly this phase.

## Key decisions

Inherited from the epic record. Phase-local only:

| # | Decision | Rationale |
|---|---|---|
| Q1 | The epic record lives at `specs/epics/<NNNN>-<slug>.md`, in-repo | An epic is one repo's multi-phase unit; `initiative` remains the cross-repo tier. Requiring an ecosystem root for a solo repo would be wrong |
| Q2 | `core/run/lib/epic.js` is the library; `momentum epic` is the CLI | Same split as every other momentum subsystem; keeps the runner tier-agnostic (D1) |
| Q3 | The scope grant is a **file with a branch allowlist and a hard expiry**, consumed per landing and audited | ADR-0020. See "The one-way door" below |
| Q4 | Derivation is a **pure function of (epic record, prior phases' history)** — no model call in the library | Same discipline as the authority classifier: reproducible, testable, auditable |
| Q5 | An amendment whose blast radius cannot be determined is treated as **backward-invalidating** | The safe direction. D11 says forward-only absorbs silently; ambiguity must not inherit that |
| Q6 | `release: per-feature` lands phases as a **stack**, parent-first, suite green between | Rule 6's Landing Order already defines this for stacked lanes — no new merge machinery |

## The one-way door (ADR-0020)

Today `.momentum/merge-approved` is single-use: one human "yes" buys one
protected-branch push. `release: per-feature` needs one approval to cover N
landings.

This is the riskiest thing in the epic and it gets its own ADR. The argument
recorded at design time: the grant **re-granularizes** rather than weakens,
because it is scoped to one named epic with a branch allowlist it cannot exceed,
expires, records every consumption attributably, and is revocable. ADR-0009
declares the trust layer invariant; what changes is *when* and *at what
granularity* a human authorizes, never *whether*.

The ADR must argue the counter-case honestly, not just assert the above.

## Scope

**In:** epic record type + library + `momentum epic` CLI · ADR-0020 + scope
grant implementation + `pre-push` integration · JIT spec derivation
(`/brainstorm-phase --derive`) · amendments channel · `/brainstorm-epic` recipe ·
epic-tier run wiring (`momentum run start epic <slug>`) · `tdd: strict`
enforcement at the task layer · stacked-lane landing for `release: per-feature`.

**Out:** re-invoker backend → **32c** · initiative-tier runner and swarm removal
→ **32d** · widening the orphan guard beyond `core/run/` → **32d** ·
capability-gated script installation → **32c**.

## Deliverables

| Deliverable | Verification |
|---|---|
| **ADR-0020** — scope-grant authorization | `npm test` + `momentum validate` |
| `core/run/schema/epic.schema.json` | `npm test` — shape + rejection cases |
| `core/run/lib/epic.js` — read/write/validate, phase graph via `core/waves` | `npm test` |
| `core/run/lib/grant.js` — mint / verify / consume / revoke, audited | `npm test` — expiry, out-of-scope branch, revocation, replay |
| `pre-push` accepts a valid in-scope grant alongside the sentinel | `npm test` — **and refuses an expired or out-of-scope one** |
| `core/run/lib/derive.js` — pure `(epic, priorHistory) → phase spec skeleton` | `npm test` |
| `core/run/lib/amend.js` — classify + absorb / hard-stop | `npm test` — forward-only silent, backward-invalidating stops |
| `momentum epic` + `momentum run amend` CLI | `npm test` + CLI smoke |
| `/brainstorm-epic` + `/brainstorm-phase --derive` recipes | `npm test` — 4 adapters, fingerprints re-baselined |
| `tdd: strict` enforcement at task-marking | `npm test` |

Verification defaults from `specs/config.md`: `test_command = npm test`.

## Acceptance criteria

1. A **2-phase epic runs to completion with exactly one human approval** on a clean clone.
2. A **forward-only amendment mid-run is absorbed with zero prompts**; a **backward-invalidating one hard-stops and names the affected completed work**.
3. A phase's specs are **derived from the epic record with no interview**, and the derivation is reproducible (same inputs → same output).
4. The grant **refuses** an expired grant, an out-of-scope branch, and a revoked grant — each with a distinct reason.
5. Orphan guard stays green over all of `core/run/` — **no new dead exports**.
6. Solo / no-epic behaviour byte-unchanged; swarm suite stays 236/236.
7. Full suite green; net-new tests ≥ 50.

## Reference specs

`specs/epics/0001-autonomous-execution.md` · ADR-0009 (the invariant this phase
re-granularizes) · ADR-0019 (authority) · ADR-0003 (one engine every scale) ·
`core/run/CONTRACT.md` · Rule 6 Landing Order (stacked lanes)
