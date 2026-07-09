---
type: Tasks
---

# Phase 29 — Tasks

## Group 0 — Model + ADR
- [ ] 0.1 ADR-0011 written (three-tier model, neutral-spine invariant, composition, ADR-0004 reconciliation)
- [ ] 0.2 `manifest.json` schema defined + documented in `core/instructions/README.md`
- [ ] 0.3 Group 0 history entries logged; impact-map updated

## Group 1 — Generator restructure
- [ ] 1.1 `manifest.json` added to all 4 adapters; `header.md`/`vars.json` retired
- [ ] 1.2 `{{TASK_TOOL}}` removed from rules-body; task-tool line added to each surfaces delta
- [ ] 1.3 `generate-instructions.js` rewritten: adapter auto-discovery, neutral header, surface-driven destination, no `TARGETS`
- [ ] 1.4 4 templates regenerated; drift guard extended + green

## Group 2 — Install composition + collision fix
- [ ] 2.1 Multi-AGENTS.md composition from `installed.json.agents`
- [ ] 2.2 Destination collision removed
- [ ] 2.3 `ecosystem.js` detection reads installed.json

## Group 3a — BUG-027
- [ ] 3a.1 Recipe-row generator emits trailing pipe + regression test

## Group 3b — TD-009
- [ ] 3b.1 `capture-fingerprints.js` covers opencode

## Group 4 — Verification
- [ ] 4.1 Tests: spine-identity, header scaffold, OCP synthetic-agent, composition, detection
- [ ] 4.2 4 fingerprints re-baselined (meta note)
- [ ] 4.3 Self-repo dogfood evidence captured
- [ ] 4.4 Retrospective + v0.36.0 bump; `/sync-docs` done
