# Swarm — Single-Session Multi-Project Feature Delivery

> Phase 17 / v0.20.0 — Claude Code only. Phase 17.5 / v0.20.2 — multi-session portability. **Phase 18 / v0.20.4 — Codex + Antigravity adapter parity.**

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

## Multi-adapter swarm (Phase 18 / v0.20.4)

v0.20.4 brings the full 13-subcommand swarm surface to Codex and Antigravity. The conductor + supervisor architecture is unchanged; only adapter dispatch is platform-specific.

### Adapter contract

Every adapter exports `spawn(directive)` (added in Phase 18 G0). The conductor builds platform-agnostic directives via `core/swarm/conductor.js::buildSpawnDirectives`; the CLI floor (`momentum swarm start --spawn`) routes each directive to its platform's adapter:

```
buildSpawnDirectives({ platform })       (core/swarm/conductor.js)
       ↓
spawnSupervisors(directives)             (bin/swarm.js)
       ↓
adapter.spawn(directive)                 (adapters/<platform>/adapter.js)
       ↓
{ repoId, status, detail }                (canonical per-repo result)
```

`status: -1` is the canonical "could not launch" signal — yielded both by adapter stubs and by missing-binary cases. The conductor stays robust to per-repo dispatch failures; one supervisor failing to launch never aborts the wave.

### Per-adapter dispatch

| Adapter | Spawn command | Supervisor declaration | Recipe surface |
|---|---|---|---|
| **Claude Code** | `claude --bg --cwd <repoPath>` | n/a (the spawned session becomes the supervisor) | `.claude/commands/swarm.md` |
| **Codex** | `codex --cwd <repoPath> --agent swarm-supervisor` | `.codex/agents/swarm-supervisor.toml` (TOML subagent) | `.agents/skills/swarm/SKILL.md` (recipe → skill transform) |
| **Antigravity** | `agy --cwd <repoPath> --skill swarm-supervisor` | `.agents/skills/swarm-supervisor/SKILL.md` (skill the agent BECOMES) | `.agent/workflows/swarm.md` (auto-registers as `/swarm`) |

### Codex MCP cwd shim

Codex's supervisor cwd is honored at process boundary via `--cwd`. Inside the supervisor session, momentum relies on Codex's MCP filesystem server to keep file operations scoped to that cwd. The user wires this in `~/.codex/config.toml`:

```toml
[mcp_servers.filesystem]
command = "npx"
args    = ["-y", "@modelcontextprotocol/server-filesystem", "${PWD}"]
```

See AGENTS.md's `## MCP cwd shim — Codex configuration` for the full setup recipe and the fallback path (manual cwd pin per terminal) if the doc-only shim doesn't hold on a given Codex version.

### Capability flags — v0.20.4 outcome

Phase 18 G4 captured live evidence; **neither capability flip lands in v0.20.4**:

- **Codex `parallelSubagents`**: stays `false`. `codex features list` at codex-cli 0.133.0 shows `enable_fanout: under development: false` — parallel fan-out is not yet a stable Codex feature.
- **Antigravity `sessionStartHook`**: stays `false`. No standalone `agy` CLI exists — Antigravity ships as an IDE-only product, so live event-firing cannot be confirmed via CLI. Operator-manual validation inside the IDE is the closure path.

Full evidence at `specs/phases/phase-18-swarm-parity/evidence/val-001-codex.txt` + `val-002-antigravity.txt`.

## Multi-session portability (Phase 17.5 / v0.20.2)

A swarm can be co-conducted by multiple sessions. v0.20.2 lights up five new subcommands on top of the schema hooks shipped in v0.20.0:

| Command | Use it when |
|---|---|
| `/swarm claim <swarm-id> <repo>` | You want to take ownership of `<repo>` — either because nobody owns it yet or the current owner's lease has expired. |
| `/swarm release <swarm-id> <repo>` | You no longer need `<repo>` — flips owner back to `_unclaimed` so another session can claim. |
| `/swarm focus <swarm-id> <repo>` | One repo needs sustained one-on-one attention. Issues a single-use token; you hand the token to a second session via `claude --bg`. |
| `/swarm join <swarm-id> [--token \| --claim]` | Attach the current session to an existing swarm. With `--token`, consume a focus or join token and auto-claim. With `--claim <repo>`, do an explicit claim. |
| `/swarm absorb <target-id> <source-id>` | Converge two parallel swarms back into one. Aborts cleanly on contract content_hash divergence; both swarms left untouched. |

