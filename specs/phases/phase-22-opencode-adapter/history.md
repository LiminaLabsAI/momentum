# Phase 22 — Reach: opencode Adapter — History

> Append-only. Format per Rule 8.

### [DECISION] 2026-07-05 — Full-parity scope for the opencode adapter
Topics: opencode-adapter, adapter-contract
Affects-phases: phase-22-opencode-adapter
Affects-specs: core/adapter-capabilities.md#matrix, core/adapter-parity-matrix.md
Detail: Operator chose full parity (all surfaces including swarm supervisor + spawn) over an MVP floor, per the Phase 16/18 native-idiom precedent. Avoids shipping degraded parity-matrix cells that then require follow-up phases.

---

### [DECISION] 2026-07-05 — Live in-phase validation; no deferred VAL item
Topics: opencode-adapter, validation, capability-flips
Affects-phases: phase-22-opencode-adapter
Affects-specs: core/adapter-capabilities.md#matrix
Detail: Unlike codex (app-bundled binary) and agy (no CLI exists — VAL-002 adjudicated blocked 2026-07-05), opencode installs via `npm i -g opencode-ai`. Capability booleans (`parallelSubagents`, `sessionStartHook`, `skills`) will be finalized from live G5 evidence inside the phase, ending the deferred-VAL pattern that left VAL-001/VAL-002 dangling.

---

### [DECISION] 2026-07-05 — Phase 22 Reach re-scoped: opencode first
Topics: roadmap, opencode-adapter, reach
Affects-phases: phase-22-opencode-adapter
Affects-specs: specs/planning/roadmap.md#timeline
Detail: Operator decision — opencode displaces Cursor (FEAT-007) and Gemini CLI (FEAT-008) as Reach's first adapter; both stay P1 in the backlog for a later Reach wave. ENH-009 (distribution decision) becomes unblocked once this ships ("≥1 additional adapter" gate) but is decided separately.

---

### [DISCOVERY] 2026-07-05 — Roadmap drift on main: v0.26.0 taken, Rules Unification missing from Timeline
Topics: roadmap, tracking-drift
Affects-phases: phase-22-opencode-adapter
Affects-specs: specs/planning/roadmap.md#timeline
Detail: `specs/planning/roadmap.md` still shows Phase 22 Reach targeting v0.26.0 and Phase 23 as "Intelligence" — but v0.26.0 already shipped (2026-07-03) as Phase 23 Rules Unification, which has no Timeline row at all. Repair scheduled in G5: add the shipped row, retarget Reach = opencode @ v0.27.0, slide Intelligence to v0.28.0.

---

### [NOTE] 2026-07-05 — opencode surface research: 1:1 native mapping; skills:true reachable for the first time
Topics: opencode-adapter, adapter-contract, skills
Affects-phases: phase-22-opencode-adapter
Affects-specs: none
Detail: Docs research (opencode.ai/docs — rules/commands/agents/plugins/config/permissions/skills/mcp/cli) confirms every momentum capability maps to a first-class opencode surface: commands (`.opencode/commands/`), blocking plugin hooks (`tool.execute.before` throws), subagents with per-agent permission frontmatter, `session.created` event, and native project-level skills (`.opencode/skills/` — plus discovery of momentum's existing `.agents/skills/` path). Spawn contract: `opencode run --dir <repo> --agent swarm-supervisor`. Ship no `opencode.json`; all surfaces auto-load from directories. Forward notes: `opencode serve --attach` for cheap swarm spawns; plugin-defined custom tools.

---
