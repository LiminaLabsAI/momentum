---
type: Tasks
---

# Phase 29 — Tasks

## Group 0 — Model + ADR
- [x] 0.1 ADR-0011 written (three-tier model, neutral-spine invariant, composition, ADR-0004 reconciliation)
- [x] 0.2 `manifest.json` schema defined + documented in `core/instructions/README.md`
- [x] 0.3 Group 0 history entries logged; impact-map updated

## Group 1 — Generator restructure
- [x] 1.1 `manifest.json` added to all 4 adapters; `header.md`/`vars.json` retired
- [x] 1.2 `{{TASK_TOOL}}` removed from rules-body; task-tool note generator-emitted (`## In-Session Task Tool`) from manifest — surfaces.md untouched
- [x] 1.3 `generate-instructions.js` rewritten as a thin wrapper over shipped `core/lib/instruction-compose.js` (adapter auto-discovery, neutral header, surface-driven destination, no `TARGETS`)
- [x] 1.4 4 templates regenerated; drift guard green; full suite 963/963

## Group 2 — Install composition + collision fix
- [ ] 2.1 Multi-AGENTS.md composition from `installed.json.agents`
- [ ] 2.2 Destination collision removed
- [ ] 2.3 `ecosystem.js` detection reads installed.json

## Group 3a — BUG-027 (verified fixed) + regression guard
- [ ] 3a.1 BUG-027 verified already fixed (Phase 28); flip stale backlog status + add well-formed-row regression test

## Group 3b — TD-009
- [x] 3b.1 `capture-fingerprints.js` covers opencode (pulled into G1 so one tool re-baselined all 4)

## Group 4 — Verification
- [ ] 4.1 Tests: spine-identity, header scaffold, OCP synthetic-agent, composition, detection
- [x] 4.2 4 fingerprints re-baselined (done in G1 — one file drifted per adapter, the instruction file; TD-009 tool now covers all 4)
- [ ] 4.3 Self-repo dogfood evidence captured
- [ ] 4.4 Retrospective + v0.36.0 bump; `/sync-docs` done
