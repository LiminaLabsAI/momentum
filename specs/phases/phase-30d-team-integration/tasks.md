---
type: Tasks
status: in-progress
---

# Phase 30d — Team Integration — Tasks

> Wires the shipped v0.37.0 Team-mode primitives into momentum's real workflows
> (closes ENH-064). `[x]` done · `[/]` in-progress · `[ ]` todo. Sequential
> G0 → G1 → G2 → G3. Lane `feat-team-integration`. Target v0.38.0.

## Group 0 — Recipe claim-wiring + Rule 15 (fingerprints)
- [ ] `momentum claim phase|id` in `/brainstorm-phase` + `/start-phase` + `/hotfix`
- [ ] `momentum claim version` in `/complete-phase` release gate (ENH-057)
- [ ] Reword Rule 15 → cite fragment/CAS mechanism
- [ ] `changelog/` → fragments + compile
- [ ] `refreshGitignore` `!.momentum/team/`
- [ ] `generate-instructions` + re-baseline 4 fingerprints
- [ ] Recipe/rules tests; commit G0

## Group 1 — lanes land review gate + pre-push (hook approval)
- [ ] Config keys (`review_min_approvals`/`review_self_approval`/`presence_*`)
- [ ] `lanes land` honors shared turn + reviewer≠author (config-gated)
- [ ] `pre-push` → attributed multi-actor approval ledger (operator approval for hook change)
- [ ] Tests; commit G1

## Group 2 — Ecosystem team mode
- [x] Durable actor on lane signals (`signals.js`) — `e3d3776`
- [ ] Auto-heartbeat on any `momentum` invocation
- [ ] Remote-URL members in `ecosystem.json`
- [ ] `active-initiative`/initiatives/session-presence → fragments
- [ ] `lease.js` ref-CAS wired into `core/swarm/lib/manifest.js`
- [ ] Two-clone ecosystem e2e; commit G2

## Group 3 — Verify + docs + release
- [x] Live two-clone demo `scripts/demo-team.sh` — `3fb2c1d`
- [ ] Extend demo (ecosystem + relay)
- [ ] Sample third-party contract reader
- [ ] Docs (site/README/developer-guide)
- [ ] Full suite + fingerprints
- [ ] Tracking BEFORE tag (Gate B): tasks/roadmap/status; ENH-064 → resolved
- [ ] Release v0.38.0; verify surfaces; clean branches
