---
type: Phase History
---

# Phase 5 — Rules & Upgrade Safety: Implementation History

> Append-only log. Do NOT edit existing entries.

## Entry Types
| Type | When to use |
|------|------------|
| [DECISION] | ADR created, technology choice made |
| [SCOPE_CHANGE] | Phase deliverables added or removed |
| [DISCOVERY] | Bug, tech debt, or enhancement found |
| [FEATURE] | New planned feature |
| [ARCH_CHANGE] | Architectural pattern changed |
| [EVALUATOR] | Locked evaluator defined or evaluation set changed |
| [NOTE] | Anything else worth recording |

## Entries

### [DECISION] 2026-05-08 — Phase 5 scope shape: Vision C (upstream + persuasion-hardening)
Topics: phase-5, scope, rules, persuasion-hardening
Affects-phases: phase-5-rules-and-upgrade, phase-6 (downstream — execution engine assumes hardened rules)
Affects-specs: specs/phases/phase-5-rules-and-upgrade/overview.md
Detail: Three options were considered for Phase 5 — A (conservative upstream-only), B (ambitious execution-engine leap per v2 research), and C (A + persuasion-hardening of high-leverage rules). Chose C. Rationale: Vision B would build a subagent execution engine on top of rules that haven't been hardened yet — wrong order. Vision A defers hardening indefinitely. Vision C lays the rule foundation Phase 6 (execution engine) needs without bloating Phase 5.

---

### [DECISION] 2026-05-08 — Persuasion-hardening targets: Rules 2, 6, 8, 10, 11 only
Topics: rules, persuasion-hardening
Affects-phases: phase-5-rules-and-upgrade
Affects-specs: specs/phases/phase-5-rules-and-upgrade/plan.md (Group 1 tasks 1d-1h)
Detail: Persuasion-hardening is open-ended — could apply to all 11 rules. Constrained to the five rules with actual evidence of slippage in cerebrio-sapience usage: Rule 2 (auto-update tracking — agents skip mid-session), Rule 6 (git lifecycle — committing to main, "just this once"), Rule 8 (history logging — under-logging, batching at end), Rule 10 (architecture stability — high blast radius), Rule 11 (evaluator discipline — easy to "just tweak"). Rules 1, 3, 4, 5, 7, 9 deferred until failure evidence emerges.

---

### [DECISION] 2026-05-08 — `--coding-agent` → `--agent` is a hard rename, no deprecation alias
Topics: cli, breaking-change, ENH-008
Affects-phases: phase-5-rules-and-upgrade
Affects-specs: specs/phases/phase-5-rules-and-upgrade/plan.md (Group 3)
Detail: Considered keeping `--coding-agent` as a deprecated alias for one minor version. Rejected: aliases cost maintenance, erode intent, and the user base is small enough that a clear error message is friendlier than ambiguous deprecation warnings. The old flag will exit 1 with `Error: --coding-agent has been renamed to --agent`. v0.6.0 is also where ENH-009 (distribution strategy) becomes possible since flag naming is now stable.

---

### [DECISION] 2026-05-08 — CLAUDE.md split via `## Project Extensions` heading (not HTML comments)
Topics: ENH-010, FEAT-011, template, upgrade
Affects-phases: phase-5-rules-and-upgrade
Affects-specs: specs/backlog/details/ENH-010.md (revises original proposal which used HTML comment markers), specs/phases/phase-5-rules-and-upgrade/plan.md (Group 0a, Group 2)
Detail: ENH-010's original proposal used HTML comment markers (`<!-- BEGIN MOMENTUM MANAGED -->`). Reconsidered: a heading is self-documenting (visible in rendered docs and TOC), survives any markdown tooling, and explicitly invites the reader to add content below it. Comments are invisible and easy to remove accidentally. Adopted: a single `## Project Extensions` heading marks the boundary; everything below is preserved.

---

### [DECISION] 2026-05-08 — Pre-marker projects: backup + write fresh + append old content under marker
Topics: FEAT-011, upgrade, migration
Affects-phases: phase-5-rules-and-upgrade
Affects-specs: specs/phases/phase-5-rules-and-upgrade/plan.md (Group 2c)
Detail: For projects on the new marker template, upgrade is straightforward — replace managed section, leave extensions. For pre-marker projects (everyone shipped before v0.6.0), upgrade can't know what's "managed" vs "user content". Chose: back up the existing file as `.bak`, write the fresh template, append the entire original content under `## Project Extensions`. User can then manually de-duplicate if they wish. Safe (no data loss), recoverable (`.bak`), and one-time per project.

---

