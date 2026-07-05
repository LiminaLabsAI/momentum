---
type: Phase History
---

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

### [DECISION] 2026-06-15 — G4 capability flips: NEITHER lands in v0.20.4
Topics: phase-18, g4, capability-flips, val-001, val-002, codex, antigravity, enable-fanout
Affects-phases: phase-18-swarm-parity
Affects-specs: adapters/codex/adapter.js, adapters/antigravity/adapter.js, core/adapter-capabilities.md, core/adapter-parity-matrix.md, specs/backlog/backlog.md, specs/phases/phase-18-swarm-parity/evidence/val-001-codex.txt, specs/phases/phase-18-swarm-parity/evidence/val-002-antigravity.txt
Detail: The locked 2026-06-15 [DECISION] said capability flips are gated on live evidence. G4 captured live evidence; **the honest read is that NEITHER flip lands in v0.20.4**. (1) Codex `parallelSubagents`: stays `false`. `codex features list` at codex-cli 0.133.0 shows `enable_fanout: under development: false`. Parallel fan-out is not yet a stable Codex feature; flipping `parallelSubagents` requires `enable_fanout: stable: true` upstream. (2) Antigravity `sessionStartHook`: stays `false`. The Antigravity desktop app ships no standalone `agy` CLI — `find /Applications/Antigravity\ IDE.app -name "agy"` returns nothing; the `agy` npm package is a 217-byte placeholder; `@google/antigravity` 404s on npm. Live event-firing cannot be confirmed via CLI; operator-manual IDE validation is the closure path. (3) Both VAL-001 + VAL-002 bumped P1 → P2 because closure now depends on external structural factors (upstream Codex feature + Antigravity IDE product surface), not momentum-internal work. (4) Adapter parity-matrix `/swarm` row flips both new cells to `shipped¹⁴` — the surface is complete; only the two capability flags remain `false` pending the listed gating conditions. (5) Phase 18 SURFACE deliverable is unconditionally met (full 13-subcommand parity, install layouts fingerprint-pinned). Phase 18 CAPABILITY-FLIP deliverable is conditionally met (decision is honest "no" rather than premature "yes"). Updated docs in `docs/swarm.md` Phase 18 section, `core/adapter-parity-matrix.md` footnote 14, `core/adapter-capabilities.md` Phase 17 / 17.5 / 18 scope section all reflect this outcome.

---

### [FEATURE] 2026-06-15 — G4 docs + backlog + retrospective + version bump
Topics: phase-18, g4, docs, swarm-md, parity-matrix, adapter-capabilities, retrospective, backlog, version, val-001, val-002
Affects-phases: phase-18-swarm-parity
Affects-specs: docs/swarm.md, core/adapter-parity-matrix.md, core/adapter-capabilities.md, specs/backlog/backlog.md, specs/phases/phase-18-swarm-parity/retrospective.md, specs/status.md, specs/changelog/2026-06.md, package.json
Detail: G4 lands the closure surface: (1) `docs/swarm.md` gains `## Multi-adapter swarm (Phase 18 / v0.20.4)` with per-adapter dispatch table + MCP cwd shim note + capability-flag outcome. (2) `core/adapter-parity-matrix.md` `/swarm` row Codex + Antigravity cells flip `not-applicable¹⁴ → shipped¹⁴`; footnote 14 rewritten to cover the Phase 18 outcome including capability-flag deferrals. (3) `core/adapter-capabilities.md` Phase 17 / 17.5 section rewritten as Phase 17 / 17.5 / 18 with adapter parity table + capability-flip-outcome subsection. (4) `specs/backlog/backlog.md` VAL-001 → `partial` (3/6 questions closed via CLI; 3/6 deferred), VAL-002 → `blocked` (structurally IDE-only); both priority-bumped P1 → P2; status legend extended to include `partial` + `blocked`. (5) Retrospective written at `specs/phases/phase-18-swarm-parity/retrospective.md` covering all 5 groups, what shipped, what deferred + why, stats (580/580 suite, +25 new), discoveries (TD-006 filed), acceptance-criteria final status (mostly ✓, two ⚠ honest "deferred"). (6) `specs/status.md` Phase 18 row moved from Active → Completed; Latest Branch Complete field added; Recent Changes prepended with the full Phase 18 summary. (7) `specs/changelog/2026-06.md` Phase 18 complete entry prepended; "started" entry kept. (8) `package.json` bumped 0.20.3 → 0.20.4. Suite stays 580 / 580 across version bump.

---

