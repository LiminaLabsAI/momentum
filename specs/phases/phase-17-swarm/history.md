# Phase 17 Swarm History

> Append-only log of decisions, scope changes, and discoveries during Phase 17.

### [SCOPE_CHANGE] 2026-06-12 — Phase 17 redirected from Reach → Swarm; Reach pushed to Phase 18
Topics: phase-17, swarm, scope-change, multi-project, parallel-supervisors, reach-deferred
Affects-phases: phase-17-swarm, phase-18-reach (renumbered)
Affects-specs: specs/planning/roadmap.md, specs/status.md
Detail: Phase 17 was queued as Reach (Cursor + Gemini adapters). User-articulated gap: today's ecosystem + orchestration (Phase 9–15) supports cross-repo awareness but not SUSTAINED PARALLEL WORK across multiple repos in one session. Scout fetches snapshots; dispatch fans out one prompt and synthesizes; handoff transfers control. None of them sustain a multi-hour multi-repo feature delivery in one user session. Phase 17 redirects to building this capability ("swarm") — Reach (FEAT-007 Cursor + FEAT-008 Gemini + ENH-009 distribution) shifts to Phase 18 or later. Rationale: swarm consumes ecosystem.json dependency edges + initiatives that landed in Phase 9–15 — those primitives were partly built FOR this. Reach is about external discoverability; swarm is about deepening the core loop. Tighter loop first, market harder after. 7-agent research workflow on 2026-06-12 confirmed the design direction.

---

### [DECISION] 2026-06-12 — Capability name: `swarm`
Topics: phase-17, swarm, naming
Affects-phases: phase-17-swarm
Affects-specs: specs/phases/phase-17-swarm/overview.md
Detail: Considered: stream, squad, fleet, federation, swarm, extending initiative. User chose `swarm`. Decision locked. The swarm work-unit lives at `<eco>/swarms/<id>/`; the user's session is the conductor; per-repo subagents are supervisors.

---

