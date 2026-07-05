---
type: Phase History
---

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
### [NOTE] 2026-07-05 — G0 re-sliced: contract-audit tests couple all surfaces to adapter.js existence
Topics: opencode-adapter, adapter-contract, test-architecture
Affects-phases: phase-22-opencode-adapter
Affects-specs: none
Detail: The moment `adapters/opencode/adapter.js` exists, the suite's audit tests (spawn contract, capability audit, parity-matrix column coverage) demand the FULL adapter surface — so per-group suite-green commits are impossible under the planned G0–G3 slicing. G0 expanded to ship every file surface (commands, skills, agents, plugin, spawn, doc columns); G1–G3 retain their test/transform work. Suite 734/734 at the G0 commit; init smoke verified (23 frontmattered commands, 4 agents, plugin, skill, substituted AGENTS.md).

---

### [DECISION] 2026-07-05 — Evidence-gated booleans: skills/parallelSubagents/sessionStartHook stay false until G5 live proof
Topics: opencode-adapter, capability-flips, validation
Affects-phases: phase-22-opencode-adapter
Affects-specs: core/adapter-capabilities.md#matrix
Detail: The brainstorm targeted `skills: true` on the native-surface basis, but the same-day VAL-002 adjudication (agy-wrapper closure rejected for unearned flips) hardened the standard: file presence + vendor docs ≠ observed runtime. G0 declares hooks/slashCommands/subagents true (shipped file surfaces), while skills, parallelSubagents, and sessionStartHook stay false with parity cells marked shipped-gated¹⁷/¹⁹ until G5 live evidence. Known degraded cells (ecosystem session banner + auto session log not yet in the plugin) footnoted as ¹⁹ with an in-phase follow-up.

---
### [NOTE] 2026-07-05 — G1–G3 verified: 13 opencode tests green; suite 734 → 747
Topics: opencode-adapter, tests
Affects-phases: phase-22-opencode-adapter
Affects-specs: none
Detail: G1 (command/skill shape — 3 tests), G2 (plugin unit coverage via .mjs dynamic import, no opencode runtime needed — 7 tests incl. ../ traversal and bash heuristic), G3 (agent frontmatter + spawn argv via stub binary — 3 tests). Two initial test bugs fixed (multi-line prompt vs line-split argv; recipes' `---` horizontal rules vs fence counting) — code was correct in both cases. Suite 747/747.

---
### [DISCOVERY] 2026-07-05 — Upgrade litters .bak files for byte-identical content (root cause of BUG-017's committed .baks)
Topics: opencode-adapter, upgrade, bug-017
Affects-phases: phase-22-opencode-adapter
Affects-specs: none
Detail: G4's upgrade-idempotence test exposed two .bak-litter sources: (1) `installHookFiles` (bin/momentum.js) backed up + rewrote momentum hook files even when source and dest were byte-identical — exactly how the `.githooks/*.bak` files that BUG-017(c) deleted got created and committed in the first place; fixed with an identical-content skip (files still recordManaged + re-chmod'd for the BUG-011 self-heal). (2) The install-time command-frontmatter transform makes opencode commands differ from their pristine templates, so the generic overlay upgrade backs each up before replacing, then the re-transform converges the content — leaving .baks identical to their bases; fixed with a converged-backup sweep in the adapter's runUpgrade (real user edits leave differing .baks, which are kept). Also completed TD-006 on `tests/swarm-e2e-multi-adapter.test.js` — its evidence capture was unmuted (missed by the original gating pass; masked by byte-identical rewrites).

---

### [NOTE] 2026-07-05 — G4 complete: fingerprint + smoke + tarball + swarm e2e; suite 747 → 756
Topics: opencode-adapter, tests, fingerprint
Affects-phases: phase-22-opencode-adapter
Affects-specs: none
Detail: opencode fingerprint baseline (58 files), upgrade byte-idempotence, adapter+orchestration smoke (init/ecosystem/join/leave/doctor + scout/dispatch/handoff/continue), tarball shape (15 opencode paths), and the 3 synthetic swarm scenarios × opencode with evidence at evidence/scenario-*-opencode.txt. Existing adapters untouched: claude-code/codex/antigravity fingerprints byte-identical, phase-18 evidence files restored after a header regression was caught in-session.

---
### [EVALUATOR] 2026-07-05 — G5 live validation: 6/7 checks pass; skills + parallelSubagents flipped on evidence; sessionStartHook stays false
Topics: opencode-adapter, capability-flips, validation, live-dogfood
Affects-phases: phase-22-opencode-adapter
Affects-specs: core/adapter-capabilities.md#matrix, core/adapter-parity-matrix.md
Detail: Full live runsheet against opencode 1.17.13 with real model calls (free tier, zero credentials) — evidence/val-opencode-live.txt. PASSED: command invocation (/validate ran the recipe), gate block + negative control, history reminder, agent discovery, supervisor spawn with --dir cwd-pinning, native skill load + multi-adapter coexistence, and parallel task fan-out with overlapping timestamps. FAILED HONESTLY: session.created not observed in run-mode → sessionStartHook stays false (VAL-002 standard). Live-found bug fixed in-phase: tool.execute.after carries no args in the real runtime — plugin now correlates by callID; synthetic tests updated to the live-confirmed payload shape. Runtime caveat recorded: a generic `event` bus hook hangs run-mode.

---

### [SCOPE_CHANGE] 2026-07-05 — Site adapter page deferred to the site-redesign lane
Topics: opencode-adapter, site-docs
Affects-phases: phase-22-opencode-adapter
Affects-specs: none
Detail: The plan listed "README + site adapter mention". README shipped; the site's ide-support page is inside the concurrently active `feat-site-redesign` lane's touch scope — editing it from this lane would create a real overlap collision (Rule 15). The opencode row lands with the site-redesign lane or as a follow-up after both land; noted for the landing coordination.

---

### [NOTE] 2026-07-05 — G5 complete; roadmap drift repaired; v0.27.0 prepared
Topics: opencode-adapter, roadmap, tracking-drift, release
Affects-phases: phase-22-opencode-adapter
Affects-specs: specs/planning/roadmap.md#timeline
Detail: Roadmap Timeline gains the shipped Phase 23 Rules Unification row; Reach re-scoped to opencode @ v0.27.0 (operator decision 2026-07-05); Intelligence renumbered 24 (v0.28.0), Platform 25 (v1.0); Milestones updated. Retrospective written with Verification Evidence (suite 756/756; live runsheet; upgrade idempotence). package.json 0.26.0 → 0.27.0. Release halted at the operator gate per the Autonomous Execution Contract.

---
### [SCOPE_CHANGE] 2026-07-05 — Release retargeted v0.27.0 → v0.28.0; rebased across the OKF landing
Topics: opencode-adapter, release, roadmap, okf
Affects-phases: phase-22-opencode-adapter
Affects-specs: specs/status.md#upcoming-phases, specs/planning/roadmap.md#timeline
Detail: While this lane sat in the landing queue, lane `feat-open-knowledge-format` landed as Phase 24 and released v0.27.0 (tag + GitHub Release + npm). This phase retargets to v0.28.0; Intelligence slides to v0.29.0+ (numbering: Intelligence 25, Platform 26 per main). The rebase also adopts the OKF v0.1 bundle conventions: phases/index.json is gone (this phase's topics now live as frontmatter tags on overview.md), impact-map.json → impact-map.md, and earlier history entries referencing v0.27.0 remain as written (append-only; this entry records the retarget).

---
