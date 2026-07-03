---
id: "0002"
title: "Lane state at the shared git dir + Rule-14-graded landing gates"
status: accepted
date: 2026-07-03
---

# ADR-0002: Lane State at the Shared Git Dir + Graded Landing Gates

## Status

`accepted` — 2026-07-03 (Phase 21b G0). Builds on ADR-0001.

## Context

ADR-0001 shipped conventions; the 21a trial proved them but surfaced the
mechanism gaps: sub-lane binding leaned on status.md table parsing, the
shared table was the one contention hotspot, fresh worktrees had no
preflight, and landing order lived only in prose. FEAT-026/027 + ENH-047
(operator-committed 2026-07-02) call for a registry, an ambient board,
signals, and a merge queue with graded gates — files only, no daemon, no
new dependencies (platform decisions 4–7).

## Decision

### 1. Anchor: `git rev-parse --git-common-dir` → `<common>/momentum/lanes/`

Lane state lives ONCE per repo inside the shared git directory —
untracked by construction (git never tracks `.git` contents), reachable
from every worktree, gone with the repo. Layout (stateVersion 1,
**internal** — publishing it as a contract is the arc's one-way door,
decided at 21c close):

```
<git-common-dir>/momentum/lanes/
├── registry.json              # { stateVersion, lanes: [<id>...] }
└── <id>/
    ├── manifest.json          # see shape below
    └── inbox/                 # signals; processed/ subdir after ack
```

Manifest: `{ stateVersion, id, branch, planNode: {type: phase|adhoc|
unbound, ref}, worktree, grade: phase|quick-task|spike, touches: [],
status: open|done|landed|closed, opened, doneAt, landedAt, note }`.

Lane id = branch name sanitized (`[^A-Za-z0-9._-]` → `-`). One lane per
branch. Writes go through the mkdir-lock chokepoint (swarm-proven);
reads are lock-free.

### 2. Binding is explicit data, not table parsing

`lanes open` records the plan node (inferred from the branch per the
Rule 15 convention — `phase-*` ↔ phase dir, `fix/*|chore/*|feat/*` →
ad-hoc, else unbound — overridable). The 21a status.md fallback remains
for sessions outside any registered lane; registered lanes never parse
tables.

### 3. Board and queue are computed, ambient, and honest about pressure

`momentum lanes` renders from manifests (any session, any worktree, no
daemon). It ALWAYS shows queue pressure: count of done-but-unlanded
lanes + oldest wait (platform decision 4 — WIP unbounded, back-pressure
visible, never a gate).

### 4. Landing: FIFO turn + freshness + Rule-14-graded evidence

`lanes land <id>` validates, `--execute` merges (`--no-ff`) into
`--into` (default: current branch):

- **Turn**: FIFO by `doneAt` among `done` lanes. Out-of-turn requires
  `--force` (loud, recorded in the manifest note).
- **Freshness**: the integration ref must be an ancestor of the lane
  branch (i.e. the lane already rebased/merged it) — "suite green on
  updated main" is only meaningful on a fresh lane.
- **Graded gates** (Rule 14 work types → evidence depth, FEAT-019
  lineage): `spike` → none; `quick-task` → `specs/adhoc/<ref>/record.md`
  exists; `phase` → `specs/phases/<ref>/retrospective.md` contains a
  non-empty `## Verification Evidence` section.
- Landing writes an advisory `rebase` message to every remaining open
  lane's inbox (automation of the rebase itself is out of scope — v1 is
  advisory, per the open question in the platform doc).
- Pushing the integration branch stays gated by the Phase-19 pre-push
  hooks + operator approval; `lanes land` never pushes.

### 5. Overlap warnings are advisory intent-matching (ENH-047)

`--touches` globs declared at open; open/board/land warn on
intersection between active lanes (prefix/glob match, no file watching).
Never blocking.

### 6. Substrate by detection

Default: `git worktree add ../<repo>.lanes/<id>` (outside the repo — no
gitignore coupling, works for every adapter). `--no-worktree` and
`--path` opt out. treehouse on PATH → printed hint only; GitButler
documented only. Preflight prints warnings for the fresh-worktree traps
21a hit (committed non-755 `*.sh`, node below `engines.node`) — never
blocks.

## Alternatives Considered

| Option | Pros | Cons |
|---|---|---|
| **Anchor in git-common-dir (chosen)** | Untracked by construction; shared across worktrees; no gitignore edits; dies with the repo | Invisible to `ls` at repo root (mitigated: board command) |
| `.momentum/lanes/` in the worktree | Visible; consistent with sentinels | Per-worktree copy — N worktrees would need sync; tracked/ignored ambiguity |
| Registry rows in status.md | Zero new machinery | Exactly the contention + parsing the trial flagged; agents rewrite tables |
| Daemon/watcher for board+signals | Live updates | Platform decision 3/5 forbids daemons; files+polling proved sufficient in swarm |
| Hard WIP cap on lanes | Simple back-pressure | Platform decision 4: WIP unbounded, pressure surfaced instead |

## Consequences

- Easier: any session answers "what's running?"; landings get mechanical
  turn/freshness/evidence checks; 21c's wave planner gets a stable lane
  substrate to schedule onto; swarm patterns are reused, not re-invented.
- Harder/risks: state format is internal but will attract external
  readers — mitigated by `stateVersion` and the explicit 21c publication
  decision. Manifest staleness (a lane abandoned without `close`) shows
  as ever-growing age on the board — acceptable; `close` is cheap.
