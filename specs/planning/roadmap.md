---
type: Roadmap
---

# Roadmap

> **Start Date**: 2026-04-21

## Timeline

| Phase | Name | Status | Key Deliverables |
|-------|------|--------|-----------------|
| 0 | Bootstrap | **Complete (v0.1.0)** | template files, install.sh, README, project spec structure |
| 1 | Tool-Agnostic Architecture | **Complete (v0.2.0)** | `core/` + `adapters/claude-code/` DIP restructure; `--coding-agent` flag on install.sh; other agents deferred to Phase 2 |
| 2 | npx CLI Distribution | **Complete (v0.3.0)** | `@avinash-singh-io/momentum` on npm; `momentum init` CLI; Claude Code only |
| 3 | Gap Fixes | **Complete (v0.4.0)** | Full specs/ scaffold, `--coding-agent` flag + adapter.js DIP, command fixes (ENH-003–007, TD-001–002), `brainstorm-idea` + `start-project` commands |
| 4 | Enhanced Commands | **Complete (v0.5.0)** | `momentum upgrade` CLI, `/validate` command, `/migrate` command |
| 5 | Rules & Upgrade Safety | **Complete (v0.6.0)** | Rules 10/11, persuasion-hardening (Rules 2/6/8/10/11), `## Project Extensions` marker, marker-aware `momentum upgrade`, `--coding-agent` → `--agent` rename (breaking) |
| 6 | Adapter Overlay & Verification | **Complete (v0.7.0 / hotfix v0.7.1)** | Adapter Contract v2 (per-agent commands/rules/scripts overlays, conflict = error); Rule 12 verify-before-claim; `/complete-phase` evidence rigor; `/review-code` (Claude Code, subagent-driven); ENH-014 cross-repo Rule 9; `tests/` for momentum CLI (24 tests via node:test) |
| 7a | Planning Contracts | **Complete (v0.8.0)** | Brainstorm Gate Contract (markdown discipline + Claude Code PreToolUse hook + `.momentum/brainstorm-active` sentinel) across `/brainstorm-phase`, `/brainstorm-idea`, `/start-project`; `/start-phase` Autonomous Execution Contract (spec only — engine ships in 7b); `.gitignore` hygiene for `._*` + `.momentum/`; test glob fix for macOS AppleDouble |
| 7b | Agent Runtime Compatibility | **Complete (v0.9.0)** | Adapter Contract v3; Codex adapter MVP (`AGENTS.md`, `.codex/hooks.json`, Codex command recipes); Claude regression coverage; ENH-018 tarball-shape test |
| 7c | Autonomous Execution & TDD | Not Started (target v0.10.0) | Subagent/autonomous execution engine implementing the autonomy contract from 7a on Adapter Contract v3; TDD opt-in (Rule 13); retry budget per-task |
| 8 | Parallel Worktree Orchestration | Not Started (target v0.11.0) | Multiple concurrent streams via git worktrees; `momentum worktree-manager` command; branch-per-stream conventions; conflict avoidance; cross-stream status visibility |
| 9 | Ecosystem (Tier 1) | **Complete (v0.12.0)** | Cross-repo ecosystem layer: `ecosystem.json` manifest; initiative concept; auto-logged daily session file; `momentum ecosystem init/add/remove/status` CLI; `/ecosystem` + `/initiative` + `/session` slash commands; PostToolUse hook extension. Single-repo momentum unchanged when no ecosystem root is present. 101/101 tests pass (+37 new). |
| 10 | Ecosystem Activation & Polish | **Complete (v0.13.0)** | Top-level entry/exit commands (`init --ecosystem`, `join`, `leave`, `doctor`) + init auto-detect; Phase 9 follow-up fixes (BUG-004, BUG-005, ENH-021, ENH-022); README rewrite as product positioning; per-adapter smoke matrix + capability audit. 165/165 tests pass. cerebrio dogfood deferred to a post-release user action. |
| 11 | Dynamic Orchestration & Context Handover | Not Started (target v0.14.0) | Capability-driven orchestration primitives (`scout` read-only context fetch, `dispatch` parallel fan-out, `handoff` control transfer) the main agent composes per task; capability-driven routing via Adapter Contract v3; specs maintenance preserved across every primitive. Codex / Antigravity capability research up front. See [`specs/planning/phase-11-orchestration-handover.md`](phase-11-orchestration-handover.md). |
| 12 | Public Site | **Complete (v0.15.0)** | GitHub Pages site at `trymomentum.github.io` built with Astro Starlight — landing page + 8 docs pages. Full identity pass (custom logo, brand palette, self-hosted display font, illustrated hero, OG/social cards). Two-repo cross-deploy. Lighthouse: 98 / 96 / 100 / 100. No CLI behavior changes. |
| 13 | Site Polish & Content Depth | **Complete (v0.16.0)** | Augment-in-place site revamp: wholesale landing rewrite ("Spec-driven development for agentic AI" positioning) with editorial diagram + animated phase flow; NEW `/orchestration/` page; Concepts / Skills / Rules deepened 3× word count; Ecosystem rewritten with topology SVG + worked example; Mermaid plugin wired into Starlight; end-to-end "Your first phase" tutorial; FAQ expanded. Lighthouse: 96/96/100/100. |
| 14 | Site Refinement & Positioning Pivot | **Complete (v0.17.0)** | Fix 4 rendering bugs from v0.16.0 (anchor syntax, Mermaid dark mode, PhaseFlow animation, ecosystem MDX leak); complete agentic-AI positioning pivot in body copy; terminology shift "repo" → "project" in positioning; sharpen ecosystem ↔ orchestration framing (state layer + action layer) with NEW `StateActionLayers` diagram; new logo (concentric arcs + arrow, two-tone slate+indigo); README wholesale rewrite. Metadata-only npm bump. |
| 15 | Ecosystem Agent Discoverability | **Complete (v0.18.0)** | ENH-025 close-out — `momentum ecosystem init` auto-writes managed CLAUDE.md + AGENTS.md; action-bearing pointer block in member repos (v=2 with auto-migration); SessionStart hook prints ecosystem context; `momentum dispatch` CLI surfaces degraded-mode notice upfront; `momentum ecosystem initiative create` CLI ships. Closes ENH-025/032/033/034/035. |
| 16 | Codex & Antigravity Adapter Rework (Native-Idiom) | **Complete (v0.19.0)** | Native-idiom rebuild: Codex full hook surface (apply_patch matcher) + TOML reviewer subagents + AGENTS.md recipes lookup pattern; Antigravity workflows + skills + native-tool-name hooks; brainstorm-gate.sh promoted to core/ and generalized for all three platforms; Claude Code zero-regression snapshot guard. VAL-001 + VAL-002 file live-runtime dogfood for post-release validation. |
| 17 | Swarm — Single-Session Multi-Project Feature Delivery (Claude Code) | **Complete (v0.20.0)** | Conductor + supervisor architecture with files-as-channels (no daemon); per-repo supervisors pinned by cwd; wave ordering from `ecosystem.json` dependencies; materialized board cache + git-SHA invalidation + incremental log + supervisor isolation = 95% token-cost saving vs naive; `autopilot` + `checkpoint` modes; inbox protocol; `/tell` + `/broadcast`; pre-merge preview; portability schema hooks (sessions[] + leases + signals/ + tokens/) for Phase 17.5. Claude Code only — Codex + Antigravity parity is Phase 18. |
| 17.5 | Swarm Portability | **Complete (v0.20.2 — pending release)** | `/swarm claim`, `/swarm release`, `/swarm focus`, `/swarm join`, `/swarm absorb` subcommands; lease enforcement at the `manifest.js` write chokepoint (EOWNERSHIP rejection + claim-request signal + lease-takeover on expiry); typed signal protocol (focus-request / claim-request / absorb-proposed / lease-expired); opaque single-use 16-hex transfer tokens with 1h default expiry; UNCLAIMED + FOCUSING owner sentinels. Schema hooks shipped in v0.20.0 lit up without migration. Three synthetic two-session e2e scenarios + signal load test. Solo-swarm behaviour unchanged. 86 new tests; suite 464 → 550. Claude Code only — Codex + Antigravity parity remains Phase 18. |
| 18 | Swarm Parity (Codex + Antigravity) | **Complete (v0.20.4)** | Codex `.codex/agents/swarm-supervisor.toml` + MCP cwd shim; Antigravity workflow + `.agents/skills/swarm-supervisor/SKILL.md`. `core/swarm/` is platform-agnostic; only adapter wiring was deferred. |
| 19 | Lifecycle Hardening | **Complete (v0.21.0)** | Make lifecycle discipline real, not prose: vendor-neutral git hooks (commit-msg + pre-push) via `core.hooksPath` (BUG-009, FEAT-018); Rule 12 verify-evidence tag gate (FEAT-019); first-class ad-hoc work lane `/hotfix` + spike + phase-optional plumbing (FEAT-020, ENH-044); Rule 14 escalation (ENH-045); branch cleanup + forge-neutral protection docs (ENH-041/042/043, TD-007); close phase-8 (TD-008). |
| 20 | Upgrade Hardening | **Complete (v0.22.0)** | Clean-tree gate for `upgrade` / `ecosystem upgrade`; git-trackable install lock. Follow-on ad-hoc patches: v0.22.1 `--autostash` (FEAT-022), v0.22.2 additive `.gitignore` refresh (FEAT-024), v0.22.3 additive/self-healing git-hook install (BUG-011). *(Row added 2026-07-02 — this file had drifted from status.md.)* |
| 21a | Parallel Lanes — Walk (Concurrent Workstreams) | **Complete (v0.23.0)** | ADR-0001; Rule 15 + Rule 2/4/5/6/8 lane-scoped edits + Rule 6 Landing Order (self + templates, all 3 adapters); multi-row Active Phase board; branch→phase resolution (hook script + 5 recipes + tests); "Working on multiple things at once" site page + README section; **dogfood-in-phase trial PASSED 3/3 pre-written thresholds** (G2∥G3 as live lanes — evidence in `specs/phases/phase-21a-lanes-walk/evidence/`); BUG-012 fixed en route (committed exec bits + suite guard). ENH-046 closed. |
| 21b | Parallel Lanes — Run (Lanes/Board/Queue) | **Complete (v0.24.0)** | FEAT-026 lane registry + ambient board + signals (git-common-dir, files-only, no daemon; queue pressure always visible); FEAT-027 merge queue with Rule-14-graded evidence gates; ENH-047 plan-time overlap warnings. Scope committed in `platform-parallel-lanes.md`; seeded brainstorm at start refined by the 21a trial. |
| 21c | Parallel Lanes — Fly (Recursive Waves) | **Complete (v0.25.0)** | FEAT-028 dependency annotations (tasks + phases) + one recursive wave planner in core; swarm rewired as top-scale consumer (e2e byte-stable); 3-ideas e2e demo; lane-state contract publication decision. |
| 24 | Open Knowledge Format (OKF v0.1) Adoption | **Complete (v0.27.0)** | specs/ as a conformant OKF v0.1 bundle (ADR-0005): distributed phase frontmatter replaces index.json; impact-map.md; idempotent upgrade migration; `momentum okf check|index`; OKF-native templates; waves on frontmatter with legacy fallback; self-repo dogfood (192-file bundle) |
| 22 | Reach — opencode Adapter | **Complete (v0.28.0)** | Adapter: opencode — full parity, LIVE-validated in-phase (native commands, plugin hooks, agents, skills:true — a momentum first, swarm spawn via `opencode run --dir`); Cursor (FEAT-007) + Gemini CLI (FEAT-008) stay P1 backlog for a later Reach wave; ENH-009 unblocked by this phase. *(Re-scoped 2026-07-05, operator decision.)* |
| 23 | Rules Unification (single-source agent instructions) | **Complete (v0.26.0)** | ADR-0004 build-time instruction generation; complete rulebook on every adapter auto-loaded surface; `.agent/rules/project.md` retired with safe migration. *(Row added 2026-07-05 — drift repair.)* |
| 22c | Opencode Polish & Multi-Adapter Support | **Complete (v0.30.0)** | BUG-020 fix: per-agent installed.json (ADR-0007), agent-scoped orphan cleanup, legacy migration; +3 opencode skills; repo-integrity guard tests; fleet-lock compat mirror. First phase executed by an opencode session. |
| 25 | Founding Contract (foundation docs authored, not scaffolded) | **Complete (v0.32.0)** | ADR-0008 three-state lifecycle (Installed → Founded → Phase loop): init stops shipping the four foundation placeholders; `/start-project` reframed as the founding step; phase commands gate on founded = charter + roadmap exist; `/validate` invariant; upgrade auto-removes provably-untouched placeholder installs. Closes ENH-060. *(Renumber 2026-07-06: Intelligence → 26, Platform → 27; renumber 2026-07-09: Project Preferences → 26, Intelligence → 27, Platform → 28.)* |
| 26 | Project Preferences | **Complete (v0.33.0)** | ADR-0009 trust-layer invariant + mechanisms-as-preferences; `specs/preferences.md` consumed by recipe templates; `momentum init`/`upgrade` infer from manifests + git remote; `pre-push` reads `protected_branches` from cache; BUG-024 fixed (forge/registry commands out of global templates); self-repo dogfooded. Closes ENH-061, BUG-024. |
| 27 | Lifecycle Cleanup & Default-Branch Hardening | **Complete (v0.34.0)** | One reusable, forge-neutral, default-branch-safe `cleanupTarget()` whose trigger is driven by `end_state`; push-terminal-branch-first at founding (BUG-025 — phase-0 no longer hijacks the forge default); auto-clean on land + `momentum lanes reconcile` for human/forge merges (BUG-026); human confirm→verify→clean handshake; tracking-before-release gate; `end_state: open-pr`; `._*`/`.bak` upgrade+transform hygiene + `momentum doctor`. Closes BUG-025, BUG-026; ships ENH-063. *(Renumber 2026-07-09: Intelligence → 28, Platform → 29.)* |
| 28 | Instruction Consistency | **Complete (v0.35.0)** | Instruction file = pure projection of `specs/` (ADR-0010); `upgrade` syncs all installed agents; ecosystem pointer into every instruction file; shared `specs/project-rules.md` prose surface pointed to by each file; migrate-not-drop Project Extensions; `/complete-phase` release fully config-driven; BUG-027. *(Renumber 2026-07-09: Intelligence → 29, Platform → 30.)* |
| 29 | Instruction Variation Model (Agent-Neutral Projection) | **Complete (v0.36.0)** | 3-tier instruction sources (principal constants / per-adapter manifest / surface delta); byte-identical neutral spine across every agent + surface; generator auto-discovers adapters (OCP); AGENTS.md composed with an integration section per installed AGENTS.md agent (fixes the same-path destination collision); ecosystem agent-detection fix; BUG-027 verified-fixed + regression guard; TD-009 (opencode fingerprints); ADR-0011. |
| 30a | Team-Walk (Multiplayer-Correct Coordination) | **Complete (v0.37.0)** | Git-native multiplayer plane (ADR-0012): `core/identity` durable actor; per-actor conflict-free fragments + compile into status.md; `refs/momentum/*` compare-and-swap; `momentum claim` (**closes ENH-057**) + `team board/record/sync/compile`. Core mechanisms shipped + tested; integration wiring (Rule 15 reword, recipe claim-wiring, legacy-writer identity, fingerprints) deferred to **ENH-064**. |
| 30b | Team-Run (Shared Board + Landing) | **Complete (v0.37.0)** | ADR-0013: `presence` (heartbeat + liveness), reviewer≠author `approvals` ledger (client-side-honest), one shared merge-queue `turn` across clones (ref-CAS). `team heartbeat/presence/approve/check/turn`. `lanes land`/`pre-push` gate wiring + backlog fragments deferred to **ENH-064**. |
| 30c | Team-Fly (Relay + Ecosystem) | **Complete (v0.37.0)** | ADR-0014: cross-machine lease-CAS primitive; self-hostable authority-free relay + graceful absence; versioned published contract. `team lease/relay/contract`. Ecosystem team mode (remote-URL members, ecosystem-state fragments, swarm-manifest lease wiring) deferred to **ENH-064**. |
| 30d | Team Integration | **Complete (v0.38.0)** | Wires the v0.37.0 primitives into the real workflows (ENH-064): `momentum claim` in `/brainstorm-phase` + `/complete-phase` + `/hotfix`; Rule 15 cites the mechanism; **reviewer≠author gate in `lanes land`** (config-gated, solo-safe) + attributed **pre-push merge-approval audit**; team config keys; auto-heartbeat presence; **opt-in swarm lease-CAS fence** (`MOMENTUM_SWARM_LEASE_CAS=1`, additive/fail-open). Remote-URL members + ecosystem-state fragments + docs deferred to **ENH-065**. Suite 1008/1008. |
| 31 | Intelligence | Not Started (target v0.38.0+) | Self-learning hooks (`specs/learnings.md`); retrospective-driven rule evolution; self-healing (recurring failure → ADR proposal); context-window-aware task sizing *(renumber 2026-07-10: Team-mode 30a/b/c inserted; Intelligence 30 → 31)* |
| 32 | Platform | Not Started (target v1.0) | MCP server; `/specify` auto-spec generation; `/decide` (ADR creation); skill/command authoring command; bidirectional spec sync (experimental); ecosystem Tier 2 (federated impact-map, shared rules, deploy-order awareness, multi-repo `/review-code`). *(Dependency-aware task ordering moved to the Parallel Lanes arc — FEAT-028; renumber 2026-07-10: Platform 31 → 32.)* |
| 22b | Antigravity 2.0 Full Adoption | **Complete (v0.29.0)** | Evidence-first realignment vs agy CLI 1.0.16: canonical `.agents/` root (ADR-0005); real five-event hooks contract via boundary shim; spawn on real flags (live BOOT-OK); plugin-pack + doctor advisory; VAL-002 resolved; ENH-051 superseded; FEAT-008 closure rec. *(Ran parallel to phase-22 opencode; landed + released 2026-07-05.)* |

