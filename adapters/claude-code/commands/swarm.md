Swarm — sustained parallel multi-project feature delivery (Phase 17, v0.20.0).

A **swarm** is a declared cross-repo work unit driven from ONE user session. The user's session becomes the **conductor**. The conductor spawns one **supervisor** subagent per impacted repo, each pinned to that repo's working directory with its own fresh context. Each supervisor runs momentum's normal `/start-phase` → implement → `/sync-docs` → `/complete-phase` loop INSIDE its repo. The conductor coordinates waves (computed from `ecosystem.json` dependency edges), surfaces inbox decisions, broadcasts cross-cutting concerns, and synthesizes per-repo retrospectives at fan-in.

> v0.20.0 ships Claude Code only. Codex + Antigravity parity is Phase 18.

## Architecture

| Layer | Owns | Reads |
|---|---|---|
| Conductor (this user session) | `<eco>/swarms/<id>/manifest.json` + `board.json` + `contracts/` + `inbox/` + `signals/` + `changes/` | Per-supervisor `dispatch-run-<id>.json` (status) |
| Supervisor (per repo, background) | `<repo>/specs/phases/phase-N-<slug>/*` + `<repo>/.momentum/runs/dispatch-run-<id>.json` | Its phase brief + contract + history.md tail |

Agents are stateless across turns; **state lives in files**. A swarm survives session boundaries the same way a phase does — every state-changing action writes to disk; `/swarm resume` reconstitutes from disk.

## When to use

- A feature spans **two or more momentum-installed repos** AND has dependency ordering (frontend depends on backend depends on shared-types).
- The user wants ONE session driving the whole feature, not three serial sessions.
- An initiative exists or is about to exist at `<eco>/initiatives/<slug>.md`.

Do NOT use `/swarm` for:
- Read-only cross-repo audits — use `/dispatch`.
- Single-repo phases — use `/start-phase` directly.
- Pure context transfer — use `/handoff`.

## Subcommands

The slash command form mirrors the CLI: `/swarm <sub> [args]`. The CLI floor is `momentum swarm <sub> [args]` — pick whichever door fits the moment. Both produce the same on-disk artifacts.

---

### `/swarm start <slug> --initiative <slug> --repos r1,r2,... --phase <phase-slug> [--mode checkpoint|autopilot]`

Plan + spawn Wave 1.

**Step 1 — Present the plan and ask for approval.**

Compute the wave plan in-process (no spawn yet) by calling the CLI floor in dry-run:

```bash
momentum swarm start <slug> --initiative <slug> --repos r1,r2,... --phase <phase-slug> --mode <mode> --json
```

Read the JSON. Render the wave plan to the user:

```
▸ Swarm <NNNN-slug> — planned (not yet spawning)
  Initiative: <slug>
  Mode: <mode>
  Waves:
    Wave 1: <r1>, <r2>
    Wave 2: <r3>
    Wave 3: <r4>
  Token budget: 300k per supervisor (override with /swarm budget)
  Lease: 24h per repo, renewed each turn

Proceed?
```

WAIT for user approval. If `mode = autopilot`, plan approval is the only checkpoint until completion. If `mode = checkpoint`, you'll also pause between waves.

**Step 2 — Spawn Wave 1 supervisors (foreground synthesis, background sessions).**

After approval, spawn one Claude Code background session per Wave 1 repo. The CLI does this when invoked with `--spawn`:

```bash
momentum swarm start <slug> --initiative <slug> --repos ... --phase <phase-slug> --mode <mode> --spawn
```

If `claude --bg` is not available in this env, the CLI surfaces the spawn directives and exits — degrade by reporting the directives to the user (they can launch sessions manually) and continue with conductor polling on the existing manifest.

**Step 3 — Begin the conductor poll loop.**

See `/swarm status` (next subcommand). On every conductor turn:

1. Read `<eco>/swarms/<id>/board.json` (≈3KB).
2. Read `<eco>/swarms/<id>/inbox/INDEX.md`.
3. If `inbox_count > 0`, surface each pending item; resolve interactively.
4. If a supervisor reports `done: true` for the active wave's last repo, run the wave checkpoint flow (see `/swarm verify` — Phase 17 G2).

---

### `/swarm status <swarm-id>`

Render the materialized board cache. Read-only — no manifest mutation. Strategy A from the indexing design: conductor reads ONLY `board.json` (~3KB).

```bash
momentum swarm status <swarm-id>
```

Default output is a rendered ANSI table. Pass `--json` for machine-readable.

Surface:
- Per-repo: wave, status, tasks N/M, tokens used/budget, commits, current task.
- `inbox_count` warning at the bottom if > 0.
- Recent activity tail (last 10 audit events).

When inboxes are pending, prompt: "Run `/swarm verify <id>` to surface the questions, or `/swarm tell <id> <repo> '...'` to push context to a specific supervisor."

---

### `/swarm cancel <swarm-id> [--reason "<text>"]`

Graceful halt. Halts every supervisor, marks the swarm `cancelled` in the manifest, preserves all artifacts for forensics.

```bash
momentum swarm cancel <swarm-id> --reason "<text>"
```

**Confirm with the user before running.** Cancel is reversible only via `/swarm resume` re-attaching to a frozen state — you cannot un-cancel a wave that was mid-flight if commits have been pushed and force-overwrites would be needed.

After cancel:
1. All queued/running/blocked repos move to `cancelled`.
2. All queued/running waves move to `cancelled`.
3. Branches remain — supervisors do NOT force-push or delete.
4. Audit log gains a `cancel` entry with the reason.

---

## Tracking contract

- **Auto every time:** `manifest.json` writes via the conductor library; `board.json` regenerated on each write.
- **Auto only when meaningful:** `[SWARM]` entry in each supervisor's repo `history.md` after wave completion; `[NOTE]` in the originating session log on wave transitions.
- **Never:** silent overwrites of supervisor branches. Cancel preserves; resume reconstitutes.

## Errors

- Ecosystem root not found → suggest `--ecosystem <path>` or running from inside an ecosystem.
- Repo arg not a member → list valid members and abort.
- Initiative does not exist → suggest `momentum ecosystem initiative create <slug>` and abort.
- `claude --bg` not on PATH → degrade to dry-run + manual spawn instructions.