### [DECISION] 2026-05-08 — Phase shortname `phase-5-rules-and-upgrade`
Topics: phase-5, naming
Affects-phases: phase-5-rules-and-upgrade
Affects-specs: specs/planning/roadmap.md
Detail: Considered `rules-hardening`, `upstream-rules`, `v06`. Chose `rules-and-upgrade` because it accurately covers both pillars of the phase: rule changes (ENH-011/012/013 + hardening) and upgrade safety (ENH-010 + FEAT-011). The `--agent` rename rides under "upgrade" since it's part of the same v0.6.0 user-facing change set.

---

### [NOTE] 2026-05-08 — Phase 6 placeholder: Execution Engine
Topics: phase-6, roadmap
Affects-phases: phase-6 (future)
Affects-specs: specs/planning/roadmap.md
Detail: Vision B (subagent execution engine, TDD enforcement, `/complete-phase` verification rigor, systematic-debugging skill, `/review-code` command) is reserved for Phase 6. Phase 5's rule hardening is the prerequisite — execution-engine work assumes rules are robust enough to be enforced under context pressure.

---

### [SCOPE_CHANGE] 2026-05-08 — Groups 0 + 1 collapsed into a single commit
Topics: execution, commits
Affects-phases: phase-5-rules-and-upgrade
Affects-specs: specs/phases/phase-5-rules-and-upgrade/plan.md
Detail: Plan called for Group 0 (template scaffolding) and Group 1 (rule content + hardening) as separate commits. In serial single-agent execution they touched the same two files (CLAUDE.md template + agent-rules/project.md), so splitting via stash gymnastics was theatrical. Combined into one commit `feat(rules): add Rules 10/11, harden Rules 2/6/8/10/11, naming extensions`. The conceptual separation remains valid for future parallel work.

---

### [DISCOVERY] 2026-05-08 — Pre-Phase-5 upgrade silently clobbered CLAUDE.md customizations
Topics: upgrade, claude-md, regression-risk
Affects-phases: phase-5-rules-and-upgrade
Affects-specs: none
Detail: Reading bin/momentum.js's pre-Phase-5 `upgrade()`, CLAUDE.md was NOT in the upgrade flow at all — only commands, scripts, and agent-rules were. Agent-rules used a byte-equality + `.bak` strategy that would have clobbered any user customization (including the pieces moved out of CLAUDE.md into project.md). Phase 5 closes this gap by routing both files through the marker-aware `upgradeMarkedFile` helper.

---

### [DISCOVERY] 2026-05-08 — Three marker-logic bugs caught only by smoke testing
Topics: dogfood, partitionByMarker, upgradeMarkedFile
Affects-phases: phase-5-rules-and-upgrade
Affects-specs: none
Detail: Dogfooding caught three bugs the design phase missed. (1) `core/agent-rules/project.md` was missing its `## Project Extensions` marker — fresh init produced a marker-less file that `momentum upgrade` then "migrated" with the old content moved under a marker. (2) `partitionByMarker` stripped trailing whitespace from the managed slice, so a no-op upgrade reported "updated" because the round-trip dropped a blank line; rewrote as a clean lossless slice. (3) `upgradeMarkedFile` did `srcParts.managed + MARKER + destParts.extensions`, but extensions already includes the marker heading — produced "## Project Extensions## Project Extensions" on the same line. All three fixed in one commit; Group 4 turned out to be the most informative group of the phase.

---

### [DECISION] 2026-05-08 — Pre-marker migration appends an HTML comment with the .bak filename
Topics: migration, ux
Affects-phases: phase-5-rules-and-upgrade
Affects-specs: none
Detail: When migrating a pre-marker file, the new content includes an HTML comment block: `<!-- migrated from pre-marker version on YYYY-MM-DD — original at <name>.bak -->`. This gives the user a breadcrumb in the rendered doc pointing to their backup, since markdown viewers may hide the `.bak` file from the project tree.

---

### [NOTE] 2026-05-08 — Phase 5 implementation ready for /complete-phase
Topics: phase-5, release, v0.6.0
Affects-phases: phase-5-rules-and-upgrade
Affects-specs: specs/changelog/2026-05.md, package.json
Detail: All five execution commits landed on `phase-5-rules-and-upgrade`: Groups 0+1 (template), 2 (marker-based upgrade CLI), 3 (--agent rename, breaking), 4 (dogfood + bug fixes), 5-prep (this commit). Smoke tests verified four scenarios: fresh init produces 11 rules + marker, no-op upgrade reports "unchanged", tamper+extensions test preserves user content while restoring managed, pre-marker migration backs up original. package.json bumped 0.5.1 → 0.6.0. Ready for `/sync-docs`, then `/complete-phase` (which handles merge to staging+main, tag, GitHub Release), then `npm publish --access public` per project Rule 9.

---
