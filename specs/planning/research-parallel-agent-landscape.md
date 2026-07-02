# Research — Parallel AI-Agent Development Landscape (2026-07-02)

> **Follow-up:** direction adopted same day — see
> `platform-parallel-lanes.md` (Parallel Lanes platform arc).

> Supporting research for **ENH-046** (concurrent workstreams in one repo).
> Trigger: operator's recurring pain — multiple features + multiple branches in
> one momentum project, no branching strategy momentum understands, and slow
> per-worktree agent startup. Operator supplied the treehouse link; the rest is
> a landscape sweep. Relates: TD-008 closure record
> (`unscheduled-parallel-streams.md`), Phase 23 "dependency-aware tasks".

## The market stratified into five layers (Q1–Q2 2026)

### Layer 1 — Git-state isolation (SOLVED, commoditized — do not build)
- **Claude Code native worktrees** (Apr 2026): `isolation: worktree` on
  subagents, `--worktree`, worktrees under `.claude/worktrees/` (we already
  gitignore these — ENH-043).
- CLIs: [worktrunk](https://github.com/max-sixty/worktrunk) (worktrees as easy
  as branches), [agent-worktree](https://github.com/nekocode/agent-worktree).
- **Alternative model**: [GitButler](https://github.com/gitbutlerapp/gitbutler)
  **virtual branches** — N branches applied to ONE working dir as lanes, drag
  hunks between lanes; Agents Tab pins each Claude session to a virtual branch.
  $17M a16z Series A (Apr 2026). No worktrees at all — a genuinely different
  answer to the same problem.

### Layer 2 — Workspace speed / environment reuse (SOLVED — recommend, don't build)
- **[treehouse](https://github.com/kunchenguid/treehouse)** (operator-supplied;
  Go, 636★, v2.0.0 Jun 2026): **worktree POOL manager** — reusable worktrees
  under `~/.treehouse/` keep node_modules/build caches warm across agent
  sessions; lease-based in-use detection; dirty detection; detached-HEAD reset
  to default branch on checkout; lifecycle hooks; no daemon. Directly attacks
  "agents are slow because every fresh worktree cold-starts deps."
- Relevance verdict: **complementary infrastructure, not overlap.** momentum =
  coordination layer; treehouse = workspace supply. Detached-HEAD pool model is
  compatible with momentum's branch conventions (agent creates
  `phase-N-*`/`fix/*` branch inside the leased worktree).

### Layer 3 — Session orchestration UIs (CROWDED — do not compete)
Conductor (Melty), Crystal (MIT), Claude Squad (tmux), Vibe Kanban
(card=worktree=agent; community-maintained after Bloop shutdown Apr 2026),
Nimbalyst, dux, Superset, Cursor 3 Agents Window, Windsurf Wave 13.
Comparison: <https://nimbalyst.com/blog/best-git-worktree-tools-ai-coding-2026/>

### Layer 4 — Integration / merge discipline (CONVENTIONS — momentum gap)
- Consensus best practice: **sequential merge — one branch at a time, test,
  then rebase remaining branches onto updated main.** Never simultaneous.
- Stacked PRs (Graphite; GitButler stacked branches) for dependent work.
- **Clash** (OSS): predicts conflicts between parallel worktrees before agents
  collide — the failure mode AFTER file isolation is semantic conflict.
- Known hotspot-file problem (routes/configs/registries). **momentum's own
  tracking files (status.md / backlog.md / changelog) are exactly such
  hotspots** — the towncrier/reno per-branch-fragment pattern is the standard
  cure (candidate design for ENH-046, decide in FORGE/brainstorm).

### Layer 5 — Coordination / planning plane (MOMENTUM'S LAYER — validated; one big competitor)
- **arXiv 2603.21489 "Effective Strategies for Asynchronous Software
  Engineering Agents"**: coordination artifacts — *"shared understanding
  through tracked documents"* — are the critical success factor for async
  agents. Failure modes: unmanaged merge conflicts, missing context about
  other agents' work, inadequate task isolation. Success factors: explicit
  decomposition with minimal interdependencies, intermediate validation
  checkpoints, maintained shared progress/dependency state. **This is
  momentum's exact thesis** (specs + tasks.md + Rule 12 + status.md) — the
  paper's implication is the spec layer must support parallel lanes, which is
  ENH-046.
- **Beads + Gastown** (Steve Yegge; beads ~24K★, gastown 15.9K★, v1.2.1 Jun
  2026, Kilo hosted GA May 2026): git-backed SQLite/JSONL issue tracker as
  agent data/control plane; 20–30-agent scale; "not a casual adoption."
  The heavyweight in momentum's lane. momentum differentiation: markdown-native
  human-readable specs, lightest-fit ceremony (Rule 14), zero-dep, rides inside
  existing IDE agents rather than replacing the workflow.
- **Kiro** (AWS): dependency-aware parallel task execution WITHIN one spec —
  independent tasks run concurrently in waves, isolated context per task
  (<https://kiro.dev/blog/faster-smarter-specs/>). That is *intra-feature*
  parallelism — momentum's Phase 23 "dependency-aware tasks" is the analog.
  GitHub spec-kit: no framework-level parallel support found.

## Implications for ENH-046 (scope refinement)

1. **Confirmed: build the coordination layer only.** Layers 1–3 are
   commoditized; TD-008's won't-do on a streams CLI stands, now with market
   evidence, not just closure rationale.
2. **Add integration discipline to the slice** (was missing from the original
   verdict): Rule 6 extension — sequential merge order for concurrent
   workstreams; one-at-a-time merge + rebase-the-rest; merge-order guidance
   when phases are dependent (stacked). This is the "branching strategy" half
   of the operator's pain.
3. **Tracking-file hotspot fix has a named pattern**: per-branch changelog/
   backlog fragments compiled on merge (towncrier-style) IF the dogfood trial
   shows contention — still threshold-gated, don't pre-build.
4. **Speed pain is out of momentum's scope**: document treehouse (worktree
   pools) + native worktrees + GitButler as the recommended isolation/speed
   substrate in the "working on multiple things at once" docs page. momentum
   stays tool-neutral — recommend, never wrap.
5. **Intra-phase parallelism** (Kiro-wave-style parallel tasks) is a separate,
   later bet — already on the roadmap as Phase 23 "dependency-aware tasks";
   don't conflate with ENH-046.

## Sources

- <https://github.com/kunchenguid/treehouse>
- <https://arxiv.org/pdf/2603.21489>
- <https://nimbalyst.com/blog/best-git-worktree-tools-ai-coding-2026/>
- <https://github.com/max-sixty/worktrunk> / <https://worktrunk.dev/>
- <https://github.com/gitbutlerapp/gitbutler> /
  <https://docs.gitbutler.com/features/branch-management/virtual-branches>
- <https://github.com/gastownhall/gastown> /
  <https://gastownhall.github.io/beads/>
- <https://kiro.dev/blog/faster-smarter-specs/>
- <https://github.com/github/spec-kit>
- <https://www.graphite.com/guides/ai-code-merge-conflict-resolution>
- <https://laurentkempe.com/2026/03/31/from-3-worktrees-to-n-ai-powered-parallel-development-on-windows/>
- <https://www.patrickdap.com/post/how-to-run-multiple-agents/>
- <https://www.theregister.com/devops/2026/05/15/git-is-unprepared-for-the-ai-coding-tsunami/5241480>
