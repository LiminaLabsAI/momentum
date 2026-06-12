# Phase 17: Swarm — Single-Session Multi-Project Feature Delivery (Claude Code)

> **Target Version**: v0.20.0
> **Status**: Not Started
> **Goal**: Enable ONE user session on Claude Code to drive a cross-repo
> feature end-to-end with parallel per-repo supervisors, full per-repo spec
> discipline preserved, full coordination state preserved at the ecosystem root.

## The problem

Today's ecosystem + orchestration layer (Phase 9–15) gives momentum cross-repo
awareness — `ecosystem.json` declares membership, `initiatives/` track
multi-repo work, scout/dispatch/handoff/continue let one session reach into
others. But each session is largely **independent** — scout fetches a snapshot,
dispatch fans out one prompt and synthesizes, handoff transfers control. None
of them **sustain parallel work across multiple repos in one session**.

When a feature needs end-to-end work in frontend + backend + shared-types, the
user today must either: (a) drive each repo serially in one session (slow,
loses parallelism), or (b) open three sessions and manually coordinate
(handoff fatigue, context-switching cost). Neither preserves momentum's spec
discipline at the ecosystem level.

## The capability: Swarm

A **swarm** is a declared cross-repo work unit driven from ONE user session.

The user's session becomes the **conductor**. The conductor spawns one
**supervisor** subagent per impacted repo, each pinned to that repo's working
directory with its own fresh context. Each supervisor runs momentum's normal
`/start-phase` → implement → `/sync-docs` → `/complete-phase` loop INSIDE its
repo. The conductor coordinates waves (from `ecosystem.json` dependency
edges), surfaces inbox decisions, broadcasts cross-cutting concerns, and
synthesizes per-repo retrospectives into the initiative doc at fan-in.

Crucially: **agents are stateless across turns; the swarm's state lives in
files**. A swarm survives session boundaries the same way a phase does
today — every state-changing action writes to disk; `/swarm resume`
reconstitutes from disk.

## The architecture: file-based coordination, no daemon

| Layer | Owns | Reads |
|---|---|---|
| Conductor (user session) | `<eco>/swarms/<id>/manifest.json` + `board.json` + `contracts/` + `inbox/` + `signals/` + `changes/` | Per-supervisor `dispatch-run-<id>.json` (status) |
| Supervisor (per repo) | `<repo>/specs/phases/phase-N-<slug>/*` + `<repo>/.momentum/runs/dispatch-run-<id>.json` (its own row in swarm state) | Its phase brief + contract + history.md tail |
| Ecosystem session log | `<eco>/sessions/YYYY-MM-DD.md` (existing; gains `Active swarm:` header) | All conductors append-only |

No daemon. No message broker. No server. Just files in the ecosystem repo,
with the same `mkdir`-lock pattern `session-append.sh` already uses for
race-safe writes.

## Top-level decisions

