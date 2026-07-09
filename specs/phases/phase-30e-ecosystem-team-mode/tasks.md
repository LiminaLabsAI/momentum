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
- [ ] `ecosystem.json` members accept `remote`; validation accepts `path` and/or `remote`
- [ ] Discovery + `ecosystem status` resolve remote-identified members; relative paths still work
- [ ] Tests (two-clone URL members); commit G1

## Group 2 — Ecosystem-state → fragments *(∥ G1)*
- [ ] `active-initiative` → per-actor fragment + compile
- [ ] Initiatives + session-presence → fragments; `ecosystem status` shows shared attributed state
- [ ] `momentum team sync` at ecosystem-root level
- [ ] Tests (two-clone concurrent active-initiative → zero conflict); commit G2

## Group 3 — Swarm leases-as-source-of-truth *(RISKY)*
- [ ] Ref-CAS ownership = source of truth when a remote is present; manifest → projection
- [ ] Renewals = ref refresh; takeover = win the CAS (30d fence, default-on-with-remote)
- [ ] **Single-machine invariance** — no remote → wall-clock path byte-unchanged; **231 swarm tests green**
- [ ] Tests (two-clone swarm ownership; skew can't double-own); commit G3

## Group 4 — Reader + docs + demo + tidy
- [ ] Sample third-party contract reader
- [ ] Docs (site "Team across repos" + developer-guide + README)
- [ ] Extend `scripts/demo-team.sh` (ecosystem + relay)
- [ ] `.gitignore` template: `.momentum/team/*.log` ignored
- [ ] Re-baseline 4 fingerprints (verify zero-drift first); commit G4

## Group 5 — Verify + release
- [ ] `tests/ecosystem-team-e2e.test.js` — two-clone multi-repo plane
- [ ] Full suite + 231 swarm green; retrospective `## Verification Evidence`
- [ ] Tracking BEFORE tag (Gate B): tasks/roadmap/status; ENH-065 → resolved
- [ ] Release v0.39.0; verify surfaces; close lane; only main + staging remain
