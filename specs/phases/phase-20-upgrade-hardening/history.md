# Phase 20 — Upgrade Hardening: History

> Append-only. See Rule 8 for entry types.

### [DECISION] 2026-06-19 — Phase 20 opened from deep-research on upgrade best practices
Topics: upgrade-mechanism, lock-file, orphan-cleanup, distribution, ecosystem-upgrade
Affects-phases: phase-20-upgrade-hardening
Affects-specs: specs/phases/phase-20-upgrade-hardening/plan.md
Detail: A multi-agent review + a verified deep-research pass (21 sources, 25
claims confirmed 3-0) against Copier, Cruft, Angular `ng update`, Nx `nx
migrate`, Renovate, and mani established the target model. For momentum's
declarative content the right analog is Copier/Cruft template-sync (per-repo
lock file + managed/owned split + orphan cleanup), NOT Nx-style codemods and
NOT git three-way merge (fragile, fails on fresh clones — Cruft #181). For the
ecosystem, the PULL sweep model (mani-style) fits the vendor-neutral / DIP
constraint; the PUSH bot model (Renovate/Dependabot) was rejected as
forge-coupled. Four load-bearing decisions recorded in plan.md (D1 committed
lock file, D2 warn-not-block on stale CLI, D3 clean-tree-then-review sweep, D4
defer ordered migrations).

---

### [DECISION] 2026-06-19 — Versioned ordered migrations deferred (D4)
Topics: upgrade-mechanism, migrations
Affects-phases: phase-20-upgrade-hardening
Affects-specs: specs/phases/phase-20-upgrade-hardening/plan.md#out-of-scope
Detail: Nx/Angular ship ordered vN→vN+1 migration scripts because they rewrite
USER CODE. momentum's managed payload is declarative markdown + shell, so the
lock file + orphan cleanup capture ~80% of the value without a migration
runner. An escape hatch (`core/migrations/vX.Y.Z.js`) is filed to backlog and
built only when a release needs a structural transform. Prevents
over-engineering per "build the simplest thing first."

---

### [SCOPE_CHANGE] 2026-06-19 — BUG-008 + ENH-040 folded into Phase 20
Topics: bug-008, enh-040, dry-run, init-clobber
Affects-phases: phase-20-upgrade-hardening
Affects-specs: specs/backlog/backlog.md
Detail: BUG-008 (`init` silently overwrites momentum-owned files with no
backup) and ENH-040 (`--dry-run` for init/upgrade) are squarely in this
phase's safety scope and are pulled in rather than tracked separately. Both
were already filed; this phase resolves them.

---