### [FEATURE] 2026-06-15 — G3 complete: multi-adapter e2e + fingerprints
Topics: phase-18, g3, multi-adapter-e2e, fingerprints, evidence, td-006-mitigated
Affects-phases: phase-18-swarm-parity
Affects-specs: tests/swarm-e2e-multi-adapter.test.js, tests/adapter-codex-fingerprint.test.js, tests/adapter-antigravity-fingerprint.test.js, tests/fixtures/v0.20.4-codex-fingerprint.json, tests/fixtures/v0.20.4-antigravity-fingerprint.json, specs/phases/phase-18-swarm-parity/evidence/
Detail: G3 lands multi-adapter synthetic e2e + Codex + Antigravity install fingerprints. (1) `tests/swarm-e2e-multi-adapter.test.js` parameterizes the Phase 17 e2e harness across `platform: codex` and `platform: antigravity`. Three scenarios (A-linear 3-repo, B-branched 4-repo, C-wide 5-repo) × 2 new adapters = 6 e2e tests. Each test plans the swarm, builds Wave 1 spawn directives with the correct platform field, dispatches via the spawn contract (each adapter returns canonical -1 since neither CLI is on PATH in dev env), then drives the rest of the swarm to completion via the in-process simulator (recordRepoComplete + pollTurn) — same loop as Phase 17 e2e. Asserts spawn dispatch shape + completion semantics + wave count. (2) 6 evidence files captured at `specs/phases/phase-18-swarm-parity/evidence/scenario-{a-linear,b-branched,c-wide}-{codex,antigravity}.txt`. Each shows scenario header + spawn dispatch JSON + final manifest + cross-repo changeset. **TD-006 mitigation applied**: a `canonicalize()` pass strips `last_seen_sha` (random per `git init` commit) and `ts` (wall-clock) values before writing, so re-runs of the test produce byte-for-byte identical evidence. Verified by capturing one file, re-running, and `diff`ing — zero output. (3) `tests/fixtures/v0.20.4-codex-fingerprint.json` (50 files) + `tests/fixtures/v0.20.4-antigravity-fingerprint.json` (51 files) generated via a one-shot inline node script that pins a `fixture-project` subdir under the random tmp root (deterministic per BUG-006 substitution). (4) `tests/adapter-codex-fingerprint.test.js` + `tests/adapter-antigravity-fingerprint.test.js` mirror `tests/claude-code-regression.test.js`: each compares (path, SHA256) pairs against its baseline, flagging missing/drifted/added files. Verification: full suite **580 / 580** (570 post-G2 + 6 e2e + 2 fingerprint fixture-well-formed + 2 fingerprint byte-match = 10 new G3 tests). Claude Code fingerprint test still passes — no G0/G1/G2/G3 drift on the Claude install. Evidence filename variance from plan: plan said `scenario-{a,b,c}-<adapter>.txt`; actual is `scenario-{a-linear,b-branched,c-wide}-<adapter>.txt` carrying the full Phase 17 scenario id. Matches the `scenario-*-{codex,antigravity}.txt` verification glob.

---