| Decision | Choice | Rationale |
|---|---|---|
| Name: `swarm` | Confirmed | User pick; clear metaphor of coordinated workers |
| Conductor + supervisor architecture | Files-as-channels, stateless agents | Aligns with Anthropic published multi-agent guidance; survives session boundaries naturally |
| **v0.20.0 platform scope: Claude Code only** | Codex + Antigravity parity deferred to subsequent phase | Ship the capability ~1 week sooner; daily-driver platform first; core/swarm/ is platform-agnostic so adapter wiring is the only deferred work |
| Indexing: 4 strategies layered | (A) board cache + (B) git SHA invalidation + (C) incremental log + (D) supervisor context isolation | Reduces conductor-turn token cost by ~99% vs. naive reading; ~$2-5 per swarm vs. ~$50-100 |
| Modes (3 total) | autopilot / checkpoint / interactive — DEFAULT `checkpoint` | autopilot for trust; checkpoint for default review at wave boundaries; interactive for maximum control |
| v0.20.0 ships modes | autopilot + checkpoint; defer interactive to v0.20.x | Interactive UI is harder to render well in a chat surface; cover 95% of need first |
| Intervention surface — v0.20.0 (5) | plan approval, wave checkpoint, mid-flight question (inbox), context push (`/swarm tell`), broadcast | Load-bearing 80% — without these, capability isn't usable |
| Intervention surface — v0.20.x (3) | discuss, pause/resume single supervisor, rewind | Polish; great to have but capability ships without them |
| Per-repo spec discipline | Existing phase model UNCHANGED; brief gains `swarm:` + `wave:` + `initiative:` frontmatter as ONLY change | Solo phase and swarm-member phase are byte-shape-compatible |
| Portability (Scenarios A/B/C from brainstorm) | Schema hooks baked in v0.20.0 (owner/lease/signals/tokens); commands ship in Phase 17.5 v0.20.1 | Forward-compatible schema; commands are ~1 week of follow-up work |
| Wave ordering | Computed from `ecosystem.json` `dependencies[]` field at swarm start | Existing field; deterministic |
| Default lease duration | 24h, renewed each conductor turn; auto-release after 5min idle | Long enough for working session; short enough to recover from abandonment |
| Token budget | Per-supervisor `max_tokens` in manifest (default 300k); halts at cap; explicit `/swarm budget <repo> +N` to extend | Hard cap prevents runaway; explicit extension prevents silent overshoot |
| Rollback | Not automatic. `/swarm rewind <repo> --to <task>` (deferred to v0.20.x) or `/swarm cancel` (v0.20.0) — both gated on user approval | Rollback is destructive |
| End-to-end runs | 3 synthetic ecosystem fixtures (3-repo linear, 4-repo branched, 5-repo wide) under `tests/fixtures/swarm-ecosystems/` | Reproducible by every dev; no risk to real projects (cerebrio etc.); cerebrio bootstrap stays a post-release activity |
| User-facing docs | `docs/swarm.md` top-level only (site addition deferred) | Top-level ships fast; site polish in a later docs phase |

## Indexing strategies (the load-bearing efficiency design)

### Strategy A — Materialized board cache

`<eco>/swarms/<id>/board.json` is regenerated by the `update-board` script
every time a supervisor writes to its `dispatch-run-<id>.json` or anywhere in
the swarm state.

```json
{
  "swarm_id": "0007-user-auth",
  "saga_id": "sg_8f3a",
  "mode": "checkpoint",
  "rendered_at": "2026-06-12T17:42:11Z",
  "repos": [
    { "name": "shared-types", "wave": 1, "status": "complete", "tasks": "7/7", "tokens": "85k/300k", "commits": 3 },
    { "name": "backend", "wave": 2, "status": "running", "tasks": "3/9", "tokens": "42k/300k", "commits": 1, "current": "src/auth/middleware.ts" },
    { "name": "api-gateway", "wave": 2, "status": "blocked", "tasks": "0/4", "tokens": "1k/300k", "inbox_count": 1 },
    { "name": "frontend", "wave": 3, "status": "queued", "waiting_on": "backend" }
  ],
  "inbox_count": 2,
  "recent_activity": [
    { "ts": "17:42", "repo": "shared-types", "msg": "contract@v2 published (a3f9...)" },
    { "ts": "17:38", "repo": "backend", "msg": "feat(auth): add token validation middleware" }
  ]
}
```

Conductor reads `board.json` + `inbox/INDEX.md` per turn — total ~3KB.
Drill-in (`/swarm show <repo>`) reads `details/<repo>.json` on demand.

### Strategy B — Git HEAD SHA invalidation

Manifest holds `repos[name].last_seen_sha`. Conductor turn:

1. `git rev-parse HEAD` per active-wave repo (no token cost — git operation)
2. If unchanged since last turn → use cached supervisor state
3. If changed → re-read that repo's details + history tail

Waves where work is steady (one repo edits, others wait) only refresh the
moving repo.

### Strategy C — Incremental session log + history tail

- Session log: track `last_read_offset` per conductor session. Read only NEW bytes. Typical delta: <500 bytes.
- `history.md`: never read full file. Read newest N entries via `tail`-equivalent. Old history stays on disk for audit but not in context.

### Strategy D — Supervisor context isolation

Each supervisor's context is its own. Conductor NEVER loads supervisor
context. Supervisor reads only:

- Its phase brief (one-time at spawn)
- Its repo's relevant code (via grep/Read, not bulk read)
- Its `history.md` tail
- Its contract artifact

Enforced by RULE: supervisors are spawned with cwd pinned to their repo.
Cannot cd elsewhere.

### Token budget projection