### Lease enforcement is on

Every conductor write that targets `repos[<repo>]` flows through `core/swarm/lib/manifest.js::updateManifestAsOwner`. Writes are accepted when:
- the caller is the current `owner`, OR
- the current `owner` is the `_unclaimed` or `_focusing` sentinel, OR
- the current `owner`'s `lease_expires_at` is in the past (takeover; both `claim` and `lease-takeover` events appear in audit).

Writes are rejected (with `err.code = 'EOWNERSHIP'`) when another session holds a valid lease. The CLI exits 1 and writes a `claim-request` signal for the existing owner to see next poll.

Solo (single-session) swarms are unaffected — there's always exactly one owner per repo, and the owner is always the writer.

### Signal protocol

The `signals/` directory ships typed cross-session messages — one JSON file per signal at `<eco>/swarms/<id>/signals/NNNN-<type>-<slug>.json`. Conductor polls the directory each turn, branches on type, surfaces in the chat, and archives processed items to `signals/processed/`.

| Signal type | Issued by | Read by |
|---|---|---|
| `focus-request` | `/swarm focus` (carries the token) | Receiving session — `join --token` consumes |
| `claim-request` | `/swarm claim` when lease was valid | The current owner — surfaces a request next poll |
| `absorb-proposed` | `/swarm absorb` (pre-commit) | The other conductor — sees the proposal before merge |
| `lease-expired` | `updateManifestAsOwner` on takeover | All sessions — audit trail of lease churn |

Writes are mkdir-locked using the same pattern as the inbox protocol. Concurrent writes are race-safe up to the filesystem's mkdir atomicity guarantee.

### Transfer tokens

Opaque 16-hex strings at `<eco>/swarms/<id>/tokens/<token>.json`. Single-use: `consumeToken` deletes on read. 1-hour default expiry (override with `--expires-min` on `focus`). Two kinds:

- `focus` — carries `target_repo`; `join --token` auto-claims that repo
- `join` — registration-only; `join --token` registers without claiming

Tokens are not secrets in the cryptographic sense — they're single-attempt short-lived strings on the local filesystem, used to avoid embedding session UUIDs in spawn directives the user copy-pastes.

### Worked example — focus split + reunion

```bash
# sess-A starts swarm with 3 repos
momentum swarm start payments \
  --initiative payments \
  --repos shared-types,backend,frontend \
  --phase phase-7-payments

# sess-A focuses backend — prints a `claude --bg` directive
momentum swarm focus 0001-payments backend
# ▸ focus 0001-payments/backend — token issued
#   Token:      a1b2c3d4e5f60718
#   Spawn directive: claude --bg --cwd /path/to/eco
#   Then: momentum swarm join 0001-payments --token a1b2c3d4e5f60718

# In a second terminal — sess-B runs the join (taking only backend):
momentum swarm join 0001-payments --token a1b2c3d4e5f60718
# ▸ join 0001-payments as session sess_xyz
#   Token consumed: kind=focus target=backend
#   Claimed: backend → sess_xyz (lease until 2026-06-15T17:30:00Z)

# Both sessions drive their owned repos forward. Lease enforcement blocks
# sess-A from writing to backend.

# When sess-B is done it can release backend:
momentum swarm release 0001-payments backend
# ▸ release 0001-payments/backend → unclaimed

# sess-A picks it back up:
momentum swarm claim 0001-payments backend
# ▸ claim 0001-payments/backend → sess-A (lease until ...)
```

### Worked example — absorb with contract verify

```bash
# Two parallel swarms running in the same ecosystem.
# Both touch `auth-api` surface but with different content_hash.

momentum swarm absorb 0001-payments 0002-billing
# (without --yes — prints the dry-run plan and contract diff)
# ▸ absorb plan: 0002-billing → 0001-payments
#   Repos to add:   billing-api
#   Repos overlap:  shared-types
#   Contracts diff: 1 conflict(s)
#     ✗ auth-api — content-hash-divergence
# Aborting — resolve contract conflicts first

# Bump the contract version + reconcile the producer hash on both sides.
# Then retry:
momentum swarm absorb 0001-payments 0002-billing --yes
# ▸ absorbed 0002-billing → 0001-payments
#   Repos added:    billing-api
#   Repos overlap:  shared-types
#   Inbox moved:    2
#   Archived to:    swarms/.absorbed/0002-billing
```

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
