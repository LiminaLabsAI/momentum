# Unscheduled — Hardening & Activation (NO COMMITTED SLOT)

> Status: planned, no version target. Pickable any time. Originally slotted as Phase 10 (v0.13.0); displaced when Ecosystem Activation & Polish took priority during the 2026-06-07 Phase 10 brainstorm.

## Scope (preserved verbatim from the original roadmap entry)

- **Full systematic-debugging skill.** Expansion of the existing `core/commands/systematic-debug.md` recipe into a complete skill: reproduce → isolate (binary search / minimal repro) → hypothesize → test → confirm → record. Triggered explicitly by `/debug` or implicitly on verification failure.
- **SessionStart auto-activation (Claude Code).** Replace the current Rule-1-driven "agent reads `specs/status.md` first" pattern with a SessionStart hook that orients the agent from byte zero of every session. Reduces dependence on rule compliance.
- **Persuasion-hardening Rules 1/3/4/5/7/9** (evidence-permitting). Add Why / Red Flags / Anti-Rationalization Counters subsections to the rules that don't yet have them. Phase 5 hardened Rules 2/6/8/10/11; Phase 6 hardened Rule 12. These six are the remainder. "Evidence-permitting" means: harden a rule when there's a real-world incident or strong reason that justifies the addition — not as a uniformity exercise.
- **ENH-017 — CLAUDE.md project-name customization survives `momentum upgrade`.** Today the title `# Project Rules: <Project Name>` lives in the managed section and gets replaced on upgrade. Mechanism options: title-as-extension (move title below the marker), or one-time placeholder substitution at install (`{{PROJECT_NAME}}` resolved at `init`, untouched by upgrade).

## Why no committed slot

The 2026-06-07 Phase 10 brainstorm pulled Ecosystem Activation & Polish to Phase 10 (production-readiness of the Phase 9 ecosystem layer) and Dynamic Orchestration & Context Handover to Phase 11. Hardening & Activation is real work but is not the user-pulled next priority. Rather than force a version target, it sits on the shelf with full scope intact, ready to slot in whenever it becomes the right next thing.

## When to pick it up

Plausible triggers (none of these are commitments — they're just signals):

- A real-world incident where a rule was rationalized past, and the affected rule is in the 1/3/4/5/7/9 set. The incident provides the evidence-permitting justification.
- A user reports that ENH-017 friction (re-editing the title after every upgrade) is meaningfully painful.
- Phase 11 (Dynamic Orchestration) lands and surfaces a need for systematic-debugging in cross-repo work.
- A natural release-cadence slot opens up — e.g., between Phase 12 (Reach) and Phase 13 (Intelligence).

## What this stub is NOT

- A commitment to ship in a specific release.
- A statement that this work is low priority. It's the right work; it just isn't the next work.

## What this stub IS

- A guarantee the scope isn't lost between phases.
- A reference point so when the right moment comes, the brainstorm starts from a real position, not from scratch.

## Notes from the originating conversation (2026-06-07)

User explicitly chose to displace the originally-planned Phase 10 (this work) in favor of activation work on the Phase 9 ecosystem layer: *"we can postpone phase 11 for the and whatever we have discussed right now we will take those into the next phase ... whatever planned for the phase 11 we can update the roadmap for the implementation. So, it can also be undecided for the unplanned for the phase right it is just entry into the roadmap this feature needs to be developed but when it is going to pick that is not we have decided right now we can pick it up and anywhere in coming soon."*