### [DECISION] 2026-06-12 — Conductor + Supervisor architecture; files-as-channels; no daemon
Topics: phase-17, swarm, architecture, file-based-coordination, stateless-agents
Affects-phases: phase-17-swarm
Affects-specs: core/swarm/* (entire new directory)
Detail: Architecture: user's session = conductor. Per-repo supervisor subagents are spawned with cwd pinned to each impacted repo. Each supervisor runs momentum's normal /start-phase → implement → /sync-docs → /complete-phase loop INSIDE its repo. Agents are stateless across turns; swarm state lives in files at `<eco>/swarms/<id>/` (manifest, board cache, contracts, inbox, signals, tokens, details, changes). Conductor coordinates by reading/writing these files; supervisors read their own brief + repo state. No daemon, no message broker, no server — same mkdir-lock pattern session-append.sh already uses. This aligns with Anthropic's published multi-agent guidance (subagents can't coordinate mid-task; orchestrator + fresh-context workers + durable external state is the dominant pattern) and AWS Labs CAO's per-workspace-supervisor model.

---

### [DECISION] 2026-06-12 — Indexing: all 4 strategies layered
Topics: phase-17, swarm, indexing, token-efficiency, board-cache, git-sha-invalidation
Affects-phases: phase-17-swarm
Affects-specs: core/swarm/lib/board.js, core/swarm/lib/git-sha-cache.js, core/swarm/lib/incremental-log.js
Detail: Token-cost analysis: naive file-reading per conductor turn = ~290KB (manifest + per-repo briefs × N + history.md × N + tasks.md × N + inbox + full session log + contracts). Over a 200-turn swarm × 5 repos = ~60M tokens (~$50-100). Unacceptable. Four indexing strategies layered: (A) Materialized board cache — board.json regenerated on supervisor writes; conductor reads ONLY this on most turns (~1KB). (B) Git HEAD SHA invalidation — manifest tracks `last_seen_sha`; unchanged repos use cached state. (C) Incremental session log + history tail — track last_read_offset; never read full history.md. (D) Supervisor context isolation — supervisors NEVER reach into other repos; conductor NEVER loads supervisor context. Together: conductor turn ~3KB (99% saving); supervisor turn ~10KB (80% saving); full swarm ~3M tokens (~$2-5). All four shipped in v0.20.0.

---

### [DECISION] 2026-06-12 — Three intervention modes; v0.20.0 ships autopilot + checkpoint
Topics: phase-17, swarm, modes, interventions
Affects-phases: phase-17-swarm
Affects-specs: core/swarm/conductor.js, docs/swarm.md
Detail: Three modes: `autopilot` (start-to-finish, no per-wave approval; inbox items auto-decided or halt-supervisor-only), `checkpoint` (DEFAULT; approve plan + each wave; inbox surfaces during waves), `interactive` (every supervisor task gets surfaced before execution). v0.20.0 ships autopilot + checkpoint. Interactive deferred to v0.20.x because it's harder to render cleanly on a chat surface. Switchable mid-flight via `/swarm mode <name>`.

---

### [DECISION] 2026-06-12 — Eight intervention patterns; v0.20.0 ships 5
Topics: phase-17, swarm, intervention-patterns, scope-cut
Affects-phases: phase-17-swarm
Affects-specs: core/swarm/* recipes
Detail: Eight intervention patterns identified: (1) pre-flight plan approval, (2) wave checkpoint, (3) mid-flight question (supervisor → user via inbox), (4) context push (user → one supervisor via /swarm tell), (5) broadcast (user → all supervisors), (6) discuss thread (sustained sub-chat with one supervisor), (7) manual takeover (pause/resume one supervisor), (8) rewind (revert a supervisor to a known-good state). v0.20.0 ships 1+2+3+4+5 (the load-bearing 80%). Discuss / pause-resume / rewind shipped in v0.20.x. All five v0.20.0 patterns are file-based (inbox files, context append files, manifest writes) — same primitive throughout.

---

### [ARCH_CHANGE] 2026-06-12 — New ecosystem-root artifact tree under `<eco>/swarms/<id>/`
Topics: phase-17, swarm, ecosystem-artifacts, manifest, board, contracts, inbox, signals
Affects-phases: phase-17-swarm
Affects-specs: core/swarm/schema/*, ecosystem-root layout
Detail: New artifact tree under `<eco>/swarms/<id>/`: `manifest.json` (saga state — repos, waves, owner/lease, claim-token ranges, contract pins), `board.json` (materialized status summary, regenerated on writes), `contracts/<surface>.contract.json` (Pact-style shape declarations, content-hashed, version-bumped on approval), `inbox/NNNN-<slug>.md` + `inbox/INDEX.md` (approval queue), `signals/` (cross-session signals — reserved in v0.20.0, semantics in Phase 17.5), `tokens/` (opaque tokens for session-to-session join/focus/absorb — reserved), `details/<repo>.json` (per-repo state cache for drill-in), `changes/<id>.md` (cross-repo changeset at swarm completion). All writes via mkdir-lock for race safety. Per Rule 10 this is additive — no ADR required.

---

### [ARCH_CHANGE] 2026-06-12 — Per-repo phase brief frontmatter extension
Topics: phase-17, swarm, phase-brief, frontmatter, spec-discipline
Affects-phases: phase-17-swarm
Affects-specs: specs-templates phase brief, /start-phase recipe, /validate recipe
Detail: Per-repo phase brief gains optional frontmatter fields: `swarm: <id>`, `wave: <n>`, `initiative: <slug>`, `claimed_by_session: <uuid>`. Fields are OPTIONAL — a solo (non-swarm) phase brief is byte-shape-compatible. /start-phase recipe is extended to populate these when invoked from a swarm context (which provides them via env or arg). /validate recipe checks integrity: (a) swarm manifests reference real ecosystem members, (b) per-repo briefs' swarm: fields point at real swarms, (c) initiative Per-repo contributions match swarm member set after completion. Existing phases and validators remain working. Migration: existing initiatives become valid swarm-initiatives by adding swarm: on next use.

---

### [DECISION] 2026-06-12 — Portability schema hooks baked into v0.20.0; commands ship in Phase 17.5
Topics: phase-17, swarm, portability, schema-hooks, forward-compatible, phase-17-5
Affects-phases: phase-17-swarm, phase-17-5-swarm-portability (new)
Affects-specs: core/swarm/schema/manifest.schema.json
Detail: User raised the scenario of session portability — split a running swarm into a focused side-session, join independent sessions into a swarm, converge multiple sessions back to one. Full implementation (`/swarm focus`, `/swarm join`, `/swarm absorb`, lease enforcement, signal protocol) is ~1 week of additional work — shipped in Phase 17.5 v0.20.1. v0.20.0 bakes the schema hooks in so the migration is painless: manifest holds `repos[name].owner` + `lease_expires_at` + `lease_renewed_at` per repo + top-level `sessions[]` registry; `signals/` + `tokens/` directories present (empty). v0.20.0 always sets owner = current session; never enforces lease semantics. v0.20.1 lights up the commands without any schema migration.

---

### [DECISION] 2026-06-12 — v0.20.0 scope: Claude Code only; Codex + Antigravity deferred
Topics: phase-17, swarm, scope, claude-code-only, codex-deferred, antigravity-deferred
Affects-phases: phase-17-swarm, future swarm-parity phase
Affects-specs: specs/phases/phase-17-swarm/overview.md
Detail: User direction: ship Phase 17 swarm as Claude Code only; defer Codex + Antigravity parity to subsequent phases. Rationale: (a) ship the capability faster (~2.5 weeks vs 3.5), (b) avoid risk of Codex/Antigravity integration overflow blocking the core swarm work, (c) Claude Code is the daily-driver platform — proving the capability there delivers user value immediately. The core/swarm/ library is platform-agnostic; adapter wiring is the only Codex/Antigravity-specific work. Follow-up phase will add the two adapter conductors using the same MCP shim + Agent Manager strategy designed during this brainstorm — the design holds; only the timing changes.

---

### [DECISION] 2026-06-12 — End-to-end scenarios use synthetic ecosystem fixtures; cerebrio stays untouched until release
Topics: phase-17, swarm, end-to-end-scenarios, synthetic-fixtures, cerebrio-deferred
Affects-phases: phase-17-swarm
Affects-specs: tests/fixtures/swarm-ecosystems/, specs/backlog/backlog.md
Detail: User direction: do NOT use cerebrio-ecosystem (real project) for Phase 17 dogfood. Cerebrio bootstrap stays a post-release activity — once v0.20.0 ships, user installs the released version and uses it on cerebrio. Phase 17 validates with three synthetic ecosystem fixtures built into the test suite at `tests/fixtures/swarm-ecosystems/`: (A) 3-repo linear (shared-types → backend → frontend), (B) 4-repo branched (one root → two parallel → one merge), (C) 5-repo wide fan-out. Renaming: called "end-to-end scenarios" (not "dogfoods") since they're synthetic. Reproducible by every dev. Cerebrio bootstrap remains on the post-release Next Actions list — no change to that status.

---

### [NOTE] 2026-06-12 — Group 0 landed — schemas + indexing foundation
Topics: phase-17, swarm, group-0, schemas, manifest, board, contract, dispatch-run, wave-ordering, git-sha, incremental-log, brief-frontmatter
Affects-phases: phase-17-swarm
Affects-specs: core/swarm/schema/*, core/swarm/lib/*, core/commands/start-phase.md, core/commands/validate.md, core/specs-templates/specs/phases/README.md, tests/fixtures/v0.18.0-claude-code-fingerprint.json
Detail: G0 shipped four JSON schemas (manifest / board / contract / dispatch-run) and six libraries (manifest CRUD + mkdir-lock, board materializer, wave-ordering topo sort + cycle detection, git-sha cache, incremental log reader, brief frontmatter helper). 55 new tests across `swarm-schemas.test.js`, `swarm-wave-ordering.test.js`, `swarm-indexing.test.js`. Documentation extensions: optional swarm frontmatter (`swarm:` / `wave:` / `initiative:` / `claimed_by_session:`) on phase briefs — solo briefs unchanged — plus `/validate` swarm member integrity rule. Claude Code regression fingerprint refreshed for the three documentation file drifts (start-phase.md + validate.md + phases/README.md). Full suite 326 → 381 (zero pre-existing regressions).

---

### [ARCH_CHANGE] 2026-06-12 — Swarm fingerprint update — Claude Code install gains swarm frontmatter docs (additive)
Topics: phase-17, swarm, claude-code-fingerprint, brief-frontmatter, validate, additive
Affects-phases: phase-17-swarm
Affects-specs: tests/fixtures/v0.18.0-claude-code-fingerprint.json
Detail: Three Claude Code install files drifted intentionally during G0 — `start-phase.md` (swarm frontmatter note), `validate.md` (swarm member integrity check), `phases/README.md` (swarm-member briefs section). Per Rule 10 this is additive (no design change — extending documentation to cover an optional v0.20.0 feature). Fingerprint baseline regenerated; meta updated to point at Phase 17 G0. Solo-phase behavior unchanged: briefs without frontmatter remain valid and byte-shape-compatible with v0.19.0.

---

### [DISCOVERY] 2026-06-12 — 7-agent research workflow confirmed conductor + supervisor + files-as-channels is the dominant pattern
Topics: phase-17, swarm, research, multi-agent, anthropic, devin, cao
Affects-phases: phase-17-swarm
Affects-specs: specs/phases/phase-17-swarm/overview.md (Reference Documents section)
Detail: 7-agent research workflow surveyed industry patterns (Anthropic multi-agent research system, AWS Labs CAO, Devin 2, Cursor 3, Claude Code worktrees, CrewAI hierarchical, OpenAI Swarm, LangGraph supervisor) and converged on the same architecture: orchestrator writes plan to durable external memory, spawns workers with fresh context, workers don't communicate mid-task, state lives in files. Closest production analog: AWS Labs cli-agent-orchestrator (CAO) with per-tmux-session supervisors + central memory store. Highest-confidence findings: (a) per-workspace state lives in files inside that workspace, not in agent memory; (b) git worktrees are the de-facto isolation primitive in 2026; (c) the agent is stateless, the sandbox is ephemeral, an append-only session/event log is durable; (d) Anthropic's published guidance: multi-agent for parallel-decomposable tasks, NOT for tightly interdependent coding tasks — multi-repo coordination via dependency-ordered waves is the right pattern. Cost: ~15x tokens vs single-agent without indexing; ~3x with indexing (acceptable). Sources logged in overview.md Reference Documents section.