## Unscheduled Future Work

Work items captured against the roadmap with no committed version target. Pickable any time when they become the right next thing.

| Name | Stub | Notes |
|------|------|-------|
| Hardening & Activation | [`specs/planning/unscheduled-hardening-activation.md`](unscheduled-hardening-activation.md) | Originally slotted as Phase 10 (v0.13.0); displaced 2026-06-07 when Ecosystem Activation took priority. Scope intact: full systematic-debugging skill; SessionStart auto-activation (Claude Code); persuasion-hardening Rules 1/3/4/5/7/9 (evidence-permitting); ENH-017 project-name preservation across upgrade. |
| ~~Parallel Stream Development~~ | [`specs/planning/unscheduled-parallel-streams.md`](unscheduled-parallel-streams.md) | **CLOSED won't-do (Phase 19, TD-008)** — branch deleted; stub kept as closure record. The underlying problem was re-opened 2026-07-02 as the **Parallel Lanes platform arc** (below) — coordination layer only, no streams CLI. |
| Parallel Lanes Platform (Run + Fly) | [`specs/planning/platform-parallel-lanes.md`](platform-parallel-lanes.md) | Direction adopted 2026-07-02: momentum = coordination & trust plane — Lanes/Waves/Board/Gates/Queue over one recursive plan graph. **Walk shipped as Phase 21a (v0.23.0, trial passed)**; Run and Fly are scheduled in the Timeline as Phases 21b (v0.24.0) and 21c (v0.25.0). Landscape evidence: [`research-parallel-agent-landscape.md`](research-parallel-agent-landscape.md). |
| Context Economy (deferred) | [`specs/planning/future-context-economy.md`](future-context-economy.md) | Trigger-gated, not on the shelf. Section Map headers + ecosystem `STATE.md` router. Pulled off the shelf only when concrete size/behaviour thresholds fire. |

