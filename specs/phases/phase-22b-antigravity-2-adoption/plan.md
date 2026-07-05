---
type: Plan
---

# Phase 22b Implementation Plan

```
# Mixed: G0 → G1 → (G2 ∥ G3) → G4 → G5
```

External dependencies (all groups): `agy` CLI 1.0.16 at `~/.local/bin/agy`
(installed + authenticated 2026-07-05; official installer). No other new deps.
Node built-ins only, per house rule.

---

## Group 0 — Live-probe evidence lock

**Sequential.** Blocks everything. No adapter code changes in this group.

Probes live at `specs/phases/phase-22b-antigravity-2-adoption/evidence/probes/`
(committed shell/node scripts); raw transcripts beside them; synthesized
conclusions in `evidence/fact-sheet.md`, each claim citing its transcript.

Tasks:
1. Fixture: `momentum init --agent antigravity` into a scratch project;
   record installed tree.
2. Probe (a) **workflows**: does `agy` register `/scout` etc. from
   `.agent/workflows/` (singular)? From `.agents/workflows/` (plural)? Test
   both placements; capture `/help` or registration evidence headlessly where
   possible, TUI screenshot/typescript where not.
3. Probe (b) **skills**: `.agents/skills/<name>/SKILL.md` vs `.agent/skills/`
   vs flat files; `/skills` listing; directory+SKILL.md format acceptance.
4. Probe (c) **hooks**: minimal capture-hook (tees stdin → file, returns
   `{"allow_tool": true}`) wired in every candidate schema shape; determine —
   accepted schema, event set (SessionStart? PreInvocation?), relative vs
   absolute command handling, exit-code semantics (does exit 2 deny or error?),
   full stdin payload shape per event.
5. Probe (d) **subagents**: definition file format + location; `/agent`
   invocation; parallelism observable?
6. Probe (e) **global skills** dir (`~/.gemini/antigravity-cli/skills/` per
   docs) and (f) **plugins**: `agy plugin list`, local plugin install shape.
7. Probe (g) **AGENTS.md**: confirm auto-load (ask the agent to quote a
   sentinel string planted in the fixture's AGENTS.md).
8. Write `evidence/fact-sheet.md`; append `[EVALUATOR]`-grade history entry
   locking the facts; map each of the 6 VAL-002 questions → answer + transcript.

**Commit:** `test(antigravity): G0 live-probe evidence lock against agy 1.0.16`

---

## Group 1 — Core realignment

**Sequential** (needs G0 fact sheet).

Tasks:
1. Destinations in `adapters/antigravity/adapter.js` per fact sheet. If IDE
   and CLI paths truly diverge → STOP, write ADR-0006 (dual-destination
   adapter contract extension), then implement.
2. `hooks.json` regenerated in the accepted schema; real tool-name matchers
   (drop `apply_patch`; verify `view_file`/`write_to_file` against payload
   evidence).
3. Absolute-path strategy: install/upgrade-time templating of hook command
   paths (project-root resolution), with upgrade-refresh keeping them correct
   after a project moves. No hardcoded user paths — templated at install time
   into the TARGET project only.
4. `core/scripts/brainstorm-gate.sh` + `check-history-reminder.sh` +
   `sessionstart-handoff.sh`: antigravity branch rewritten for the real stdin
   payload (`hook_event_name`, `toolCall.args`) and response contract
   (always exit 0; `{"allow_tool": false, "deny_reason"}` to block). Claude
   Code + Codex branches byte-identical behavior (fingerprint + hook tests
   prove it).
5. SessionStart wiring per evidence: real event | `PreInvocation` fallback |
   AGENTS.md-text-only floor. Update `sessionStartHook` capability + roadmap
   note accordingly (flip only with a fire transcript).
6. Instructions `surfaces.md` fragments updated (paths, hooks table);
   regenerate; drift guard green.
7. Antigravity fingerprint re-baseline (once, with meta); update
   workflows/skills/hooks tests to the locked contract.

**Commit:** `feat(antigravity): realign hooks/paths/instructions to the 2.0 contract`

---

## Group 2 — Spawn + swarm parity rewrite

**Parallel with Group 3** (both depend only on G1).

Tasks:
1. `adapter.spawn(directive)` → real invocation: run from `directive.repoPath`
   (cwd, not `--cwd`), headless `-p` with supervisor engagement per G0
   evidence (skill auto-load by prompt, or plugin skill); permissions flags
   per probe (`--sandbox` vs `--dangerously-skip-permissions` — pick the
   least-privilege shape that works; record why).
2. Update `tests/adapter-antigravity-swarm.test.js` (env-stubbed) to the real
   flag surface.
3. One live spawn smoke in the fixture; transcript → `evidence/`.
4. Synthetic swarm e2e scenarios re-run; byte-stable where expected.

**Commit:** `feat(antigravity): swarm spawn on real agy flags`

---

## Group 3 — Native 2.0 surface adoption

**Parallel with Group 2.**

Tasks:
1. Reviewer subagent definitions (security/qa/architecture) in the G0-locked
   format/location; skills remain for persona-loading platforms.
2. `/review-code` workflow wired to native subagent fan-out (per evidence of
   `/agent` semantics).
3. `agy plugin` packaging of momentum recipes — shape per G0 probe (f);
   explicit opt-in, documented; no init side effect.
4. Global-skills opt-in documented (manual step or flag; NEVER default).
5. `momentum doctor`: `agy` presence check; advises official installer
   (`curl -fsSL https://antigravity.google/cli/install.sh | bash`); no
   provisioning. Supersedes ENH-051.

**Commit:** `feat(antigravity): native subagents, plugin packaging, doctor check`

---

## Group 4 — Truth-sync

**Sequential** (needs G2 + G3).

Tasks:
1. Capability flips with evidence citations (`sessionStartHook` per G1.5;
   audit `browser`/`artifacts`/`planningMode` claims against 2.0).
2. `core/adapter-capabilities.md` + `core/adapter-parity-matrix.md`: rewrite
   antigravity rows; delete stale footnotes 11/13/14 rationale; fix the
   capabilities-vs-adapter.js `slashCommands` contradiction.
3. Backlog: VAL-002 → resolved (evidence links); ENH-051 → superseded-closed;
   FEAT-008 → closure recommendation w/ operator sign-off (Gemini CLI
   sunsetted 2026-06-18; Antigravity CLI is the successor); file deferred-
   surface items (scheduled tasks, voice, browser).
4. Roadmap: Phase 22b row; note FEAT-008 outcome.
5. Site/README: only if they carry stale antigravity claims (grep first).

**Commit:** `docs(antigravity): truth-sync capabilities/parity/backlog to 2.0 evidence`

---

## Group 5 — Verification + release

**Sequential.**

Tasks:
1. Full suite ×3 adapters; smoke matrix; fingerprint guards (Claude Code +
   Codex byte-identical to baseline).
2. Retrospective with non-empty `## Verification Evidence` (Rule 12 / land gate).
3. Version bump v0.29.0; `/sync-docs` before `/complete-phase`.
4. Land via `momentum lanes done` + `lanes land` in turn (Rule 6 Landing
   Order; rebase over whatever landed first — likely opencode).
5. Release checklist (Project Extensions): tag + `gh release create` +
   `npm publish` — each behind operator approval.

**Commit:** `chore(release): v0.29.0 — Phase 22b Antigravity 2.0 adoption`
