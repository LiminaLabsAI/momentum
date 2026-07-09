---
type: History
---

# Phase 29 — History

### [NOTE] 2026-07-10 — BUG-027 closed as verified-fixed + guarded (Group 3a)
Topics: BUG-027, recipe-table, backlog-hygiene
Affects-phases: phase-29-instruction-variation-model
Affects-specs: specs/backlog/backlog.md, tests/instruction-generation.test.js
Detail: Flipped the stale BUG-027 row (open → resolved/phase-29) — it was fixed
in Phase 28 but never marked. Added a well-formed-row regression guard: every
markdown table row in every generated instruction file must, trimmed, start and
end with `|` (fenced code excluded). TD-009 (Group 3b) was completed in Group 1.

---

### [ARCH_CHANGE] 2026-07-10 — Install-time AGENTS.md composition + collision/detection fix (Group 2)
Topics: multi-adapter, composition, ecosystem-detection, agent-neutral
Affects-phases: phase-29-instruction-variation-model
Affects-specs: bin/momentum.js, bin/ecosystem.js
Detail: bin/momentum.js `resolvePrimaryInstructionContent()` returns the static
committed template for a claude-md agent or a lone AGENTS.md agent, but COMPOSES
(neutral spine + one integration section per installed AGENTS.md agent, from
installed.json.agents) when >1 AGENTS.md agent is present — threaded through
install/upgrade/upgradeMarkedFile via an optional raw-content param, so
project-name rendering + marker-aware upgrade + ecosystem-pointer preservation
are untouched. Kills the last-writer-wins collision. Smoke-verified: init codex →
upgrade opencode yields one AGENTS.md with a neutral header + both integration
sections, managed rules region byte-identical to the single-agent template. Also
fixed bin/ecosystem.js detectMemberAgent — it read the ADR-0007-removed `m.agent`
field so every AGENTS.md agent fell through to the `AGENTS.md ⇒ codex` heuristic;
now reads `agents` map + heuristic gains `.opencode`. Suite 963/963.

---

### [ARCH_CHANGE] 2026-07-10 — Generator restructured; neutral spine + shipped compose lib (Group 1)
Topics: generate-instructions, variation-manifest, neutral-spine, surface-delta
Affects-phases: phase-29-instruction-variation-model
Affects-specs: scripts/generate-instructions.js, core/lib/instruction-compose.js, core/instructions/rules-body.md
Detail: Pure assembly moved to shipped core/lib/instruction-compose.js (so
install-time G2 composition reuses ONE path — scripts/ is not in the npm
`files`); scripts/generate-instructions.js is now a thin wrapper. Adapters
auto-discovered by manifest.json presence (no TARGETS). Per-agent header.md +
vars.json retired → one manifest.json each. `{{TASK_TOOL}}` lifted out of
rules-body into a generator-emitted `## In-Session Task Tool` note (Tier 3), so
the rules-body spine is now agent-neutral. Header de-branded to one scaffold
(`> <displayName> configuration for this momentum-managed project.`) — fixes the
claude-code "for this project" drift. All 4 templates regenerated; 4 fingerprints
re-baselined (exactly one file drifted each — the instruction file). Suite 963/963.
TD-009 folded in: capture-fingerprints.js now covers opencode (runCli --agent is
byte-equivalent to the tool's spawn, so one command re-baselines all 4).

---

### [DECISION] 2026-07-10 — ADR-0011 authored + accepted (Group 0)
Topics: instructions, variation-manifest, neutral-spine, agent-neutral
Affects-phases: phase-29-instruction-variation-model
Affects-specs: specs/decisions/0011-instruction-variation-model.md, core/instructions/README.md
Detail: ADR-0011 (extends ADR-0004; relates ADR-0007, ADR-0010) records the
three-tier projection model, the byte-identical neutral-spine invariant, the
per-agent manifest.json schema, adapter auto-discovery (OCP), and AGENTS.md
multi-agent composition (static N=1 template preserved for fingerprints).
Schema documented in core/instructions/README.md; decisions index + impact-map
updated. No code/generated files touched this group — spine unchanged; suite
stays 963.

---

### [DECISION] 2026-07-10 — Phase 29 scoped: instruction variation model
Topics: instructions, adapters, agent-neutral, projection, SOLID
Affects-phases: phase-29-instruction-variation-model
Affects-specs: specs/phases/phase-29-instruction-variation-model/overview.md
Detail: Operator flagged that generated AGENTS.md is single-agent-branded
("opencode configuration") though AGENTS.md is a cross-agent open standard;
CLAUDE.md being agent-specific is correct. Chose full formalization of a
principal-constant vs agent-variable model (SRP/OCP/DIP/DRY) over a minimal
de-brand. Inserted as Phase 29 (Intelligence → 30, Platform → 31; target v0.36.0).

---

### [DECISION] 2026-07-10 — Neutral spine is byte-identical; AGENTS.md composes for all installed agents
Topics: neutral-spine, manifest, multi-adapter, composition
Affects-phases: phase-29-instruction-variation-model
Affects-specs: specs/phases/phase-29-instruction-variation-model/plan.md
Detail: Operator wants momentum capable for all agents incl. switching/coexistence,
with a neutral spine (mechanism left to agent). Decided: rules-body spine is
byte-identical across all agents (task-tool token moved out to the integration
delta); AGENTS.md carries the neutral spine + one integration section per
installed AGENTS.md agent, composed from installed.json.agents. Single-agent
install stays a static committed template (N=1 projection) to preserve ADR-0004's
fingerprint model; ADR-0011 documents the extension.

---

### [ARCH_CHANGE] 2026-07-10 — Three-tier instruction sources + per-adapter manifest, generator auto-discovers adapters
Topics: generate-instructions, manifest, OCP, adapter-contract
Affects-phases: phase-29-instruction-variation-model
Affects-specs: scripts/generate-instructions.js, adapters/<agent>/instructions/manifest.json
Detail: Formalize Tier 1 principal constants (core/instructions/), Tier 2 per-adapter
manifest.json (consolidates header.md + vars.json + generator TARGETS), Tier 3 surface
delta (surfaces.md). Generator auto-discovers adapters/*/instructions/ — removes the
hardcoded TARGETS switch point (OCP). Extends ADR-0004; relates ADR-0007, ADR-0010.

---

### [DISCOVERY] 2026-07-10 — BUG-027 already fixed in Phase 28; Group 3a becomes a guard
Topics: BUG-027, recipe-table, backlog-hygiene
Affects-phases: phase-29-instruction-variation-model
Affects-specs: specs/backlog/backlog.md
Detail: Verified at start-phase — every generated instruction file's sync-config
recipe row ends with a trailing `|`, and the recipe table is static prose in each
adapter's surfaces.md (never dynamically generated, contrary to BUG-027's original
note). Phase 28 fixed it but left the backlog row `open`. Group 3a is re-scoped:
flip the stale backlog status to resolved + add a well-formed-row regression guard.

---

### [DISCOVERY] 2026-07-10 — Destination collision + ecosystem detection bug confirmed
Topics: AGENTS.md, collision, ecosystem-detection
Affects-phases: phase-29-instruction-variation-model
Affects-specs: bin/ecosystem.js
Detail: All three AGENTS.md adapters declare primaryInstruction.destination=['AGENTS.md']
(same path → last-writer-wins); bin/ecosystem.js:790-791 assumes AGENTS.md ⇒ codex, so
opencode/Antigravity are indistinguishable. Both folded into Phase 29 scope. BUG-027
(malformed sync-config recipe row) and TD-009 (fingerprints skip opencode) folded in as
same-surface cleanups.

---