## Phase Dependencies

```
Phase 0 (Bootstrap)
  └── Phase 1 (Tool-Agnostic Architecture)
       └── Phase 2 (npx CLI Distribution)
            └── Phase 3 (Gap Fixes)
                 └── Phase 4 (Enhanced Commands)
                      └── Phase 5 (Rules & Upgrade Safety) ✓
                           └── Phase 6 (Adapter Overlay & Verification — assumes hardened rules)
                                └── Phase 7a (Planning Contracts — assumes overlay structure)
                                     └── Phase 7b (Agent Runtime Compatibility — proves multi-agent adapter boundary)
                                          └── Phase 7c (Autonomous Execution & TDD — assumes Adapter Contract v3)
                                               └── Phase 8 (Parallel Worktree Orchestration — assumes autonomous execution)
                                                    └── Phase 9 (Ecosystem Tier 1 — assumes single-repo maturity) ✓
                                                         └── Phase 10 (Ecosystem Activation & Polish — production-ready ecosystem layer)
                                                              └── Phase 11 (Dynamic Orchestration & Context Handover — assumes capability audit)
                                                                   └── Phase 12 (Public Site — assumes mature toolkit story)
                                                                        └── Phase 13 (Site Polish & Content Depth — assumes shipped site)
                                                                             └── Phase 14 (Site Refinement & Positioning Pivot — fixes + completes Phase 13)
                                                                                  └── Phase 15 (Ecosystem Agent Discoverability — closes the gap between primitives existing and agents using them)
                                                                                       └── Phase 16 (Reach — assumes hardened ecosystem story)
                                                                                            └── Phase 17 (Intelligence — assumes multi-agent base)
                                                                                                 └── Phase 18 (Platform — assumes the rest)
                                                                                   ‖
                                                                                   Unscheduled: Hardening & Activation can slot in anywhere
                                                                                   before its absence becomes a blocker.
```

