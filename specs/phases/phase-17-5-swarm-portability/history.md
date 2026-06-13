# Phase 17.5 Swarm Portability History

> Append-only log of decisions, scope changes, and discoveries during Phase 17.5.

### [SCOPE_CHANGE] 2026-06-13 — Phase 17.5 displaced from v0.20.1 to v0.20.2
Topics: phase-17-5, swarm-portability, scope-change, version-bump, codex-runtime-refresh
Affects-phases: phase-17-5-swarm-portability
Affects-specs: specs/planning/roadmap.md, specs/status.md
Detail: Phase 17 retrospective targeted Phase 17.5 at v0.20.1. The unplanned Codex Runtime Refresh (BUG-007 + ENH-036) consumed v0.20.1 on 2026-06-13. Phase 17.5 retargets to v0.20.2. No scope change — the schema hooks in v0.20.0 still cover everything 17.5 needs.

---

### [DECISION] 2026-06-13 — Goal locked: multi-session swarm coordination via files-as-channels
Topics: phase-17-5, swarm-portability, files-as-channels, no-daemon
Affects-phases: phase-17-5-swarm-portability
Affects-specs: core/swarm/signals.js, core/swarm/lib/manifest.js
Detail: Phase 17.5 lights up the schema hooks shipped in v0.20.0. Three new commands (`/swarm focus`, `/swarm join`, `/swarm absorb`) plus `/swarm claim` and `/swarm release` as primitives. Lease enforcement (audit-only in v0.20.0) becomes a write-time guard at `core/swarm/lib/manifest.js`. The reserved `signals/` directory gets a typed protocol. Files-as-channels stays the only coordination primitive — no HTTP, no broker, no service registry. Same mkdir-lock pattern Phase 17 already uses.

---

### [DECISION] 2026-06-13 — Lease enforcement at manifest.js write chokepoint
Topics: phase-17-5, swarm-portability, lease-enforcement, single-chokepoint
Affects-phases: phase-17-5-swarm-portability
Affects-specs: core/swarm/lib/manifest.js
Detail: All conductor + supervisor manifest writes already route through `core/swarm/lib/manifest.js`. Adding `assertOwnership(manifest, repo, session_id)` there gives a single enforcement point: write rejected if caller isn't `owner` AND lease hasn't expired. v0.20.0 set the schema fields but never read them at write time. Phase 17.5 reads them.

---

### [DECISION] 2026-06-13 — Opaque transfer tokens for focus + join
Topics: phase-17-5, swarm-portability, tokens, single-use
Affects-phases: phase-17-5-swarm-portability
Affects-specs: core/swarm/lib/tokens.js, core/swarm/schema/signal.schema.json
Detail: `<eco>/swarms/<id>/tokens/<token>.json` with `{ kind: focus|join, expires, target_repo (focus) or swarm_id (join), issued_by, issued_at }`. 16-hex random ID. Single-use: `consumeToken` deletes on read. 1-hour default expiry. Avoids embedding session UUIDs in spawn directives (cleaner UX, single-attempt security).

---

### [DECISION] 2026-06-13 — Synthetic two-session e2e scenarios (no live two-window gate)
Topics: phase-17-5, swarm-portability, e2e-scenarios, synthetic-fixtures
Affects-phases: phase-17-5-swarm-portability
Affects-specs: tests/swarm-portability-e2e.test.js
Detail: Phase 17 e2e pattern works for two-session: invoke conductor functions in-process with a different `session_id` argument. Three scenarios: P-Focus (linear fixture, focus + reunion), P-Join (branched, co-conductor + parallel waves), P-Absorb-Conflict (wide, contract diff abort). Live two-Claude-Code-window dogfood deferred — same call the Phase 17 brainstorm made for the same reason: synthetic is reproducible across devs, live is a manual operator-time tax.

---

### [DECISION] 2026-06-13 — Claude Code only for Phase 17.5
Topics: phase-17-5, swarm-portability, scope, claude-code-only
Affects-phases: phase-17-5-swarm-portability, phase-18-swarm-parity
Affects-specs: core/adapter-parity-matrix.md
Detail: Codex + Antigravity still don't ship `/swarm` at all (Phase 18 wires them). Portability across platforms (Claude conductor + Codex co-conductor on the same swarm) is Phase 18.5+ territory. Phase 17.5 keeps the platform surface unchanged.

---
