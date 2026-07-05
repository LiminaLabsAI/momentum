---
type: Task List
---

# Phase 22 — Reach: opencode Adapter — Tasks

> Execution: `G0 → (G1 + G2 + G3 in parallel) → G4 → G5`
> Mark `[/]` in-progress, `[x]` complete (only with fresh verification output — Rule 12).
>
> **Re-slice note (2026-07-05, G0):** the suite's contract-audit tests
> (spawn contract, capability audit, parity-matrix column coverage) couple
> ALL adapter surfaces to the existence of `adapter.js` — so G0 grew to ship
> every file surface (commands, skills, agents, plugin, spawn, doc columns)
> to keep the suite green at the G0 commit. G1–G3 retain their *test/transform*
> work. Logged as `[NOTE]` in history.md.

## Group 0 — Adapter skeleton + contracts + surfaces (sequential)

- [x] Install `opencode-ai` CLI (1.17.13); evidence at `evidence/g0-opencode-version.txt`
- [x] `adapters/opencode/adapter.js`: destinations, marker-aware primaryInstruction, configFiles (plugin), capabilities + roadmap blocks, runInstall/runUpgrade, spawn()
- [x] `adapters/opencode/instructions/{header.md,vars.json,surfaces.md}`
- [x] Wired into `scripts/generate-instructions.js`; `AGENTS.md` generated; drift-guard green
- [x] Overlay commands ported (continue/dispatch/handoff/scout/swarm from codex + review-code from claude-code, opencode-idiom adapted)
- [x] `.opencode/plugins/momentum.js` (gate + reminder + banner) — shipped; unit tests in G2
- [x] `momentum-orient` skill + 4 agents (3 read-only reviewers + swarm-supervisor) — shipped; shape tests in G1/G3
- [x] Command frontmatter transform (`ensureCommandFrontmatter`) in runInstall/runUpgrade
- [x] `package.json` files += `adapters/**/plugins/**`
- [x] Capability matrix + parity matrix opencode columns (footnotes 17–19; booleans evidence-gated per capability discipline)
- [x] Verification: full suite 734/734; tmp-dir `init --agent opencode` smoke (23 commands w/ frontmatter, 4 agents, plugin, skill, AGENTS.md substituted)
- [x] Commit G0 (64cfcfe)

## Group 1 — Command + skill shape tests (parallel)

- [x] `tests/adapter-opencode-commands.test.js`: frontmatter on all 23 commands, single-leading-block idempotence, skill name-regex, AGENTS.md surface docs (3 tests)
- [x] Commit G1

## Group 2 — Plugin unit tests (parallel)

- [x] `tests/adapter-opencode-plugin.test.js` (node-only, dynamic import): 7 tests — gate block/allow paths incl. ../ traversal + bash heuristic, reminder throttle + spec-layer exclusion, banner detect/silent
- [x] Commit G2

## Group 3 — Agents + spawn tests (parallel)

- [x] Agent shape tests: description/mode/permission frontmatter on all 4 agents (reviewers sandbox read-only; supervisor mode: all, writable)
- [x] Spawn tests: stub-binary argv shape (run --dir --agent + multi-line directive), canonical -1 on missing binary + platform mismatch
- [x] Commit G3

## Group 4 — Wiring + regression (sequential)

- [x] opencode install fingerprint snapshot test (58-file fixture v0.28.0; explicit MOMENTUM_RESNAPSHOT_OPENCODE opt-in)
- [x] Existing-adapter fingerprints byte-identical (suite green incl. claude-code/codex/antigravity fingerprint tests)
- [x] Tarball-shape test: 15 opencode paths required in npm pack; .bak-leak guard already global
- [x] Synthetic swarm e2e: 3 scenarios × opencode (ADAPTERS extended; OPENCODE_BIN pinned; evidence → phase-22, TD-006 gate completed on this file)
- [x] Upgrade idempotence: fresh install upgrade is byte-identical — fixed identical-content .bak litter in installHookFiles (core) + converged-backup sweep (adapter)
- [x] Full suite green: 756/756 (734 baseline + 13 G1-G3 + 9 G4)
- [x] Commit G4

## Group 5 — Live validation + docs + release prep (sequential)

- [x] Live check 1: /validate executed the recipe end-to-end in run-mode ✅
- [x] Live check 2: gate BLOCKED a real specs/ edit; negative control passed ✅
- [x] Live check 3: reminder stamp on disk after real write ✅ (after live-payload callID fix)
- [x] Live check 4: NOT CONFIRMED in run-mode — sessionStartHook stays false ❌ (honest fail; event-hook hang documented)
- [x] Live check 5: opencode agent list discovers all 4 momentum agents w/ correct modes ✅
- [x] Live check 6: supervisor spawn from foreign cwd — agent selected, cwd pinned ✅
- [x] Live check 7: skill tool loaded momentum-orient; duplicate-name coexistence clean ✅ (+ parallel fan-out proof)
- [x] Booleans finalized: parallelSubagents=true, skills=true (earned); sessionStartHook=false (unobserved); parity cells promoted
- [x] README quickstart + agents table (site page deferred to the site-redesign lane — noted in history)
- [x] Roadmap repaired: Rules Unification row added; Reach re-scoped; Intelligence → 24 (v0.28.0); Platform → 25 (v1.0)
- [x] Retrospective with Verification Evidence; version → 0.28.0 (retargeted after OKF took v0.27.0)
- [/] Commit G5; `lanes done`; land + release per Rule 6 gates (STOPPED at operator release gate)
