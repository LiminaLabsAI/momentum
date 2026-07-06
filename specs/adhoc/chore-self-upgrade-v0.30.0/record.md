---
type: Ad-hoc Record
---

# Ad-hoc Work Record: chore-self-upgrade-v0.30.0

> **Type**: quick-task
> **Created**: 2026-07-06
> **Branch**: chore/self-upgrade-v0.30.0
> **Backlog**: files BUG-022 (upgrade strips ecosystem pointer block)
> **Status**: shipped

## Scope

Self-upgrade to the just-released v0.30.0 — deliberately run as the **first
live multi-adapter test of the BUG-020 fix**: this repo carries claude-code
AND opencode surfaces, and the lock was still legacy single-agent format.

## What the upgrade proved

1. **BUG-020 fix works in the wild**: `upgrade --agent opencode` then
   `upgrade --agent claude-code` — both surfaces intact afterwards
   (23 + 23 commands, both primaries, plugin, settings), zero cross-agent
   orphan removals.
2. **Legacy lock migrated cleanly**: single-agent `agent: opencode` →
   `agents` map with BOTH agents at 0.30.0, `momentumVersion` compat mirror
   present (the review fix, live-confirmed).
3. **Converged-backup sweep worked**: the frontmatter cycle's 23 command
   `.bak`s were auto-removed (ENH-058-era fix).
4. **OKF migration idempotent** again ("already an OKF bundle").
5. **Template refresh legitimate**: AGENTS.md picked up the event-bus banner
   wording (post-0.29.0 fix) — drift closed, not created.

## Dogfood find — BUG-022 (P2)

The marker-aware upgrade **stripped the ecosystem pointer block** from
CLAUDE.md (the `<!-- ecosystem:begin v=2 -->` block init injects for
registered members). Every fleet member will lose its pointer on upgrade
until fixed. FIXED in this same lane: upgrade() re-injects the pointer for registered members (same detection init uses); regression test added. The hand-restore remains as the pre-fix artifact.

## Verification Evidence

- Both surfaces intact post-upgrade (counts + presence checks in-session).
- Lock: `version: 0.30.0`, mirror equal, `agents: {opencode: 42 files,
  claude-code: 34 files}`, no legacy `agent` key.
- `momentum okf check` conformant (235 files); full suite 823/823 fresh.
