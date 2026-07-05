---
type: Task List
---

# Phase 24 — Tasks

> Execution: G0 → (G1 ∥ G2 ∥ G3) → G4 → G5

## Group 0 — Contracts
- [x] ADR-0005 (spec pin, taxonomy, migration + dual-read policy)
- [x] core/lib/frontmatter.js + tests
- [x] core/lib/okf-types.js + tests

## Group 1 — Waves engine (deps: G0)
- [x] plan-graph.js frontmatter scan + index.json fallback + nudge
- [x] waves/momentum CLI text
- [x] fixture re-point + fallback + parity tests

## Group 2 — Migration + okf CLI (deps: G0)
- [x] okf-migrate.js (distribute / convert / inject / index / delete / idempotent)
- [x] upgrade wiring + output line
- [x] momentum okf check + okf index
- [x] migration e2e + check tests

## Group 3 — Templates + instructions (deps: G0)
- [x] specs-templates frontmatter + JSON→MD template swap + index.md templates
- [x] 7 recipes + rules-body.md + CLAUDE.md template + decisions README sweep
- [x] /validate OKF section
- [x] fingerprint re-baseline with meta

## Group 4 — Self-repo migration (deps: G1, G2, G3)
- [x] real-upgrade migration of this repo's specs/ + diff review
- [x] okf check green · waves green · JSON files gone

## Group 5 — Verification & docs (deps: G4)
- [ ] full suite + 2 smokes (fresh init / legacy upgrade)
- [ ] README + developer-guide; site-page backlog item + lane signal
- [ ] retrospective (Rule 12 evidence) + version bump
