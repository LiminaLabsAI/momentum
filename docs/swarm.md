# Swarm — Single-Session Multi-Project Feature Delivery

> Phase 17 / v0.20.0 — Claude Code only. Codex + Antigravity parity is Phase 18.

A **swarm** is a declared cross-repo work unit driven from ONE user session. Your session becomes the **conductor**. The conductor spawns one **supervisor** subagent per impacted repo, each pinned to that repo's working directory with its own fresh context. Each supervisor runs momentum's normal `/start-phase` → implement → `/sync-docs` → `/complete-phase` loop INSIDE its repo.

The conductor coordinates **waves** (computed from `ecosystem.json` dependency edges), surfaces inbox decisions, broadcasts cross-cutting concerns, and synthesizes per-repo retrospectives at fan-in.

Agents are stateless across turns; **state lives in files**. A swarm survives session boundaries the same way a phase does — every state-changing action writes to disk; `/swarm resume` reconstitutes from disk.

## When to use

- A feature spans **two or more momentum-installed repos** AND has dependency ordering (e.g. frontend depends on backend depends on shared-types).
- You want ONE session driving the whole feature, not three serial sessions.
- An initiative exists or is about to exist at `<eco>/initiatives/<slug>.md`.

## When NOT to use

| You want… | Use this instead |
|---|---|
| Cross-repo read-only audit | `/dispatch` |
| Single-repo phase | `/start-phase` directly |
| Context transfer to another session | `/handoff` |

## Modes

| Mode | Behavior | When to pick |
|---|---|---|
| `checkpoint` (default) | Plan approval + wave-boundary approval; inbox surfaces during waves | First runs, multi-team coordination, anything with significant risk |
| `autopilot` | Plan approval only; auto-advance through all waves; inbox auto-halts the supervisor that raised it | Trusted runs, internal refactors, contract-stable changes |
| `interactive` | Every supervisor task surfaces for approval before execution | **Deferred to v0.20.x** (UI complexity) |

Mode is set per-swarm at `/swarm start` and stored in the manifest.

## Eight intervention patterns

v0.20.0 ships 5 of 8. The remaining 3 are scoped for v0.20.x.

| Pattern | Shipped | How |
|---|---|---|
| 1. Pre-flight plan approval | ✓ v0.20.0 | `/swarm start` renders plan; you approve before spawn |
| 2. Wave checkpoint | ✓ v0.20.0 | Between waves in `checkpoint` mode |
| 3. Mid-flight question (inbox) | ✓ v0.20.0 | Supervisor writes `inbox/NNNN-<slug>.md`; conductor surfaces |
| 4. Context push (`/swarm tell`) | ✓ v0.20.0 | Appends to one supervisor's `swarm-context.md` |
| 5. Broadcast | ✓ v0.20.0 | Appends to every supervisor's `swarm-context.md` |
| 6. Discuss thread | v0.20.x | Sustained sub-chat with one supervisor |
| 7. Manual takeover (pause/resume) | v0.20.x | Pause one supervisor without halting the swarm |
| 8. Rewind | v0.20.x | Revert one supervisor to a known-good state |

## Architecture

```
<ecosystem-root>/
  ecosystem.json
  initiatives/
    NNNN-<initiative>.md
  swarms/                             ← Phase 17+
    NNNN-<swarm>/
      manifest.json                   ← saga state (per-repo + waves + audit)
      board.json                      ← materialized 3KB snapshot (Strategy A)
      contracts/<surface>.contract.json
      inbox/
        INDEX.md
        NNNN-<slug>.md                ← pending questions
        resolved/                     ← archived answers
      signals/                        ← reserved (Phase 17.5)
      tokens/                         ← reserved (Phase 17.5)
      details/                        ← per-repo drill-in cache
      .offsets.json                   ← incremental log offsets (Strategy C)
  changes/
    NNNN-<swarm>.md                   ← cross-repo changeset at completion

<repo>/
  specs/phases/<phase-slug>/
    overview.md                       ← OPTIONAL swarm frontmatter (G0)
    swarm-context.md                  ← conductor → supervisor context push
  .momentum/runs/
    dispatch-run-NNN.json             ← supervisor saga step (G1)
```

### Indexing — the load-bearing efficiency design

Without indexing, a 200-turn × 5-repo swarm would consume ~60M tokens ($50–100). With four layered strategies, that drops to ~3M tokens (~$2–5):

- **Strategy A — materialized board cache.** Conductor reads ONLY `board.json` (~3KB) per turn. Regenerated on every manifest write.
- **Strategy B — git HEAD SHA invalidation.** Per-repo `last_seen_sha` in manifest; cheap `git rev-parse HEAD` revalidates. Unchanged repos use cached state.
- **Strategy C — incremental session log + history tail.** Track byte offsets; read only NEW bytes. Never re-read full `history.md` — `tail`-style window only.
- **Strategy D — supervisor context isolation.** Conductor NEVER loads supervisor context; supervisor NEVER reaches into other repos. Enforced by cwd-pinning.

## Subcommands

### `/swarm start <slug> --initiative <slug> --repos r1,r2,... --phase <phase-slug> [--mode checkpoint|autopilot]`

