---
type: History
---

# Phase 25 — History

| Type | Meaning |
|---|---|
| [DECISION] / [SCOPE_CHANGE] / [DISCOVERY] / [FEATURE] / [ARCH_CHANGE] / [EVALUATOR] / [NOTE] | per Rule 8 |

---

### [DECISION] 2026-07-06 — Clean lifecycle redesign, not patch-mode fixes
Topics: lifecycle, foundation-docs, init, start-project
Affects-phases: phase-25-founding-contract
Affects-specs: specs/decisions/0008-foundation-docs-authored-not-scaffolded.md
Detail: Operator rejected the patch shape (fill-modes, placeholder markers, per-command heuristics) filed initially under ENH-060. Chosen design: three-state lifecycle (Installed/Founded/Phase loop), init stops shipping the four foundation placeholders, absence of charter+roadmap IS the machine-checkable "not founded" signal. Evidence: password-manager dogfood (fresh v0.31.2) shipped a full MVP with all foundation docs as untouched templates.

---

### [DECISION] 2026-07-06 — Renumber: this phase is 25; Intelligence → 26; Platform → 27
Topics: roadmap, numbering
Affects-phases: phase-25-founding-contract
Affects-specs: specs/planning/roadmap.md, specs/status.md
Detail: Operator chose a clean sequence over a 24b letter suffix.

---

### [DECISION] 2026-07-06 — Migration auto-removes provably-untouched placeholders; founded = charter + roadmap
Topics: upgrade, migration, founded-gate
Affects-phases: phase-25-founding-contract
Affects-specs: specs/decisions/0008-foundation-docs-authored-not-scaffolded.md
Detail: Upgrade removes foundation files whose frontmatter-normalized body hash matches any historical shipped template (zero user content by proof) and reports "not yet founded". The founded predicate checks only project-charter.md + roadmap.md — the minimal load-bearing pair; principles/success-criteria are authored at founding but never block phase work.

---
### [DECISION] 2026-07-06 — G0: ADR-0008 accepted; lifecycle contract authored; roadmap renumbered
Topics: lifecycle, foundation-docs, founding, roadmap
Affects-phases: phase-25-founding-contract
Affects-specs: specs/decisions/0008-foundation-docs-authored-not-scaffolded.md, specs/planning/roadmap.md#Timeline, specs/status.md
Detail: ADR-0008 formalizes the three-state lifecycle (Installed/Founded/Phase loop) with the founded predicate (charter + roadmap exist) and the frozen-hash upgrade migration; core/project-lifecycle.md is the normative contract referenced by command docs. Renumber executed: 25 = Founding Contract (v0.32.0), Intelligence → 26 (v0.33.0+), Platform → 27 (v1.0). Impact-map gains lifecycle/foundation-docs/founding/start-project topics.

---
### [NOTE] 2026-07-06 — G1 complete: init ships no placeholders; upgrade heals legacy installs
Topics: init-templates, upgrade-migration, foundation-docs, lifecycle
Affects-phases: phase-25-founding-contract
Affects-specs: core/foundation-placeholder-hashes.json, core/specs-templates/specs/status.md
Detail: History audit found each foundation template had exactly ONE normalized-body hash across all shipped versions (the v0.27.0 OKF revision was frontmatter-only), so the frozen manifest is 4 hashes. migrateFoundationDocs() follows the migrateAgentRules() pattern (hash-match → remove + report, dry-run aware); slotted after gitignore refresh, before orphan cleanup. The G2 start-project.md rewrite rides in the G1 commit because the fingerprint snapshot captures the whole install tree — remaining G2 docs get their own re-baseline. Suite 833 → 845 (+12 founding-contract tests).

---
### [NOTE] 2026-07-06 — G2 complete: founded gate wired across the command + rules surface
Topics: commands, rules, founding, lifecycle
Affects-phases: phase-25-founding-contract
Affects-specs: core/commands/brainstorm-phase.md, core/commands/start-phase.md, core/commands/validate.md#2b, core/commands/migrate.md, core/instructions/rules-body.md
Detail: The founded predicate (charter + roadmap exist) now gates /brainstorm-phase step 1 and /start-phase setup step 1 (STOP → route to /start-project, offer to draft foundation docs from conversation context); /validate gains check 2b (phases ⟹ founded = failure; unfounded-no-phases = valid Installed state); /migrate declares foundation docs non-gaps and reports Founded: yes/no; /brainstorm-idea routes through founding language. Rule 1 gained not-founded routing in core/instructions/rules-body.md (single source) — all four generated instruction surfaces regenerated per ADR-0004. Fingerprints re-baselined ×4; suite 845/845.

---
