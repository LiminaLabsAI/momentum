# Phase 22b Tasks

> Execution: G0 → G1 → (G2 ∥ G3) → G4 → G5
> Legend: `[ ]` todo · `[/]` in progress · `[x]` done (Rule 12: `[x]` only with fresh verification output)

## Group 0 — Live-probe evidence lock

- [ ] Fixture project via `momentum init --agent antigravity`; record installed tree
- [ ] Probe (a): workflows path (singular vs plural) + slash registration
- [ ] Probe (b): skills path + directory/SKILL.md format + `/skills` listing
- [ ] Probe (c): hooks — accepted schema shape, event set (SessionStart? PreInvocation?), relative vs absolute commands, exit-code semantics, stdin payload capture per event
- [ ] Probe (d): subagent definition format/location + `/agent` invocation
- [ ] Probe (e)+(f): global skills dir; `agy plugin` local install shape
- [ ] Probe (g): AGENTS.md auto-load (sentinel-string quote test)
- [ ] `evidence/fact-sheet.md` written; 6 VAL-002 questions mapped to answers + transcripts; `[EVALUATOR]` history entry

## Group 1 — Core realignment (deps: G0)

- [ ] Destinations per fact sheet (ADR-0005 first if dual-path required)
- [ ] `hooks.json` regenerated: accepted schema + real matchers
- [ ] Install/upgrade-time absolute-path templating for hook commands
- [ ] Hook scripts (`brainstorm-gate.sh`, `check-history-reminder.sh`, `sessionstart-handoff.sh`): real payload + response contract; Claude/Codex behavior unchanged
- [ ] SessionStart wiring per evidence; capability flip only with fire transcript
- [ ] `surfaces.md` fragments updated + regenerated; drift guard green
- [ ] Fingerprint re-baseline (once, with meta); hook/workflow/skill tests updated

## Group 2 — Spawn + swarm rewrite (deps: G1)

- [ ] `spawn()` on real flags (cwd + `-p` + least-privilege permissions shape)
- [ ] `tests/adapter-antigravity-swarm.test.js` updated to real surface
- [ ] Live spawn smoke transcript in `evidence/`
- [ ] Synthetic swarm e2e re-run; byte-stable where expected

## Group 3 — Native 2.0 surfaces (deps: G1)

- [ ] Reviewer subagent definitions in locked format/location
- [ ] `/review-code` wired to native subagent fan-out
- [ ] `agy plugin` packaging of recipes (opt-in, documented)
- [ ] Global-skills opt-in documented (never default)
- [ ] `momentum doctor` agy check advising official installer (supersedes ENH-051)

## Group 4 — Truth-sync (deps: G2, G3)

- [ ] Capability flips with evidence citations; audit remaining flags vs 2.0
- [ ] `adapter-capabilities.md` + `adapter-parity-matrix.md` antigravity rewrite; `slashCommands` contradiction fixed
- [ ] Backlog: VAL-002 resolved · ENH-051 superseded · FEAT-008 closure rec (operator sign-off) · deferred-surface items filed
- [ ] Roadmap row + FEAT-008 outcome
- [ ] Site/README stale-claim grep + fix if hit

## Group 5 — Verification + release (deps: G4)

- [ ] Full suite ×3 adapters + smoke matrix + fingerprint guards green
- [ ] Retrospective with `## Verification Evidence`
- [ ] Version bump v0.28.0; `/sync-docs`
- [ ] `lanes done` → `lanes land` in turn (rebase per Landing Order)
- [ ] Release checklist: tag + GitHub Release + npm publish (operator approvals)