| Phase | Naive | Indexed | Ratio |
|---|---|---|---|
| Conductor turn (typical) | ~290KB | ~3KB | 99% saving |
| Conductor turn (drill-in) | ~290KB | ~15KB | 95% saving |
| Supervisor turn | ~50KB | ~10KB | 80% saving |
| **Full swarm (200 turns × 5 repos)** | **~60M tokens (~$50-100)** | **~3M tokens (~$2-5)** | **95% saving** |

## In Scope (v0.20.0)

1. **Swarm artifact tree** — `<eco>/swarms/<id>/manifest.json`, `board.json`, `contracts/`, `inbox/`, `signals/` (reserved), `tokens/` (reserved), `details/`, `changes/`
2. **Per-repo phase brief frontmatter extension** — adds `swarm:`, `wave:`, `initiative:`, `claimed_by_session:` fields; backward-compatible
3. **`/swarm` command surface** — `start` / `status` / `tell` / `broadcast` / `verify` / `complete` / `resume` / `cancel` / `budget`
4. **Modes** — `autopilot` + `checkpoint` (interactive deferred)
5. **Wave ordering engine** — reads `ecosystem.json` dependency edges; topologically sorts; assigns waves
6. **Conductor (Claude Code)** — foreground session; spawns supervisors via `claude --bg --cwd <repo>` background sessions
7. **Per-repo supervisor recipe** — single shared recipe at `core/swarm/supervise.md` that supervisors load; runs the standard `/start-phase` → implement → `/sync-docs` → `/complete-phase` loop
8. **Indexing harness** — board.json materializer + git SHA invalidation + incremental log reader + supervisor isolation discipline
9. **Inbox protocol** — supervisor writes `inbox/NNNN-<slug>.md`; conductor surfaces; user answers; supervisor reads on next planning turn
10. **Context push** — `/swarm tell <repo> "<text>"` appends to that supervisor's working brief; supervisor reads on next turn
11. **Broadcast** — `/swarm broadcast "<text>"` appends to every active supervisor's working brief
12. **Wave checkpoint** — between waves, conductor presents contract diff + per-repo retrospectives; asks "proceed?" with edit option
13. **Saga records** — `dispatch-run-<id>.json` per supervisor per wave; resumable from disk
14. **Contract verifier** — Pact-style shape check at wave boundary; mismatches block next wave
15. **Pre-merge preview** — `git merge --no-commit --no-ff` previews between sibling branches at fan-in; surfaces conflicts as approval cards
16. **`/validate` extension** — checks (a) swarm manifests reference real ecosystem members, (b) per-repo briefs' `swarm:` fields point at real swarms, (c) initiative `Per-repo contributions` matches swarm member set after completion
17. **New `[SWARM]` history entry type** — supervisors append to their repo's `history.md`; tagged with `Affects-specs: ../swarms/<id>/manifest.json`
18. **Session log integration** — `Active swarm: <id>` header in daily session log; conductor appends on wave boundaries, contract bumps, inbox resolutions
19. **Cross-repo changeset** — at swarm completion, writes `<eco>/changes/<id>.md` summarizing per-repo contributions + commit chain
20. **Portability schema hooks** — `owner` + `lease_expires_at` + `lease_renewed_at` + `claimed_by_session` fields present in manifest; `signals/` + `tokens/` directories present; semantics deferred to Phase 17.5
21. **`docs/swarm.md`** — top-level user-facing guide (modes, intervention patterns, portability sketch, troubleshooting)
22. **Three synthetic end-to-end scenarios** — 3-repo linear, 4-repo branched, 5-repo wide; reproducible under `tests/fixtures/swarm-ecosystems/`

## Out of Scope (deferred)

- **Codex swarm conductor** — `adapters/codex/agents/swarm-supervisor.toml` + MCP cwd shim. Deferred to a follow-up phase. The core/swarm/ library is platform-agnostic; only adapter wiring is deferred.
- **Antigravity swarm conductor** — Agent Manager workflow + swarm-supervisor/swarm-conductor skills. Deferred to a follow-up phase.
- **`interactive` mode** — every-task-approval. Defer to v0.20.x.
- **Discuss thread** — `/swarm discuss <repo>` sustained chat with one supervisor. Defer.
- **Manual takeover** — `/swarm pause <repo>` + `/swarm resume <repo>`. Defer.
- **Rewind** — `/swarm rewind <repo> --to <task>`. Defer.
- **Portability commands** — `/swarm focus`, `/swarm join`, `/swarm absorb`. Schema is ready; commands ship in Phase 17.5 v0.20.1.
- **Multi-conductor coordination** — multiple sessions co-owning a swarm. Phase 17.5.
- **Live-streaming `/swarm tail <repo>`** — defer until clear demand.
- **AST-aware semantic merge conflict detection** — text-based merge preview catches the majority. Defer.
- **Cross-stream coordination** — two swarms running on overlapping repos. Defer until real demand.
- **Cursor + Gemini CLI adapters (Phase 17 Reach goal)** — shifts to Phase 18.
- **Cerebrio-ecosystem bootstrap** — stays a post-release user activity. Phase 17 validates with synthetic fixtures only.
- **Site addition for `docs/swarm.md`** — deferred to a later docs-pass phase.