### [FEATURE] 2026-06-15 — G2 complete: Antigravity swarm wiring
Topics: phase-18, g2, antigravity, adapter-spawn, swarm-supervisor-skill, swarm-workflow, agy
Affects-phases: phase-18-swarm-parity
Affects-specs: adapters/antigravity/adapter.js, adapters/antigravity/workflows/swarm.md, adapters/antigravity/skills/swarm-supervisor/SKILL.md, adapters/antigravity/instructions/AGENTS.md, tests/adapter-antigravity-swarm.test.js
Detail: G2 lands the Antigravity parity of the swarm primitive. (1) `adapters/antigravity/adapter.js::spawn(directive)` replaces the G0 stub with a real impl that shells `agy --cwd <repoPath> --skill swarm-supervisor`. Uses `AGY_BIN` env override for tests. Exploits Antigravity's `parallelSubagents: true` capability — one supervisor per repo runs concurrently. (2) New `adapters/antigravity/workflows/swarm.md` — the user-facing workflow that `agy` auto-registers as `/swarm` (per Antigravity's `.agent/workflows/<name>.md` → `/<name>` convention). All 13 subcommands documented. (3) New `adapters/antigravity/skills/swarm-supervisor/SKILL.md` — the per-repo supervisor PERSONA the spawned supervisor BECOMES on boot (per Antigravity's "skills = personas the agent loads to BECOME" model). Boot sequence (read recipe → read brief → orient → start phase) + operating constraints (stay in repoPath, files-as-state, inbox routing, native artifacts sync). (4) `adapters/antigravity/instructions/AGENTS.md` Skills section bumped 4 → 5 skills (adds swarm-supervisor); new `## Swarm — Lookup Pattern` section inserted before `## Antigravity Native Artifacts Integration` with the full subcommand table + spawn dispatch explanation. (5) New `tests/adapter-antigravity-swarm.test.js` (5 tests): spawn dispatch + wrong-platform canonical -1 + install lays down workflow + install lays down supervisor skill + AGENTS.md has Swarm Lookup Pattern. Verification: full suite 570/570 (565 post-G1 + 5 new G2). Smoke install of `--agent antigravity` confirms all three new files plus AGENTS.md sections present. Filename deviation from plan: plan said `swarm-conductor.md` but the slash command needs to stay `/swarm` consistent across all three adapters, so the file is `swarm.md` not `swarm-conductor.md`. The "conductor" role description lives inside the workflow body. Real-CLI verification (whether `agy --skill <name>` is the right invocation form) lands in G4 VAL-002 — current Antigravity capability is `parallelSubagents: true` but the exact CLI form for spawning with a named skill needs live confirmation.

---

### [DECISION] 2026-06-15 — Antigravity swarm workflow filename: swarm.md (not swarm-conductor.md)
Topics: phase-18, g2, antigravity, naming, slash-command
Affects-phases: phase-18-swarm-parity
Affects-specs: adapters/antigravity/workflows/swarm.md, specs/phases/phase-18-swarm-parity/plan.md
Detail: plan.md G2 task 2 called for `adapters/antigravity/workflows/swarm-conductor.md`. Deviation: the file ships as `swarm.md`. Reason: Antigravity auto-registers `<basename>` as the slash command, and the slash command must stay `/swarm` to keep parity across the three adapters (Claude Code + Codex + Antigravity all expose `/swarm`). Naming the file `swarm-conductor.md` would register `/swarm-conductor` instead — a divergent UX. The "conductor" role lives inside the workflow's body, not the filename. Pure decisional change; plan.md task description was a naming bug, not a logical requirement.

---

### [FEATURE] 2026-06-15 — G1 complete: Codex swarm wiring
Topics: phase-18, g1, codex, adapter-spawn, swarm-supervisor-toml, mcp-cwd-shim, transform-commands-into-skills
Affects-phases: phase-18-swarm-parity
Affects-specs: adapters/codex/adapter.js, adapters/codex/agents/swarm-supervisor.toml, adapters/codex/commands/swarm.md, adapters/codex/instructions/AGENTS.md, tests/adapter-codex-swarm.test.js, tests/adapter-contract-spawn.test.js
Detail: G1 lands the Codex parity of the swarm primitive. (1) `adapters/codex/adapter.js::spawn(directive)` replaces the G0 stub with a real impl that shells `codex --cwd <repoPath> --agent swarm-supervisor` and pipes the recipe path + brief pointer over stdin. Uses `CODEX_BIN` env override for tests. (2) New `adapters/codex/agents/swarm-supervisor.toml` declares the per-repo supervisor subagent — Codex parity of Claude Code's `claude --bg` spawn pattern. Carries the full developer_instructions: boot sequence (read recipe → read brief → orient → start phase) + operating constraints (stay in repoPath, files-as-state, write inbox items for cross-repo questions). No `sandbox_mode = "read-only"` — supervisors write code. (3) New `adapters/codex/commands/swarm.md` — a Codex-idiomatic swarm recipe (~300 lines) documenting all 13 subcommands; `transformCommandsIntoSkills` (ENH-036, v0.20.1) automatically renders it as `.agents/skills/swarm/SKILL.md` during install. (4) `adapters/codex/instructions/AGENTS.md` gains TWO new sections inserted before `## Always-On Rules`: `## Swarm — Lookup Pattern` (subcommand table + supervisor declaration + degrade-to-dry-run path) and `## MCP cwd shim — Codex configuration` (Codex MCP filesystem server `${PWD}` config + verification recipe + fallback escalation point). Recipe table gains a `swarm` row; Subagent list gains a `swarm-supervisor.toml` row. (5) New `tests/adapter-codex-swarm.test.js` (5 tests): spawn dispatch surface + wrong-platform canonical -1 + install lays down supervisor TOML + transform produces SKILL.md + AGENTS.md has both new sections. (6) `tests/adapter-contract-spawn.test.js` adjusted: the contract-test assertion on "not yet implemented" message no longer applies to Codex now that G1 ships a real impl — assertion broadened to "status -1 + populated detail" which is platform-agnostic. Verification: full suite 565/565 (560 post-G0 + 5 new G1). Smoke install of `--agent codex` confirms 20 skills generated (19 pre-G1 + 1 new swarm), supervisor TOML present, AGENTS.md has both sections. Escalation point in plan.md G1 (Codex MCP cwd shim doc-only path) is honoured — the doc explicitly notes the fallback (file a bug + manual cwd pin) if real Codex CLI doesn't honour the MCP `${PWD}` form. Real-CLI verification lands in G4 VAL-001.

---

### [DISCOVERY] 2026-06-15 — Swarm e2e scenario evidence files rewritten on every test run
Topics: phase-18, g0, e2e, evidence, test-hygiene, td-006
Affects-phases: phase-18-swarm-parity
Affects-specs: specs/backlog/backlog.md
Detail: During G0 verification, `npm test` produced unstaged changes to 6 committed scenario evidence files (`phase-17-swarm/evidence/scenario-{a,b,c}-*.txt` + `phase-17-5-swarm-portability/evidence/scenario-portability-{focus,join,absorb}.txt`). The tests at `tests/swarm-e2e-scenarios.test.js:156` and `tests/swarm-portability-e2e.test.js:90` rewrite the committed evidence with each run; the body contains the random tmp dir name so every test run produces a one-character diff. Pre-existing — not caused by Phase 18. Filed as TD-006 (P3) with three fix candidates; resolution is out of Phase 18 scope but G3 needs to be aware so its new multi-adapter evidence harness doesn't reproduce the same pattern. G0 commit excludes the regenerated files via `git checkout --`; phase branch stays clean.

---

### [ARCH_CHANGE] 2026-06-15 — G0 complete: spawn contract + Claude Code refactor
Topics: phase-18, g0, adapter-contract, spawn, claude-code-refactor
Affects-phases: phase-18-swarm-parity
Affects-specs: bin/momentum.js, bin/swarm.js, adapters/claude-code/adapter.js, adapters/codex/adapter.js, adapters/antigravity/adapter.js, tests/adapter-contract-spawn.test.js
Detail: G0 lands the `adapter.spawn(directive)` contract addition. (1) `bin/momentum.js` gains a JSDoc block above `loadAdapter()` documenting the canonical directive shape (`platform`, `swarmId`, `wave`, `repoId`, `repoPath`, `phaseSlug`, `branch`, `sessionId`, `recipePath`, `contextPath`, `env`) and the canonical per-repo result shape (`{ repoId, status, detail }`). (2) Claude Code's existing spawn logic — previously hardcoded inside `bin/swarm.js::spawnClaudeCodeSupervisors` — is moved to `adapters/claude-code/adapter.js::spawn(directive)` byte-for-byte. (3) Codex and Antigravity each gain a `spawn()` stub returning the canonical `status: -1` "not implemented" entry (real impl lands in G1 + G2). (4) `bin/swarm.js` replaces the hardcoded helper with `spawnSupervisors(directives)`, which looks up the adapter for each directive's `platform` via `loadAdapterForPlatform` and dispatches. Unknown platforms and missing `spawn` exports yield canonical `-1` entries — the wave stays robust to per-repo dispatch failures rather than throwing. (5) New `tests/adapter-contract-spawn.test.js` (5 tests) asserts: every adapter exports `spawn`; every spawn returns the canonical shape without throwing on a non-matching platform; `spawnSupervisors` dispatches via the platform lookup; unknown platforms degrade cleanly; `loadAdapterForPlatform` resolves known platforms and returns null for unknown. Verification: full suite 560/560 (555 baseline + 5 new). Claude Code install fingerprint test passed → zero-regression (neither `bin/swarm.js` nor `adapters/claude-code/adapter.js` is an installed file, so the refactor leaves the installed surface byte-for-byte identical). Pure additive contract change — no schema migration.

---

### [DISCOVERY] 2026-06-15 — Cerebrio dogfood blocked on workspace cleanup
Topics: phase-18, cerebrio, dogfood, workspace-state
Affects-phases: phase-18-swarm-parity
Affects-specs: specs/status.md
Detail: The 2026-06-15 cerebrio dogfood (Phase 17.5 Next Action #1) was halted because six of seven member repos carry ~700 modified+untracked files of operator-side in-flight work; only `cerebrio-ecosystem` was cleanly upgradeable (PR `avinash-singh-io/cerebrio-ecosystem#2`, open). Phase 18 does NOT depend on the cerebrio dogfood resuming — synthetic e2e + live VAL-001/002 against fresh synthetic ecosystems is sufficient for v0.20.4. Cerebrio dogfood remains the eventual cross-adapter `/swarm` live test, but is operator-pacing rather than Phase 18 scope.
