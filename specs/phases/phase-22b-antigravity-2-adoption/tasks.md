# Phase 22b Tasks

> Execution: G0 → G1 → (G2 ∥ G3) → G4 → G5
> Legend: `[ ]` todo · `[/]` in progress · `[x]` done (Rule 12: `[x]` only with fresh verification output)

## Group 0 — Live-probe evidence lock

- [x] Fixture project via `momentum init --agent antigravity`; record installed tree
- [x] Probe (a): workflows path (singular vs plural) + slash registration
- [x] Probe (b): skills path + directory/SKILL.md format + `/skills` listing
- [x] Probe (c): hooks — accepted schema shape, event set (SessionStart? PreInvocation?), relative vs absolute commands, exit-code semantics, stdin payload capture per event
- [x] Probe (d): subagent definition format/location + `/agent` invocation
- [x] Probe (e)+(f): global skills dir; `agy plugin` local install shape
- [x] Probe (g): AGENTS.md auto-load (sentinel-string quote test)
- [x] `evidence/fact-sheet.md` written; 6 VAL-002 questions mapped to answers + transcripts; `[EVALUATOR]` history entry (deny-semantics + shipped-shape items carry §10 caveats; re-probe task added to G1)

## Group 1 — Core realignment (deps: G0)

- [ ] Re-probe (stable env): deny semantics live + momentum-shipped-shape parse (fact-sheet §10 caveats)
- [x] Destinations per fact sheet — consolidated to `.agents/` (ADR-0005; dual-path not needed, all four roots equivalent)
- [x] `hooks.json` regenerated: vendor named-group schema, five events, write-family matchers
- [x] Hook commands relative to the hooks.json dir (`bash ../scripts/…`) — no templating needed (locked CWD rule)
- [x] Boundary shim `adapters/antigravity/scripts/antigravity-hook-adapter.sh` (payload translation, decision JSON, notice queue, PreInvocation injection); core scripts BYTE-IDENTICAL to main (capture tool: claude-code/codex "no change")
- [x] Session-start via `momentum-session-context` PreInvocation hook (invocationNum 0 → handoff banner ephemeralMessage); capability stays false pending live injection round-trip (ENH-052)
- [x] `surfaces.md` rewritten (canonical root, real hook table) + AGENTS.md regenerated; drift guard green in suite
- [x] Antigravity fingerprint re-baselined ONCE (58→59 files; claude/codex no change); 10 new contract tests + path updates across 7 test files; suite 739/739

## Group 2 — Spawn + swarm rewrite (deps: G1)

- [x] `spawn()` on real flags: detached `agy --new-project --dangerously-skip-permissions --print-timeout -p` FROM repoPath; per-repo log; synchronous missing-binary detection with official-installer hint
- [x] Swarm tests: argv-capture stub proves real flag surface + no fictional flags; 6/6
- [x] Live spawn smoke: real agy launched detached, log captured `BOOT-OK` (`evidence/spawn-smoke.md`)
- [x] Full suite incl. swarm e2e green: 740/740

## Group 3 — Native 2.0 surfaces (deps: G1)

- [x] Reviewer subagents RE-SCOPED per evidence: no documented/observed project-level subagent-definition surface exists (fact-sheet §7) — reviewers stay skills; `[SCOPE_CHANGE]` logged
- [x] `/review-code` fan-out unchanged — semantic skill activation is the vendor mechanism; no fictional wiring added
- [x] `momentum antigravity plugin-pack [--global] [--dry-run]` — plugin.json + 5 skills; validated LIVE: `agy plugin validate` → [ok], 5 skills processed (`evidence/plugin-pack.md`)
- [x] Global opt-in via `plugin-pack --global` → `~/.gemini/config/plugins/momentum/`; workspace installs take priority; documented in surfaces
- [x] `momentum doctor` advisory: antigravity projects (lock-file gated) + missing agy → official installer hint; never provisions; silent for other adapters

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
