# Ad-hoc Work Record: feat-ENH-049-ecosystem-command-surface

> **Type**: quick-task
> **Created**: 2026-07-03
> **Branch**: feat/ENH-049-ecosystem-command-surface (lane `feat-ENH-049-ecosystem-command-surface`, opened via `momentum lanes open`)
> **Backlog**: ENH-049
> **Status**: shipped

## Current Behavior

The ecosystem CLAUDE.md/AGENTS.md templates advertise slash-command
primitives (`/scout /dispatch /handoff /continue /initiative /session`, plus
the `/ecosystem` and `/swarm` operator doors), but `ecosystem init` shipped
ONLY the two instruction files. A fresh coordination root promised commands
that did not resolve; the cerebrio root only had a working surface by
accident of the BUG-016 project-mode mis-install, later curated by hand.
There was also no upgrade path to retrofit or refresh the surface.

Latent related bug: `bin/momentum.js` strips `--agent <name>` globally
before dispatch, so `runEcosystem` subcommands never saw it — the
documented `ecosystem upgrade --agent` override was dead code.

## Expected Behavior

- `ecosystem init [--agent <name>]` (default `claude-code`, validated
  against `adapters/`) installs the curated coordination surface:
  - 8 commands at the adapter's commands destination
    (`.claude/commands` / `.codex/commands` / `.agent/workflows`):
    scout, dispatch, handoff, continue, swarm (adapter-overlay sources,
    core fallback) + ecosystem, initiative, session (core sources);
  - `scripts/session-append.sh` + `scripts/sessionstart-handoff.sh`
    (exec bit enforced);
  - Claude Code only: `.claude/settings.json` with the SessionStart
    handoff/banner hook (from
    `core/ecosystem/templates/ecosystem-settings-claude.json`), written
    only when absent — settings are user-owned once they exist.
- `ecosystem upgrade` manages every agent surface detected in the root
  (`detectRootAgents`), retrofits the default (or explicit `--agent`)
  surface when none exists, refreshes differing momentum-owned files with
  `.bak` (house semantics), and warns about project-layer commands
  (BUG-016 anti-pattern) without ever deleting them. Honors `--dry-run`.
- An explicitly-passed `--agent` now reaches the ecosystem subcommands
  (re-injected at the dispatch), fixing the sweep override as well.

## Unchanged Behavior

- The instruction-file machinery (ENH-025 write, BUG-016
  `refreshRootInstructions`) is untouched; the surface step runs after it.
- The member sweep in `ecosystem upgrade` is unchanged.
- No shipped template/command content changed — command sources are read
  from their existing homes (`adapters/<agent>/…`, `core/commands/`); no
  adapter fingerprint drift (suite fingerprint tests green, no re-baseline).
- `ecosystem init` still refuses to overwrite an existing `ecosystem.json`,
  and project-mode `init`/`upgrade` still refuse to run in a coordination
  root (all 8 BUG-016 guard tests green — one assertion modernized:
  `.claude/` now legitimately exists in an ecosystem root, so the test
  asserts on project-only markers instead).

## Verification Evidence

```
$ node --test --test-concurrency=1 tests/ecosystem-root-surface.test.js tests/ecosystem-root-guard.test.js
tests 17, pass 17, fail 0   (9 new surface tests + 8 guard tests)

$ npm test
tests 724, pass 724, fail 0   (715 → 724)

# Live smoke — fresh scaffold:
$ momentum ecosystem init smoke            → 8 commands + 2 scripts (exec) + SessionStart-only settings.json
$ momentum ecosystem init smoke-codex --agent codex → 8 commands at .codex/commands, no .claude/
$ momentum ecosystem init bad --agent nope → Error: unknown agent "nope" (available: antigravity, claude-code, codex)

# Live validation — the real cerebrio coordination root:
$ momentum ecosystem upgrade --dry-run   (in ../cerebrio-ecosystem/)
Coordination-root instructions:
  = CLAUDE.md up to date
  = AGENTS.md up to date
Coordination-root command surface:
  = .claude/commands [claude-code]: 11 file(s) up to date
(the hand-curated cleanup is byte-identical to what the machinery ships)
```

## Commit

Single commit on `feat/ENH-049-ecosystem-command-surface`:
`feat(ecosystem): init/upgrade ship + manage the coordination-root command surface (ENH-049)`
— touches `bin/ecosystem.js` (surface constants + `ensureRootCommandSurface`
+ `detectRootAgents` + cmdInit `--agent` + cmdUpgrade wiring + help text),
`bin/momentum.js` (explicit `--agent` re-injection at ecosystem dispatch),
`core/ecosystem/templates/ecosystem-settings-claude.json` (new),
`tests/ecosystem-root-surface.test.js` (+9),
`tests/ecosystem-root-guard.test.js` (1 assertion modernized), and
lane-scoped tracking (this record, ENH-049 backlog row, changelog bullet).
