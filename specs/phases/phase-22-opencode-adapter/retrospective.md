# Phase 22 — Reach: opencode Adapter — Retrospective

> **Completed**: 2026-07-05 (single-day phase)
> **Release**: v0.28.0 *(retargeted 2026-07-05 at landing: the OKF lane released v0.27.0 first — Rule 6 Landing Order)*
> **Lane**: `phase-22-opencode-adapter` (momentum lanes)

## What shipped

momentum's fourth adapter — opencode (`opencode-ai`, validated against
1.17.13) — at **full parity** with the existing three, and the first adapter
whose capability booleans were **entirely live-validated inside its own
phase** (no deferred VAL item):

- `adapters/opencode/adapter.js` — destinations, marker-aware AGENTS.md,
  runInstall/runUpgrade (command-frontmatter transform + converged-backup
  sweep), `spawn()` shelling `opencode run --dir <repo> --agent
  swarm-supervisor`.
- Generated `AGENTS.md` via the Phase 23 single-source pipeline
  (header/vars/surfaces + drift guard).
- 23 recipes as native commands (`.opencode/commands/`, TUI-picker
  frontmatter), `momentum-orient` as a native skill, 3 sandbox-read-only
  reviewer agents + swarm-supervisor, and one self-contained enforcement
  plugin (`.opencode/plugins/momentum.js`) covering brainstorm gate, history
  reminder, and handoff banner.
- Capability matrix + parity matrix columns (footnotes 17–19); README;
  roadmap drift repair (missing Rules Unification row; Reach re-scoped to
  opencode @ v0.28.0 after the OKF retarget; Intelligence → 25 @ v0.29.0+; Platform → 26 @ v1.0).
- Core fix en route: `installHookFiles` no longer backs up byte-identical
  hook files — the mechanism that originally created BUG-017's committed
  `.githooks/*.bak` litter. TD-006 completed on the multi-adapter e2e
  (evidence capture was un-gated there).

**Capability outcome:** `hooks` / `slashCommands` / `subagents` /
`parallelSubagents` / `skills` all `true` from live evidence —
**`skills: true` and live-proven parallel fan-out are momentum firsts**.
`sessionStartHook` stays `false`: `session.created` was not observed in
run-mode; the flip waits for TUI evidence (the VAL-002 standard, applied).

## Verification Evidence

All fresh, this-session, on this branch (Rule 12):

1. **Full suite: 756/756 green** (`npm test`) — 734 pre-phase baseline
   + 13 G1–G3 opencode tests + 9 G4 tests (fingerprint ×3, smoke ×3,
   swarm e2e scenarios ×3). Zero regressions on existing adapters:
   claude-code / codex / antigravity install fingerprints byte-identical.
2. **Install smoke** — `momentum init --agent opencode` in a scratch dir:
   AGENTS.md (project-name substituted) + 23 frontmattered commands +
   4 agents + plugin + skill; no `opencode.json` written.
3. **Upgrade idempotence** — `momentum upgrade` on a fresh install is
   byte-identical (test-pinned; two `.bak`-litter root causes fixed).
4. **Live validation** — 7-check runsheet against the real opencode CLI
   with real model calls (free tier, zero credentials):
   `evidence/val-opencode-live.txt`. 6/7 PASS + parallel fan-out proof
   (overlapping task timestamps); check 4 honestly failed and is recorded
   with a reproduced runtime caveat (`event` bus hook hangs run-mode).
   Live-found bug fixed in-phase: `tool.execute.after` carries no args →
   callID correlation; unit tests updated to the live-confirmed payload.
5. **Swarm e2e** — 3 synthetic ecosystem scenarios × opencode complete
   with canonical spawn dispatch: `evidence/scenario-*-opencode.txt`.
6. **Tarball shape** — `npm pack --dry-run` carries all 15 opencode paths;
   no `.bak`/specs/tests leakage (suite-pinned).

## What worked

- **Live-first validation.** Free-tier models made every check autonomous —
  the deferred-VAL pattern (VAL-001/002 dangling for weeks) is broken.
  The live runsheet immediately paid for itself: it caught a real plugin
  bug (after-hook args) that 7 green synthetic unit tests had missed, and
  prevented an unearned `sessionStartHook` flip.
- **Native-idiom mapping was 1:1.** opencode is the closest surface fit of
  any adapter: commands/plugins/agents/skills all first-class, `--dir`
  replaces Codex's MCP cwd shim entirely.
- **The lanes + hooks machinery held.** BUG-017 (exec bits) was fixed and
  landed as a quick-task lane *before* this phase's commits needed
  enforcement; every phase commit was validated by a live commit-msg hook
  inside a lane worktree.

## What to improve

- **Contract-audit tests couple all adapter surfaces to adapter.js
  existence** — the planned G0–G3 slicing was impossible to keep
  suite-green per commit; G0 absorbed the file surfaces and G1–G3 became
  test commits. Future adapter phases should plan a "G0 ships everything
  file-shaped" structure from the start (logged as `[NOTE]` in history).
- **session.created / TUI checks need an interactive harness.** Run-mode
  covers 6/7 checks; the last check (and the `event`-hook hang) deserve an
  upstream issue + a TUI-session validation recipe.

## Follow-ups (filed / recommended)

- Flip `sessionStartHook` + promote the two `shipped-degraded¹⁹` ecosystem
  cells when TUI evidence lands (banner code already ships).
- Wire the ecosystem auto session log through the plugin (currently CLI/
  `/session` only — parity-matrix footnote 19).
- Consider an upstream opencode issue for the `event` bus hook hang in
  run-mode (1.17.13) and `session.created` non-firing in run-mode.
- ENH-009 (distribution decision) is now unblocked — "≥1 additional
  adapter" gate satisfied.