Plan + spawn Wave 1. Both `/swarm` slash form and `momentum swarm start` CLI form produce the same on-disk artifacts.

```bash
momentum swarm start user-auth --initiative user-auth --repos shared-types,backend,frontend --phase phase-3-user-auth
```

Default is dry-run (prints the spawn directives). Pass `--spawn` to actually launch `claude --bg` background sessions per Wave 1 repo.

### `/swarm status <swarm-id>`

Render the materialized board cache (~3KB). Pass `--json` for machine-readable.

### `/swarm tell <swarm-id> <repo> "<text>"`

Append a note to one supervisor's `swarm-context.md`. Use for repo-specific clarifications.

### `/swarm broadcast <swarm-id> "<text>"`

Append a note to every supervisor's `swarm-context.md`. Use for swarm-wide constraints.

### `/swarm inbox list <swarm-id>` / `write` / `resolve`

Inbox protocol. Supervisor writes when blocked; conductor surfaces; you answer.

### `/swarm verify <swarm-id>`

Contract verifier + initiative back-reference + brief frontmatter check. Returns exit code 0 = OK, non-zero = issues to resolve.

### `/swarm preview-merge <swarm-id>`

Run `git merge --no-commit --no-ff` for every supervisor branch against `main`; surface conflicts as inbox items. Always aborts — no actual merge.

### `/swarm budget <swarm-id> <repo> +N | -N`

Extend or contract a supervisor's token budget. Default is 300k per supervisor.

### `/swarm complete <swarm-id>`

Synthesize per-repo retrospectives into the initiative's `Per-repo contributions` section; write cross-repo changeset to `<eco>/changes/<id>.md`.

### `/swarm resume <swarm-id> [--session <id>]`

Reattach a session to an existing swarm. Disk-only reconstitution — no in-memory state required.

### `/swarm cancel <swarm-id> [--reason "<text>"]`

Graceful halt. Halts every supervisor; preserves all artifacts (branches NOT force-pushed or deleted) for forensics.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `cannot locate ecosystem root` | You're outside an ecosystem | Pass `--ecosystem <path>` or `cd` into one |
| `claude --bg not on PATH` | Claude Code binary missing or older | Update Claude Code; or use dry-run + manual spawn |
| Cycle detected at `swarm start` | `ecosystem.json` has a dependency cycle in your impacted set | Fix `ecosystem.json`; or split the cycle into two swarms |
| Pre-merge surfaced conflicts | Two waves changed overlapping code | Resolve manually before the real merge; rerun verify |
| Inbox item never closed | Supervisor halted waiting | `/swarm inbox resolve <id> --answer "..."` |

## Future: Swarm Portability (Phase 17.5)

v0.20.0 bakes in the schema hooks for forward-compatible portability. v0.20.1 (Phase 17.5) will light up three commands:

| Command | Scenario |
|---|---|
| `/swarm focus <repo>` | Split a running swarm into a focused side-session — one supervisor moves to a new conductor; the rest stay with the original |
| `/swarm join <swarm-id>` | Join an independent session to an existing swarm as a co-conductor |
| `/swarm absorb <other-id>` | Converge multiple swarms back into one — `/swarm verify` checks contract compatibility before allowing the merge |

The schema hooks already present in v0.20.0 (no migration needed):

- `repos[name].owner` — session UUID currently authoritative for this repo (defaults to current session)
- `repos[name].lease_expires_at` — when the current owner's lease expires (24h default)
- `repos[name].lease_renewed_at` — last conductor turn that refreshed the lease
- `repos[name].claimed_by_session` — mirrors brief frontmatter `claimed_by_session:`
- top-level `sessions[]` — registry of every conductor that has touched this swarm
- `signals/` directory — reserved for cross-session signals
- `tokens/` directory — reserved for opaque join/focus/absorb tokens

v0.20.0 always sets `owner = current session`; never enforces lease semantics. v0.20.1 turns enforcement on.

## Tracking contract

- **Auto every time:** `manifest.json` writes via the conductor library; `board.json` regenerated on each write; per-supervisor `dispatch-run-NNN.json` saga records.
- **Auto only when meaningful:** `[SWARM]` entry in each supervisor's repo `history.md` after wave completion; `[NOTE]` in the originating session log on wave transitions.
- **Never:** silent overwrites of supervisor branches. Cancel preserves; resume reconstitutes.

## Examples

### Three-repo linear feature

```bash
# Plan + spawn Wave 1 (shared-types)
momentum swarm start payments \
  --initiative payments \
  --repos shared-types,backend,frontend \
  --phase phase-7-payments \
  --mode checkpoint \
  --spawn

# After Wave 1 supervisor reports done:
momentum swarm status 0001-payments
# (checkpoint pauses here; user approves Wave 2)

# At completion:
momentum swarm verify 0001-payments
momentum swarm preview-merge 0001-payments
momentum swarm complete 0001-payments
```

### Recovering after a kill

```bash
# Session 1 killed mid-Wave 2; session 2 reattaches:
momentum swarm resume 0001-payments --session sess_new
# Conductor reads manifest + board + offsets from disk; continues the poll loop.
```
