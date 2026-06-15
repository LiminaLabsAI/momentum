# Phase 18 — Swarm Parity — History

### [DECISION] 2026-06-15 — Phase 18 surface scope: full 13 subcommands
Topics: phase-18, swarm-parity, scope, codex, antigravity
Affects-phases: phase-18-swarm-parity
Affects-specs: specs/phases/phase-18-swarm-parity/overview.md
Detail: Phase 18 ships the full Phase 17 + 17.5 surface (all 13 swarm subcommands — `start`/`status`/`tell`/`broadcast`/`verify`/`complete`/`resume`/`cancel` + `claim`/`release`/`focus`/`join`/`absorb`) for Codex and Antigravity, not just the Phase 17 baseline. Single phase to parity vs. splitting into 18 + 18.5. Rationale: `claim`/`release` are foundational primitives that the higher portability commands compose on top of; splitting them out is awkward and would leave both adapters with degraded parity for an extra release cycle.

---

### [DECISION] 2026-06-15 — Live dogfood (VAL-001/002) gates v0.20.4 release
Topics: phase-18, val-001, val-002, capability-flips, live-evidence
Affects-phases: phase-18-swarm-parity
Affects-specs: specs/phases/phase-18-swarm-parity/overview.md, specs/backlog/backlog.md
Detail: VAL-001 (Codex live) and VAL-002 (Antigravity live) must each produce one live `/swarm start` evidence file before v0.20.4 ships. Capability flips (Codex `parallelSubagents: false → true`, Antigravity `sessionStartHook: false → true`) are gated on the live evidence. Rationale: synthetic-only Phase 18 would leave both cells degraded indefinitely on the adapter parity matrix; bundling VAL closure with the release is the highest-confidence path and makes the parity statement honest.

---

### [ARCH_CHANGE] 2026-06-15 — Spawn becomes adapter-pluggable via adapter.spawn(directive)
Topics: phase-18, adapter-contract, swarm, spawn
Affects-phases: phase-18-swarm-parity
Affects-specs: adapters/claude-code/adapter.js, adapters/codex/adapter.js, adapters/antigravity/adapter.js, bin/swarm.js, core/adapter-capabilities.md
Detail: Pre-Phase 18, `bin/swarm.js` hardcodes the Claude Code spawn (`claude --bg --cwd <repoPath> ...`). Phase 18 G0 introduces `spawn(directive)` on the adapter contract; Claude Code's existing spawn becomes the reference implementation; Codex and Antigravity each implement their own. Pure additive contract change — no schema migration. The conductor's directive shape (`platform`, `swarmId`, `wave`, `repoId`, `repoPath`, `phaseSlug`, `branch`, `sessionId`, `recipePath`, `contextPath`, `env`) was already platform-agnostic per Phase 17 design — Phase 18 just makes the dispatch site pluggable. Verification gate: the Claude Code install fingerprint must stay byte-for-byte after the refactor, because neither `bin/swarm.js` nor `adapters/claude-code/adapter.js` is an installed file.

---

### [DECISION] 2026-06-15 — Codex MCP cwd shim ships as documentation only
Topics: phase-18, codex, mcp, cwd-pin
Affects-phases: phase-18-swarm-parity
Affects-specs: adapters/codex/instructions/AGENTS.md
Detail: Phase 18 documents how a user wires their Codex CLI to honor per-supervisor `cwd` via Codex's existing MCP support, instead of shipping a momentum-owned MCP server. Lower complexity; relies on Codex's existing machinery; preserves the "supervisors don't see each other" invariant from `core/swarm/supervise.md`. If G1 implementation finds the doc-only path is blocked by a real Codex MCP limitation, the decision is revisited with the user and a minimal `core/swarm/mcp-cwd-server.js` is the fallback. Explicitly NOT silently downgraded — escalation point is documented in plan.md G1.

---

### [DECISION] 2026-06-15 — Group execution order: G0 → (G1 + G2 in parallel) → G3 → G4
Topics: phase-18, plan, group-ordering, parallelism
Affects-phases: phase-18-swarm-parity
Affects-specs: specs/phases/phase-18-swarm-parity/plan.md
Detail: G0 (contract + Claude Code refactor) blocks everything because the adapter contract change is upstream. G1 (Codex wiring) and G2 (Antigravity wiring) are entirely independent — different adapter trees, no shared files, no cross-dependencies — so they fan out in parallel. G3 (multi-adapter synthetic e2e + fingerprints) gates G4 because evidence + fingerprint coverage must be in before live dogfood. G4 (live VAL + flips + docs + release) is the final sequential step.

---

### [NOTE] 2026-06-15 — Phase 18 target retargeted v0.20.3 → v0.20.4
Topics: phase-18, roadmap, version, v0.20.3, bug-006
Affects-phases: phase-18-swarm-parity
Affects-specs: specs/status.md, core/adapter-parity-matrix.md
Detail: Phase 18 was originally planned for v0.20.3 (per Phase 17.5 retargeting). The unplanned 2026-06-15 BUG-006 patch release (CLAUDE.md/AGENTS.md project-name substitution) took v0.20.3 ahead of Phase 18. Phase 18 now ships as v0.20.4. Roadmap downstream (Phase 19 Reach = v0.21.0, Phase 20 Intelligence = v0.22.0, Phase 21 Platform = v1.0) is unaffected — patch-level bump only.

---

### [DISCOVERY] 2026-06-15 — Cerebrio dogfood blocked on workspace cleanup
Topics: phase-18, cerebrio, dogfood, workspace-state
Affects-phases: phase-18-swarm-parity
Affects-specs: specs/status.md
Detail: The 2026-06-15 cerebrio dogfood (Phase 17.5 Next Action #1) was halted because six of seven member repos carry ~700 modified+untracked files of operator-side in-flight work; only `cerebrio-ecosystem` was cleanly upgradeable (PR `avinash-singh-io/cerebrio-ecosystem#2`, open). Phase 18 does NOT depend on the cerebrio dogfood resuming — synthetic e2e + live VAL-001/002 against fresh synthetic ecosystems is sufficient for v0.20.4. Cerebrio dogfood remains the eventual cross-adapter `/swarm` live test, but is operator-pacing rather than Phase 18 scope.
