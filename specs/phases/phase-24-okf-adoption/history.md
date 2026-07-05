# Phase 24 — History

### [DECISION] 2026-07-05 — OKF v0.1 pinned as the target spec
Topics: okf, specs-structure, knowledge-format
Affects-phases: phase-24-okf-adoption
Affects-specs: specs/decisions/0005-adopt-okf.md (pending G0)
Detail: "Open knowledge format (Google's standard)" resolved to Open Knowledge
Format (OKF) v0.1 — Google Cloud, announced 2026-06-13; normative spec at
github.com/GoogleCloudPlatform/knowledge-catalog okf/SPEC.md. Required field:
`type` only; reserved index.md/log.md; bundle-absolute links; tolerant consumers.

---

### [DECISION] 2026-07-05 — Full bundle conformance (operator)
Topics: okf, scope, upgrade
Affects-phases: phase-24-okf-adoption
Affects-specs: none
Detail: Operator chose full OKF bundle conformance over JSON-migration-only:
upgrade injects `type` frontmatter into existing projects' spec files so specs/
becomes a strictly conformant v0.1 bundle. Mitigations: byte-preserving,
additive-only, idempotent, clean-tree-gated.

---

### [DECISION] 2026-07-05 — Distributed frontmatter replaces index.json (operator)
Topics: okf, phases-index, waves, drift
Affects-phases: phase-24-okf-adoption
Affects-specs: specs/phases/index.json (deleted in G4)
Detail: Per-phase status/tags/deps live on each phase's overview.md; index.md
becomes a generated listing per OKF reserved-file semantics. Chosen over a
central registry doc to kill the index-vs-reality drift class (Phases 21a, 23)
and for lane-parallel safety. CLI keeps index.json fallback + upgrade nudge.

---

### [NOTE] 2026-07-05 — history.md retained; reserved log.md not adopted
Topics: okf, rule-8
Affects-phases: phase-24-okf-adoption
Affects-specs: none
Detail: history.md is a non-reserved concept doc — frontmatter makes it
conformant. Adopting log.md (newest-first) would churn Rule 8 + every recipe
for zero conformance gain. Revisitable post-adoption.

---

### [NOTE] 2026-07-05 — Site surface deferred to the site-redesign lane
Topics: okf, site, lanes
Affects-phases: phase-24-okf-adoption
Affects-specs: none
Detail: An OKF marketing/docs page overlaps the active feat-site-redesign lane;
Phase 24 ships README + developer-guide only, files a backlog item for the site
page, and signals the site lane at landing (Rule 15).

---

### [NOTE] 2026-07-05 — ADR renumbered 0004 → 0005 at write time
Topics: okf, adr
Affects-phases: phase-24-okf-adoption
Affects-specs: none
Detail: The approved draft said ADR-0004, but Phase 23 (Rules Unification,
v0.26.0) already shipped ADR-0004 (single-source instruction generation).
The OKF adoption ADR is 0005; all four phase files written with the corrected
number.

---
