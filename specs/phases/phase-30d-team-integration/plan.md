---
type: Plan
status: in-progress
---

# Phase 30d — Team Integration — Implementation Plan

```
Execution order:  Group 0 → Group 1 → Group 2 → Group 3   (sequential)
```

Sequential because each touches shared, sensitive surfaces (instruction
generation → fingerprints; the `pre-push` hook; the swarm manifest) where
parallel edits would collide. Lane: `feat-team-integration` (isolated worktree).
Verification default: `npm test`.

## Group 0 — Recipe claim-wiring + Rule 15 *(instruction surfaces → fingerprints)*
**Commit:** `feat(team): wire momentum claim into recipes + Rule 15 mechanism`
- [ ] `/brainstorm-phase` + `/start-phase` + `/hotfix`: obtain the next phase/backlog number via `momentum claim phase|id` (deflect-and-repick on loss)
- [ ] `/complete-phase`: reserve the release via `momentum claim version <X>` before tagging (ENH-057 wired)
- [ ] Reword **Rule 15** (rules body) to cite the fragment/CAS mechanism; keep social discipline as the fallback narrative
- [ ] `changelog/` → per-actor fragments + compile
- [ ] `refreshGitignore` in `bin/momentum.js` adds `!.momentum/team/` for downstream installs
- [ ] `npm run generate-instructions`; **re-baseline 4 adapter fingerprints** (claude-code/codex/antigravity/opencode) with explanatory meta
- [ ] Recipe-content + rules-body tests

## Group 1 — lanes land review gate + pre-push *(HOOK CHANGE — operator approval)*
**Commit:** `feat(team): lanes land honors shared turn + reviewer≠author gate`
- [ ] Config keys in `config.md` + `core/config.js`: `review_min_approvals` (0=off), `review_self_approval`, `presence_idle_seconds`/`presence_offline_seconds`
- [ ] `lanes land`: take/require the shared turn (`core/team/lib/queue.js`); when `review_min_approvals ≥ 1`, require the approvals ledger satisfied (reviewer≠author) before merging
- [ ] `pre-push` (`core/git-hooks/run-check.js` + `contract.js`): `.momentum/merge-approved` → attributed multi-actor approval record; enforce reviewer≠author when configured (**operator approval for the hook change**)
- [ ] Tests: land blocked without peer approval when gate on; solo default unchanged; hook records approver

## Group 2 — Ecosystem team mode *(multi-repo — the deferred Fly scope)*
**Commit:** `feat(ecosystem): multi-machine team mode (remote-URL members + lease-CAS)`
- [x] Durable actor on lane signals (`signals.js`) — done in this lane
- [ ] Auto-heartbeat: refresh presence on any `momentum` invocation (best-effort, non-blocking)
- [ ] Remote-URL members in `ecosystem.json`; discovery/status resolve them (relative paths still valid)
- [ ] `active-initiative`/initiatives/session-presence → fragments (conflict-free across clones)
- [ ] Wire `core/team/lib/lease.js` ref-CAS into `core/swarm/lib/manifest.js` — replace the wall-clock lease with a fencing-safe ref-CAS lease; audit keyed by durable actor
- [ ] Two-clone ecosystem e2e (shared active-initiative; lease-CAS single-owner; skew cannot double-own)

## Group 3 — Verify + docs + release *(sequential, last)*
**Commit:** `docs(team): team-across-repos docs + sample reader; release v0.38.0`
- [x] Live two-clone demo `scripts/demo-team.sh` — done in this lane
- [ ] Extend the demo to cover ecosystem team mode + the relay
- [ ] Sample third-party contract reader (reads fragments/refs → prints the board)
- [ ] Docs — site "Team across repos" + relay setup; README; developer-guide
- [ ] Full suite green + all fingerprints re-baselined
- [ ] **Tracking BEFORE tag (Gate B):** tasks.md checkboxes, roadmap + status reconciled, ENH-064 → resolved
- [ ] Release v0.38.0 (merge → main → staging, tag, GH release, npm); verify all surfaces; clean branches
