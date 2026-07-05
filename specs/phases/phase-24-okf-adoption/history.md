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

### [DISCOVERY] 2026-07-05 — BUG-017: committed .githooks hooks lack exec bits
Topics: git-hooks, lifecycle, lanes, exec-bits
Affects-phases: none (bounded quick-task, not Phase 24 scope)
Affects-specs: specs/backlog/backlog.md#bugs
Detail: The Phase 24 brainstorm commit surfaced git's "hook was ignored — not
set as executable" hint: `.githooks/commit-msg` + `pre-push` are committed
100644, so Rule 6 enforcement is silently OFF in every lane worktree/fresh
clone (primary checkout masked by local chmod). BUG-012 guard covers only
`*.sh`. Four `.bak` twins also committed. Filed as BUG-017 (P1).

---

### [DECISION] 2026-07-05 — G0 complete: ADR-0005 accepted; contracts shipped
Topics: okf, adr-0005, frontmatter, type-taxonomy
Affects-phases: phase-24-okf-adoption
Affects-specs: specs/decisions/0005-adopt-okf.md
Detail: ADR-0005 accepted (OKF v0.1 adoption: distributed phase metadata,
impact-map table, dual-read fallback, history.md retained). Contracts shipped:
core/lib/frontmatter.js (zero-dep YAML subset, tolerant parse — data:null on
anything outside the emitted subset so callers leave the file opaque;
insertTypeLine does textual injection to avoid reserialization fidelity risk)
and core/lib/okf-types.js (17-type taxonomy, first-match-wins, reserved
index.md/log.md → null). Verification: node --test 18/18 pass.

---

### [NOTE] 2026-07-05 — G1 complete: waves engine reads OKF frontmatter
Topics: okf, waves, plan-graph, dual-read
Affects-phases: phase-24-okf-adoption
Affects-specs: none (spec updates at /sync-docs)
Detail: phaseGraph() now prefers specs/phases/*/overview.md frontmatter
(status/deps/tags; natural-sorted dir scan) and falls back to legacy
index.json with a one-time stderr upgrade nudge; graph.source surfaces which
path was used. Existing index.json fixtures became fallback coverage; 4 new
tests incl. cross-format parity (identical wave layers + lane suggestions).
Verification: 28/28 across waves-cli, waves-e2e-demo, frontmatter, okf-types.

---

### [NOTE] 2026-07-05 — G2 complete: migration engine + `momentum okf` CLI
Topics: okf, migration, upgrade, okf-check, okf-index
Affects-phases: phase-24-okf-adoption
Affects-specs: none (spec updates at /sync-docs)
Detail: core/lib/okf-migrate.js ships migrate() (index.json distribution incl.
dir-less "ghost" entries recreated so no data is lost; impact-map table
conversion; byte-preserving frontmatter sweep; run-stable index generation;
idempotent), generateIndexes(), check(). Wired into `momentum upgrade` after
adapter delegation — specs/ writes deliberately NOT recorded as managed files
so orphan cleanup can never touch user specs. New `momentum okf check|index`
(bin/okf.js). Verification: 13/13 new tests + 20/20 upgrade/install/ecosystem
regression suites.

---
