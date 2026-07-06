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
