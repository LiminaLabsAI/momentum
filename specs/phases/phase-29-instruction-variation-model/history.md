---
type: History
---

# Phase 29 — History

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