## Deliverables

| # | Deliverable | Verification |
|---|---|---|
| D1 | Swarm artifact schemas (manifest.json + board.json + contract.json + per-repo brief frontmatter) | `node --test tests/swarm-schemas.test.js` |
| D2 | Wave-ordering engine (topological sort from ecosystem.json) | `node --test tests/swarm-wave-ordering.test.js` |
| D3 | Indexing harness (board.json materializer + git SHA cache + incremental log) | `node --test tests/swarm-indexing.test.js` |
| D4 | `/swarm start` + `/swarm status` (Claude Code) | `node --test tests/swarm-start-claude-code.test.js` + manual smoke |
| D5 | Inbox protocol — supervisor writes, conductor surfaces, user resolves | `node --test tests/swarm-inbox.test.js` |
| D6 | Context push (`/swarm tell`) + broadcast (`/swarm broadcast`) | `node --test tests/swarm-intervention.test.js` |
| D7 | Wave checkpoint UI + contract verifier + pre-merge preview | `node --test tests/swarm-wave-transition.test.js` |
| D8 | `/swarm resume` from disk-only state (no in-memory state) | `node --test tests/swarm-resume.test.js` |
| D9 | Three end-to-end scenarios on synthetic ecosystem fixtures (3/4/5-repo) | `evidence/scenario-*.txt` + retrospective |
| D10 | Token-spend budget verified ≤ ~$5/scenario | retrospective evidence |
| D11 | No Claude Code regression | `node --test tests/claude-code-regression.test.js` |
| D12 | Full regression suite | `npm test` — ≥326 v0.19.0 baseline + new tests; zero pre-existing regressions |

## Acceptance Criteria

1. Every D1–D11 test passes locally; D9 has captured evidence in `evidence/`.
2. `npm test` shows ≥326 v0.19.0 baseline + new tests; zero pre-existing regressions.
3. Three synthetic end-to-end scenarios complete on different ecosystem shapes (3-repo linear, 4-repo branched, 5-repo wide).
4. Token spend per scenario ≤ ~$10 (target ~$5; D10). Conductor-turn cost ≤ 5KB tokens 95% of turns.
5. `retrospective.md` contains Rule 12 Verification Evidence for all three scenarios.
6. Per-repo phase discipline preserved: a swarm-member phase passes the same `/validate` + `/complete-phase` checks as a solo phase.
7. Portability schema hooks present and documented; Phase 17.5 v0.20.1 needs no schema migration to light up commands.
8. No regression in Claude Code adapter from v0.19.0 baseline.

## Reference Documents

Research conducted 2026-06-12 (7-agent workflow):

- Anthropic — Building multi-agent research system <https://www.anthropic.com/engineering/multi-agent-research-system>
- Anthropic — When to use multi-agent systems <https://claude.com/blog/building-multi-agent-systems-when-and-how-to-use-them>
- Long-running agents (Addy Osmani) <https://addyo.substack.com/p/long-running-agents>
- AWS Labs CLI Agent Orchestrator (CAO) <https://github.com/awslabs/cli-agent-orchestrator>
- Cursor 3 changelog — multi-agent + worktrees <https://cursor.com/changelog/04-24-26>
- Devin 2 — parallel cloud VMs <https://cognition.ai/blog/devin-2>
- Cline multi-root workspace <https://docs.cline.bot/features/multiroot-workspace>
- CrewAI hierarchical process <https://docs.crewai.com/how-to/hierarchical-process>
- Pact (contract testing) <https://docs.pact.io/>
- Saga pattern <https://microservices.io/patterns/data/saga.html>
