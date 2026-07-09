---
type: Tasks
status: planned
---

# Phase 30e — Ecosystem Team Mode — Tasks

> Mirrors `plan.md`. `[x]` done · `[/]` in-progress · `[ ]` todo. Verify before
> claiming done (Rule 12). Execution: G0 → (G1 ∥ G2) → G3 → G4 → G5. Closes
> ENH-065. Target v0.39.0. Lane `phase-30e-ecosystem-team-mode`.

## Group 0 — Contracts & ADR-0015 *(blocks)*
- [x] Author **ADR-0015** (ecosystem team mode; leases-as-source-of-truth; single-machine invariance)
- [ ] Remote-URL member schema (`remote` git URL on `ecosystem.json` members; back-compat with `path`)
- [ ] Ecosystem fragment views (`active-initiative`/`initiatives`/`presence` via `core/team/lib/fragments`)
- [ ] Commit G0

## Group 1 — Remote-URL members *(∥ G2)*
- [x] `ecosystem.json` members accept `remote`; validation accepts `path` and/or `remote`
- [x] Discovery + `ecosystem status` resolve remote-identified members; relative paths still work
- [x] Tests (two-clone URL members); commit G1

## Group 2 — Ecosystem-state → fragments *(∥ G1)*
- [x] `active-initiative` → per-actor fragment + compile
- [x] Initiatives + session-presence → fragments; `ecosystem status` shows shared attributed state
- [x] `momentum team sync` at ecosystem-root level
- [x] Tests (two-clone concurrent active-initiative → zero conflict); commit G2

## Group 3 — Swarm leases-as-source-of-truth *(RISKY)*
- [x] Ref-CAS ownership = source of truth when a remote is present; manifest → projection
- [x] Renewals = ref refresh; takeover = win the CAS (30d fence, default-on-with-remote)
- [x] **Single-machine invariance** — no remote → wall-clock path byte-unchanged; **231 swarm tests green** (233/233)
- [x] Tests (two-clone swarm ownership; skew can't double-own); commit G3

## Group 4 — Reader + docs + demo + tidy
- [x] Sample third-party contract reader (`scripts/read-team-board.js` + test)
- [x] Docs (site "Team mode" page + nav + developer-guide + README) — site builds 13pp, gate green
- [x] Extend `scripts/demo-team.sh` (ecosystem + contract reader; runs end-to-end)
- [x] `.gitignore` template: `.momentum/team/**/*.log` ignored
- [x] Re-baseline 4 fingerprints (drift = only .gitignore; regenerated); commit G4

## Group 5 — Verify + release
- [ ] `tests/ecosystem-team-e2e.test.js` — two-clone multi-repo plane
- [ ] Full suite + 231 swarm green; retrospective `## Verification Evidence`
- [ ] Tracking BEFORE tag (Gate B): tasks/roadmap/status; ENH-065 → resolved
- [ ] Release v0.39.0; verify surfaces; close lane; only main + staging remain