## Open Questions

| ID | Question | Status |
|----|----------|--------|
| ENH-008 | What should `--coding-agent` be called? | **Resolved (Phase 5)** — renaming to `--agent` (hard rename, breaking) |
| ENH-009 | Distribution: stay with npx, add native agent plugins, or both? | Deferred — blocked on ≥1 additional adapter shipping first |

---

## Milestones

| Milestone | Phase | Description |
|-----------|-------|-------------|
| v0.1.0 — Installable | 0 | Template + install.sh working end-to-end (Claude Code only) |
| v0.2.0 — Tool-Agnostic | 1 | core/ + adapters/ — works for any supported AI tool |
| v0.3.0 — npx CLI | 2 | `@avinash-singh-io/momentum` on npm; `momentum init` CLI (Claude Code only) |
| v0.4.0 — Gap Fixes | 3 | `momentum init` fully scaffolds a project; command content complete |
| v0.5.0 — Enhanced Commands | 4 | `momentum upgrade` CLI; `/validate` + `/migrate` commands |
| v0.6.0 — Rules & Upgrade Safety | 5 | Rules 10/11, persuasion-hardening, marker-based upgrade, `--agent` rename (breaking) |
| v0.7.0 — Adapter Overlay & Verification | 6 | Adapter Contract v2 (overlays); Rule 12 verify-before-claim; /complete-phase evidence rigor; /review-code (Claude Code); cross-repo Rule 9; tests/ for CLI |
| v0.7.1 — BUG-002 hotfix | 6 | Patched npm tarball `files` glob (`adapters/**/commands/**`) so overlay files actually ship |
| v0.8.0 — Planning Contracts | 7a | Brainstorm Gate Contract (3 commands + Claude Code PreToolUse hook + sentinel); /start-phase Autonomous Execution Contract (spec only); .gitignore hygiene; test glob fix |
| v0.9.0 — Agent Runtime Compatibility | 7b | Adapter Contract v3; Codex adapter MVP; Claude regression coverage; tarball-shape test |
| v0.10.0 — Autonomous Execution & TDD | 7c | Autonomous execution engine; TDD opt-in Rule 13; retry budget per-task |
| v0.11.0 — Parallel Worktree Orchestration | 8 | Multi-stream concurrent development via git worktrees; worktree-manager command; branch-per-stream conventions |
| v0.12.0 — Ecosystem (Tier 1) | 9 | **Released 2026-06-07** — cross-repo manifest + initiatives + auto session log + `momentum ecosystem` CLI + `/ecosystem` / `/initiative` / `/session` slash commands. Single-repo momentum unchanged. 101/101 tests pass. |
| v0.13.0 — Ecosystem Activation & Polish | 10 | **Released 2026-06-07** — Top-level entry/exit commands; Phase 9 follow-up fixes (incl. BUG-005 surfaced + fixed in-cycle); README rewrite; per-adapter smoke matrix + capability audit. 165/165 tests pass. |
| v0.14.0 — Dynamic Orchestration & Context Handover | 11 | Capability-driven `scout` / `dispatch` / `handoff` primitives; specs maintenance contract; Codex / Antigravity capability research |
| v0.15.0 — Public Site | 12 | **Released 2026-06-08** — GitHub Pages site (Astro Starlight) at trymomentum.github.io — landing + 8 docs pages; full identity pass; cross-repo deploy; metadata-only npm bump. Lighthouse 98/96/100/100. |
| v0.16.0 — Site Polish & Content Depth | 13 | **Released 2026-06-08** — Landing wholesale rewrite; NEW /orchestration/; Concepts/Skills/Rules deepened; Ecosystem rewritten with topology + worked example; Mermaid plugin wired; end-to-end tutorial. Lighthouse 96/96/100/100. |
| v0.17.0 — Site Refinement & Positioning Pivot | 14 | **Released 2026-06-08** — 4 rendering-bug fixes (anchor syntax, Mermaid dark mode, PhaseFlow animation, ecosystem MDX leak); agentic-AI positioning pivot in body copy; repo→project terminology; ecosystem ↔ orchestration as state+action layers with NEW StateActionLayers diagram; new logo (two-tone concentric arcs + arrow); README wholesale rewrite |
| v0.18.0 — Ecosystem Agent Discoverability | 15 | **Released 2026-06-08** — ENH-025 close-out + four sibling discoverability fixes: managed ecosystem CLAUDE.md/AGENTS.md on init; action-bearing pointer block (v=2 auto-migration); SessionStart ecosystem-context banner; dispatch CLI upfront degraded-mode notice; `momentum ecosystem initiative create` CLI. 288/288 tests (+34). |
| v0.19.0 — Codex & Antigravity Adapter Rework | 16 | **Released 2026-06-11** — native-idiom Codex + Antigravity adapters; Claude Code zero-regression fingerprint guard |
| v0.20.0 — Swarm | 17 | **Released 2026-06-12** — conductor/supervisor multi-project delivery (Claude Code); v0.20.2 portability; v0.20.4 Codex+Antigravity parity |
| v0.21.0 — Lifecycle Hardening | 19 | **Released 2026-06-19** — enforced git hooks (commit-msg, pre-push), verify-evidence tag gate, /hotfix ad-hoc lane, Rule 14 |
| v0.22.0 — Upgrade Hardening | 20 | **Released 2026-06-20** — clean-tree gate + install lock; patches v0.22.1 autostash / v0.22.2 gitignore refresh / v0.22.3 hook-install self-heal |
| v0.23.0 — Parallel Lanes Walk | 21a | **Released 2026-07-03** — Rule 15 concurrent workstreams, lane-scoped rules + templates, branch→phase resolution, multi-row Active Phase board, dogfood trial passed 3/3 thresholds |
| v0.24.0 — Parallel Lanes Run | 21b | **Released 2026-07-03** — momentum lanes CLI: registry/board/signals, merge queue with Rule-14-graded gates, overlap warnings; mechanism dogfooded on its own phase |
| v0.25.0 — Parallel Lanes Fly | 21c | **Released 2026-07-03** — one recursive wave engine, swarm rewired byte-stable, dependency annotations + momentum waves, 3-ideas e2e demo; lane-state stays internal (operator decision pending) |
| v0.26.0 — Rules Unification | 23 | **Released 2026-07-03** — ADR-0004 single-source instruction generation; complete rulebook on every adapter surface. *(Row added 2026-07-05, drift repair.)* |
| v0.27.0 — Open Knowledge Format (OKF v0.1) Adoption | 24 | **Released 2026-07-05** — specs/ as a conformant OKF v0.1 bundle; distributed phase frontmatter; `momentum okf check\|index` |
| v0.28.0 — Reach: opencode Adapter | 22 | **Released 2026-07-05** — full-parity opencode adapter, live-validated in-phase; skills:true a momentum first *(npm artifact lost to the release race — GitHub tag/release stand; see changelog)* |
| v0.29.0 — Antigravity 2.0 Full Adoption | 22b | **Released 2026-07-05** — evidence-first realignment vs agy 1.0.16; canonical `.agents/` root; boundary-shim five-event hooks; VAL-002 resolved |
| v0.32.0 — Founding Contract | 25 | Foundation docs authored, not scaffolded (ADR-0008): three-state lifecycle, founding step, founded gate, upgrade placeholder removal |
| v0.33.0 — Project Preferences | 26 | ADR-0009 trust-layer invariant + mechanisms-as-preferences; `specs/preferences.md`; recipe templates read preferences; BUG-024 fix |
| v0.34.0 — Lifecycle Cleanup & Default-Branch Hardening | 27 | **Released 2026-07-09** — default-branch-safe reusable cleanup; push-terminal-first (BUG-025); auto-clean on land + `lanes reconcile` (BUG-026); confirm→verify→clean handshake; tracking-before-release gate; `end_state: open-pr`; `._*`/`.bak` hygiene + `doctor --clean` |
| v0.35.0 — Instruction Consistency | 28 | **Released 2026-07-09** — instruction files project `specs/` (ADR-0010); upgrade-all-agents; ecosystem pointer everywhere; `specs/project-rules.md`; config-driven release; BUG-027 |
| v0.36.0 — Instruction Variation Model | 29 | Agent-neutral instruction projection: 3-tier sources (principal constants / per-adapter manifest / surface delta), byte-identical neutral spine, generator adapter auto-discovery (OCP), AGENTS.md composed per installed AGENTS.md agent |
| v1.0.0 — Platform | 31 | MCP server, /specify, /decide, skill authoring; ecosystem Tier 2 |
| Unscheduled | — | Hardening & Activation: systematic-debugging skill (full); SessionStart auto-activation; persuasion-hardening Rules 1/3/4/5/7/9; ENH-017 |
