# Phase 16 History

> Append-only log of decisions, scope changes, and discoveries during Phase 16.
> See [Rule 8 in CLAUDE.md](../../../CLAUDE.md#rule-8-record-phase-history).

### [SCOPE_CHANGE] 2026-06-11 — Phase 16 redirected from Reach → Adapter Parity
Topics: phase-16, roadmap, codex, antigravity
Affects-phases: phase-16-adapter-parity, phase-17-reach (new shift)
Affects-specs: specs/planning/roadmap.md, specs/status.md
Detail: Phase 16 was planned as "Reach" (Cursor FEAT-007 + Gemini FEAT-008 adapters + ENH-009 distribution decision). User redirected during brainstorm: Claude Code is dogfooded daily and stable; Codex and Antigravity adapters have not been end-to-end validated since their initial drops (Phase 7b for Codex; Antigravity adapter shipped without a live smoke pass). Decision: bring Codex and Antigravity to genuine parity with Claude Code before adding new adapters. Reach work shifts to Phase 17. Roadmap renumber on completion: Phase 17 = Reach, Phase 18 = Intelligence, Phase 19 = Platform.

---

### [DECISION] 2026-06-11 — Codex PreToolUse hook adopted (brainstorm-gate)
Topics: codex, hooks, brainstorm-gate
Affects-phases: phase-16-adapter-parity
Affects-specs: adapters/codex/hooks.json, adapters/codex/instructions/AGENTS.md
Detail: Online research during Phase 16 brainstorm confirmed Codex now ships the full Claude-Code hook event set (PreToolUse / PermissionRequest / PostToolUse / PreCompact / PostCompact / UserPromptSubmit / SubagentStart / SubagentStop / Stop / SessionStart) with an identical `hooks.json` schema (matcher + hooks array + command/timeout). The brainstorm-gate.sh script can be reused verbatim. Phase 7b shipped Codex with only PostToolUse + SessionStart because the wider event surface wasn't available then. This entry locks the upgrade plan. Source: https://developers.openai.com/codex/hooks.

---

### [DECISION] 2026-06-11 — Antigravity convention rewire `.antigravity/` → `.agents/`
Topics: antigravity, adapter-contract, .agents
Affects-phases: phase-16-adapter-parity
Affects-specs: adapters/antigravity/adapter.js, adapters/antigravity/instructions/AGENTS.md
Detail: `agy` CLI documentation (confirmed via Antigravity docs + multiple 2026 walkthroughs) standardizes on `.agents/` as the project-local config root, containing `skills/`, `agents/`, `rules/`, `hooks.json`, `mcp_config.json`. Our adapter currently writes to `.antigravity/commands/` which `agy` never reads. This entry locks the rewire. The change is adapter-internal — momentum CLI behavior is unchanged for Claude Code or Codex users. Sources: https://developers.googleblog.com/build-with-google-antigravity-our-new-agentic-development-platform/, https://antigravitylab.net/en/articles/antigravity/antigravity-cli-agy-setup-and-slash-commands-getting-started.

---

### [ARCH_CHANGE] 2026-06-11 — Adapter contract destinations extended with `agents` + `skills`
Topics: adapter-contract, destinations
Affects-phases: phase-16-adapter-parity
Affects-specs: core/adapter-capabilities.md, adapters/claude-code/adapter.js, adapters/codex/adapter.js, adapters/antigravity/adapter.js
Detail: Phase 7b's Adapter Contract v3 declared `destinations` for `commands`, `agent-rules`, `scripts`, `engines`. Both Codex and Antigravity now require two more overlay categories: `agents/` (subagent definitions) and `skills/` (skill packages). This is an additive extension per Rule 10 — no ADR required. All three shipped adapters will declare both new keys at Phase 16 Group 0. Claude Code declares them too (with empty overlay) so the contract stays uniform across adapters; the capability boolean tells you whether the surface is actually used.

---

### [DISCOVERY] 2026-06-11 — Codex `parallelSubagents` and `skills` capability declarations are stale
Topics: codex, capabilities, ENH-023, ENH-024
Affects-phases: phase-16-adapter-parity
Affects-specs: core/adapter-capabilities.md, adapters/codex/adapter.js
Detail: Phase 11 capability matrix declared Codex `parallelSubagents: false` and `skills: false`, with roadmap notes "planned for a future Codex feature drop." Per current vendor docs, both features have shipped: subagents support parallel fan-out (`agents.max_threads` default 6, `agents.max_depth` default 1); skills are `SKILL.md`-based and discovered from `.agents/skills/` repository-level. Phase 16 plan: gate the parallelSubagents flip on live evidence (Group 4.3); flip skills boolean after confirming `.agents/skills/` discovery works in dogfood. Sources: https://developers.openai.com/codex/subagents, https://developers.openai.com/codex/skills.

---

### [FEATURE] 2026-06-11 — Adapter Parity Matrix introduced as separate doc
Topics: parity-matrix, capability-matrix, audit-test
Affects-phases: phase-16-adapter-parity
Affects-specs: core/adapter-parity-matrix.md (new)
Detail: The capability matrix (`core/adapter-capabilities.md`) tracks adapter PRIMITIVES (hooks: true/false, subagents: true/false). It does not show whether a SPECIFIC momentum FEATURE (e.g. `/review-code`, brainstorm-gate hook wiring, ecosystem SessionStart banner) is actually shipped on each adapter. Phase 16 introduces a second doc — `core/adapter-parity-matrix.md` — that crosses every shipped feature against every adapter and marks each cell `shipped` / `shipped-degraded` / `not-applicable`. An audit test (`tests/adapter-parity-matrix.test.js`) ensures no cell is left blank — silent gaps were the failure mode this phase exists to fix.

---

### [NOTE] 2026-06-11 — Live dogfood (Group 4) gated on external CLI availability
Topics: phase-16, group-4, external-deps
Affects-phases: phase-16-adapter-parity
Affects-specs: none
Detail: Group 4 requires working `codex` and `agy` CLI installations on the dev machine. If either is unavailable at G4 execution time, the missing evidence becomes a `[VALIDATION]` backlog item and Groups 0/1/2/3/5 still ship as v0.19.0. Capability flips in Group 5 are gated on Group 4 evidence — if a flip's evidence is missing, the capability stays `false` and the matrix cell is documented as `shipped-degraded` until follow-up validation lands.

---

### [DECISION] 2026-06-11 — Group 0 complete; antigravity test-path migration folded in
Topics: phase-16, group-0, adapter-contract, parity-matrix, antigravity-paths
Affects-phases: phase-16-adapter-parity
Affects-specs: core/adapter-capabilities.md, core/adapter-parity-matrix.md, adapters/*/adapter.js, tests/_helpers.js, tests/adapter-parity-matrix.test.js, tests/adapter-capabilities-declared.test.js, tests/adapter-smoke-antigravity.test.js, tests/install.test.js, tests/upgrade.test.js
Detail: Group 0 landed: every adapter now declares `destinations.agents` + `destinations.skills`; `core/adapter-parity-matrix.md` ships as the per-feature audit surface (parsed and validated by `tests/adapter-parity-matrix.test.js`); `core/adapter-capabilities.md` refreshed against 2026-06 vendor docs (Codex hooks/subagents/skills, Antigravity `.agents/` layout); `fakeToolEvent` helper added to `tests/_helpers.js` for Group 3 use. Side decision: the antigravity adapter destination rewire (`.antigravity/` → `.agents/`) broke 3 existing tests with hard-coded `.antigravity/commands/` path expectations (adapter-smoke-antigravity / install / upgrade). Per "keep the suite green between commits," those test paths were updated in this commit rather than left red until Group 2. Group 2's `[adapter-smoke-antigravity test extensions](#group-2)` will still fire — they cover hooks.json wiring + skills/agents overlay, not path expectations. Suite: 293/293 (was 288 pre-phase) — 5 new assertions added; zero regressions.

---

### [ARCH_CHANGE] 2026-06-11 — brainstorm-gate.sh moved from claude-code overlay to core
Topics: phase-16, group-1, brainstorm-gate, core-scripts, hook-script-sharing
Affects-phases: phase-16-adapter-parity
Affects-specs: core/scripts/brainstorm-gate.sh, bin/momentum.js, tests/brainstorm-gate.test.js, tests/tarball.test.js, package.json, core/commands/brainstorm-idea.md, core/commands/brainstorm-phase.md
Detail: To wire the brainstorm-gate hook for Codex without duplicating the script across two adapter overlays, the Phase 7a `brainstorm-gate.sh` was moved from `adapters/claude-code/scripts/` to `core/scripts/`. Both adapters' hook configs (`adapters/claude-code/settings.json` and `adapters/codex/hooks.json`) reference the same post-install relative path `scripts/brainstorm-gate.sh`, so no behavior change for Claude Code. The script was generalized to resolve the project root from `MOMENTUM_PROJECT_DIR` → `CLAUDE_PROJECT_DIR` → `pwd` in that order; Codex sets cwd to the session root so `pwd` resolves correctly without env-var configuration. `bin/momentum.js` `init()` now copies the entire `core/scripts/` tree via `copyDir` (previously only `check-history-reminder.sh` was copied explicitly). `package.json` `files` glob extended with `adapters/**/agents/**` + `adapters/**/skills/**`. Tests pointing to the old script location updated. Per Rule 10, this is an additive change to the adapter contract (no overlay subdir was removed; a script merely migrated to core/) — no ADR required.

---

### [FEATURE] 2026-06-11 — Group 5 complete — capability flips deferred per gate; docs synced; retrospective authored
Topics: phase-16, group-5, capability-flip-gated, retrospective, sync-docs, roadmap-renumber
Affects-phases: phase-16-adapter-parity, phase-17-reach (renumbered), phase-18-intelligence (renumbered), phase-19-platform (renumbered, v1.0)
Affects-specs: specs/phases/phase-16-adapter-parity/retrospective.md, specs/planning/roadmap.md, specs/status.md, specs/phases/README.md, specs/phases/index.json
Detail: Group 5 closed out the phase. (1) G5.1 + G5.2 capability flips DEFERRED per G4 gate — Codex `parallelSubagents` + `skills` stay `false`; matrix cells remain `shipped-degraded` with the VAL-001 evidence gate documented. Antigravity `skills` already flipped to `true` in G2 on overlay ship. (2) Full regression: 309/309 (was 288 v0.18.0 baseline; +21 new tests across the phase; zero pre-existing regressions). (3) Retrospective authored with Verification Evidence section pointing at `evidence/test-suite.txt` + `evidence/codex-install.txt` + `evidence/antigravity-install.txt`. (4) Doc sync done in-flight across the phase (no separate `/sync-docs` invocation needed since updates were made per group): `specs/status.md` reflects active phase; `specs/phases/README.md` has Phase 16 row; `specs/phases/index.json` has the topics block; `specs/changelog/2026-06.md` has the phase-start entry; `core/adapter-capabilities.md` + `core/adapter-parity-matrix.md` refreshed; `specs/planning/roadmap.md` renumbered (Reach → 17, Intelligence → 18, Platform → 19 / v1.0). (5) Phase ready for merge + release; autonomous execution contract STOPS at the merge/release gate per CLAUDE.md release checklist + the user's instruction that "only the commit and release, you will wait for my approval."

---

### [DISCOVERY] 2026-06-11 — Group 4 deferred to follow-up (VAL-001 + VAL-002); live CLIs unavailable in dev env
Topics: phase-16, group-4, val-001, val-002, codex-cli, agy-cli, dogfood-deferred
Affects-phases: phase-16-adapter-parity, post-v0.19.0
Affects-specs: specs/backlog/backlog.md, specs/phases/phase-16-adapter-parity/evidence/codex-install.txt, specs/phases/phase-16-adapter-parity/evidence/antigravity-install.txt, specs/phases/phase-16-adapter-parity/evidence/test-suite.txt
Detail: Group 4 planned a live `momentum init` + four-command flow (`/brainstorm-phase → /start-phase → /sync-docs → /complete-phase`) on real `codex` and `agy` CLIs, plus a 3-target parallel dispatch smoke on Codex. Neither CLI was reachable from the Phase 16 dev environment (`which codex`, `which agy` both empty). Per the plan's external-dependency clause: install-time evidence captured under `evidence/` (file trees, hooks.json content, TOML headers, SKILL.md content, full 309/309 test-suite output). Live-runtime evidence becomes follow-up validation: VAL-001 (Codex) + VAL-002 (Antigravity), both P1, both filed in backlog under a new "Validation" section. Capability flips that depended on G4 evidence (Codex `parallelSubagents`, Codex `skills`) stay `false` for v0.19.0 — the matrix cells already mark them `shipped-degraded` with the live-evidence gate documented. v0.19.0 ships with everything Codex + Antigravity need to be at functional parity at install time; the boolean upgrades follow once the validation lands on a live-runtime machine. This is exactly the graceful-degradation path the plan anticipated; no scope change.

---

### [FEATURE] 2026-06-11 — Group 3 complete — hook-execution smoke harness across all three adapters
Topics: phase-16, group-3, hook-execution, fake-tool-event, smoke-harness, claude-code-symmetry
Affects-phases: phase-16-adapter-parity
Affects-specs: tests/adapter-hook-execution-codex.test.js, tests/adapter-hook-execution-antigravity.test.js, tests/adapter-hook-execution-claude-code.test.js, tests/_helpers.js
Detail: Group 3 added an "actually fires" smoke layer that complements the existing install-time tests. Each test installs an adapter into a tmp project, then uses the `fakeToolEvent` helper (G0.5) to dispatch a synthetic tool event against the wired hook config, asserting side effects (exit codes / stdout / stderr markers). Codex coverage: PreToolUse brainstorm-gate blocks Write to specs/ with sentinel; allows when sentinel absent; allows non-Write tools; PostToolUse history reminder fires on specs/status.md. Antigravity coverage: PostToolUse history reminder fires + stays silent on non-significant files; SessionStart wiring asserted at config level (degraded — runtime event may or may not fire). Claude Code coverage: same shape as Codex (PreToolUse block + PostToolUse history reminder) — closes the test-coverage symmetry gap (the prior `brainstorm-gate.test.js` exercised the script directly without going through the adapter install path). Discovery: `fakeToolEvent` originally inherited `CLAUDE_PROJECT_DIR` from the outer Claude Code session, which pointed to the real momentum repo — false negatives on the block test. Fix: pin `CLAUDE_PROJECT_DIR` + `MOMENTUM_PROJECT_DIR` to the simulated project root in the helper so hooks always resolve against the test tmp dir. Suite: 309/309 (was 300 post-G2; +9 new hook-execution assertions; zero regressions).

---

### [FEATURE] 2026-06-11 — Group 2 complete — Antigravity realignment + hooks.json + skill/agents overlay
Topics: phase-16, group-2, antigravity, agy, dot-agents-dir, hooks-json, skill-md, review-code, skills-true-flip
Affects-phases: phase-16-adapter-parity
Affects-specs: adapters/antigravity/adapter.js, adapters/antigravity/hooks.json, adapters/antigravity/agents/*, adapters/antigravity/skills/momentum-orient/SKILL.md, adapters/antigravity/commands/review-code.md, adapters/antigravity/instructions/AGENTS.md, core/adapter-capabilities.md, core/adapter-parity-matrix.md, tests/adapter-subagents-antigravity.test.js, tests/tarball.test.js
Detail: Group 2 delivered Antigravity realignment + overlay parity. (1) Adapter's `configFiles` block declares `hooks.json` → `.agents/hooks.json`; runInstall/runUpgrade wire it idempotently with .bak backup on changed content. The `hooks.json` ships PostToolUse `check-history-reminder.sh` + SessionStart `sessionstart-handoff.sh` (the latter is degraded — `agy` SessionStart event support not yet vendor-confirmed; AGENTS.md text carries the fallback handoff hint). (2) Three momentum reviewer TOML subagents at `adapters/antigravity/agents/` mirror the Codex set (same `name` / `description` / `developer_instructions` schema). (3) `momentum-orient` skill ships at `adapters/antigravity/skills/momentum-orient/SKILL.md` with frontmatter `name` + `description` per the `.agents/skills/` convention — codifies Rule 1 (orient first). (4) Antigravity-flavored `/review-code` overlay at `adapters/antigravity/commands/review-code.md` invokes the three TOML reviewers via Antigravity's native parent → child subagent delegation; surfaces findings into the `task.md` artifact for the user. (5) `AGENTS.md` rewritten: `.antigravity/` references dropped throughout; `.agents/` layout documented with overlay-subdir table; explicit hook event table; skill + subagent sections; SessionStart fallback hint preserved as primary-instruction text. (6) Antigravity `skills: false` → `true` in the capability matrix (was already overlay-shipping; now declared). The `slashCommands` + `sessionStartHook` booleans stay `false` pending vendor confirmation per their roadmap notes. (7) Parity matrix updated: `.agents/skills/` cell on Antigravity is now `shipped`; new footnote 7 added. (8) `tests/adapter-subagents-antigravity.test.js` proves all three TOMLs install, SKILL.md frontmatter is well-formed and references `specs/status.md`, hooks.json wires the history reminder, and `.antigravity/` is absent post-init. tarball test extended with the new overlay paths. Suite: 300/300 (was 297 post-G1) — 3 new assertions; zero regressions.

---

### [FEATURE] 2026-06-11 — Group 1 complete — Codex parity hardening
Topics: phase-16, group-1, codex, pretooluse, subagents, review-code, agents-md
Affects-phases: phase-16-adapter-parity
Affects-specs: adapters/codex/hooks.json, adapters/codex/agents/*.toml, adapters/codex/commands/review-code.md, adapters/codex/instructions/AGENTS.md, tests/adapter-smoke-codex.test.js, tests/adapter-subagents-codex.test.js
Detail: Group 1 delivered Codex parity with Claude Code on three fronts. (1) PreToolUse hook wired in `adapters/codex/hooks.json` matcher `Write|Edit|MultiEdit` → `bash scripts/brainstorm-gate.sh`. (2) Three momentum reviewer TOML subagents shipped in `adapters/codex/agents/`: `momentum-reviewer-security.toml` (OWASP/STRIDE lens), `momentum-reviewer-qa.toml` (coverage/edge-case/regression lens), `momentum-reviewer-architecture.toml` (rule-compliance/pattern-consistency lens). Each declares the required Codex schema fields (`name`, `description`, `developer_instructions`) and emits findings in the same Critical/Important/Minor format as the Claude Code reviewers. (3) `/review-code` overlay authored at `adapters/codex/commands/review-code.md` — dispatches all three subagents in a single Codex turn so the runtime can fan them out in parallel (subject to `agents.max_threads`). `AGENTS.md` rewritten with a "Codex Hooks" hook event table and a "Momentum Subagents in Codex" section. The generic `applyOverlay` walk over `destinations` auto-wires the new `agents/` overlay to `.codex/agents/` (G0 contract extension paid off — no `adapter.js` code needed). `tests/adapter-subagents-codex.test.js` proves all three TOMLs install + parse + carry the required keys; smoke test extended to cover `/review-code` + `.codex/agents/` install. Suite: 297/297 (was 293 post-G0) — 4 new assertions; zero regressions.
