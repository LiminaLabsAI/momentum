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

### [NOTE] 2026-06-14 — Group 3 landed — /swarm join
Topics: phase-17-5, swarm-portability, group-3, join, co-conductor, sessions-registry, token-consumption, auto-lease-renewal, fingerprint-refresh
Affects-phases: phase-17-5-swarm-portability
Affects-specs: core/swarm/join.js, bin/swarm.js, bin/momentum.js, adapters/claude-code/commands/swarm.md, tests/fixtures/v0.18.0-claude-code-fingerprint.json
Detail: G3 shipped `/swarm join <swarm-id>` — co-conductor registration with optional token consumption / explicit claim. Library at `core/swarm/join.js` (`join({ecosystemRoot, swarmId, sessionId, nowIso, token, claim, leaseMs})`). Three call shapes: (1) bare `join(swarmId)` registers/touches the session via `sessionsLib.touchSession` and auto-renews any owned leases via the existing `conductor.renewLeases`; (2) `join(swarmId, {token})` consumes an opaque token — if `kind=focus`, auto-claims the token's `target_repo`; if `kind=join`, registration-only; (3) `join(swarmId, {claim: <repo>})` does an explicit claim under `updateManifestAsOwner` lease rules. Lazy-require of `./conductor` avoids a cycle. Audit log: `join` entry with detail line noting the route (`registration only` / `via token kind=…` / `with --claim …`). CLI `cmdJoin` exits 1 cleanly on EOWNERSHIP, expired tokens, and missing swarms. Slash command doc: new `/swarm join` section with three-shape table. Claude Code regression fingerprint re-snapshotted (G3 meta). 13 new tests (`swarm-join.test.js`): registration-only, idempotent re-join (no duplicate sessions, last_seen bumps), focus-token consumption + claim, join-token consumption (no implicit claim), explicit `--claim` happy path, claim rejected with EOWNERSHIP, ghost swarm, expired token, auto-renewal on re-join, plus 4 CLI surfaces (registration JSON, focus→join round-trip via CLI, claim rejected exit 1, --help). Full suite 514 → 527. Zero pre-existing regressions.

---

### [NOTE] 2026-06-14 — Group 2 landed — /swarm focus
Topics: phase-17-5, swarm-portability, group-2, focus, token-issuance, focusing-sentinel, spawn-directive, fingerprint-refresh
Affects-phases: phase-17-5-swarm-portability
Affects-specs: core/swarm/focus.js, bin/swarm.js, bin/momentum.js, adapters/claude-code/commands/swarm.md, tests/fixtures/v0.18.0-claude-code-fingerprint.json
Detail: G2 shipped `/swarm focus <repo>` — the side-session split primitive. Library at `core/swarm/focus.js` (`focus({ecosystemRoot, swarmId, repo, sessionId, nowIso, expiresInMs})`) asserts ownership, issues a single-use focus token (kind=focus, target_repo, 1-hour default expiry), flips `repos[<repo>].owner` to the FOCUSING sentinel, writes a `focus-request` signal carrying the token, audit-logs `focus`, refreshes the board cache, and returns a `{token, signal, directive}` triple. Token rollback on EOWNERSHIP keeps the tokens/ directory clean. Directive shape is `{command: 'claude', args: ['--bg', '--cwd', <ecoRoot>], env: {MOMENTUM_SWARM_ID, MOMENTUM_FOCUS_TOKEN, MOMENTUM_FOCUS_REPO}, prompt}` — the CLI renders a `claude --bg --cwd <eco>` line + the `momentum swarm join` seed command for the user to copy into a second terminal. CLI `cmdFocus` in `bin/swarm.js` + `--expires-min` flag override + `--json` machine-readable output. Slash command doc: new `/swarm focus` section explaining the focus → join → absorb round-trip. Claude Code regression fingerprint re-snapshotted (G2 meta). 9 new tests (`swarm-focus.test.js`) covering owner-success, non-owner-rejection, token-expiry-override, single-use, focus→join round-trip in-process, and 4 CLI surfaces. Full suite 505 → 514. Zero pre-existing regressions.

---

### [NOTE] 2026-06-14 — Group 1 landed — /swarm claim + /swarm release
Topics: phase-17-5, swarm-portability, group-1, claim, release, ownership-primitives, audit-events, fingerprint-refresh
Affects-phases: phase-17-5-swarm-portability
Affects-specs: bin/swarm.js, bin/momentum.js, core/swarm/lib/manifest.js, core/swarm/schema/manifest.schema.json, adapters/claude-code/commands/swarm.md, tests/fixtures/v0.18.0-claude-code-fingerprint.json
Detail: G1 shipped the two ownership-flip primitives every higher portability command composes. `/swarm claim <swarm-id> <repo>` succeeds when the repo is `_unclaimed`/`_focusing` or the current lease has expired (logging both `claim` and `lease-takeover` audit events); rejects with exit 1 + a `claim-request` signal when the lease is valid. `/swarm release <swarm-id> <repo>` flips owner back to `_unclaimed` and clears the lease; owner-only; idempotent no-op on already-unclaimed. CLI surface in `bin/swarm.js` (`cmdClaim` / `cmdRelease` + `resolveSessionId` / `plusHours` / `sessionSlug` helpers); routed via the existing switch. `bin/momentum.js --help` lists claim + release. New audit events added to both the manifest validator and JSON schema: `claim`, `release`, `focus`, `join`, `absorb`, `lease-takeover` (forward-providing for G2-G4). Slash command doc: two new `/swarm claim` and `/swarm release` sections. Claude Code regression fingerprint re-snapshotted with meta explaining the additive `swarm.md` drift. 10 new tests (`swarm-claim-release.test.js`). Full suite 495 → 505. Zero pre-existing regressions.

---

### [NOTE] 2026-06-14 — Group 0 landed — signals + tokens + sessions + lease enforcement
Topics: phase-17-5, swarm-portability, group-0, signals, tokens, sessions, lease-enforcement, manifest-write-chokepoint
Affects-phases: phase-17-5-swarm-portability
Affects-specs: core/swarm/signals.js, core/swarm/schema/signal.schema.json, core/swarm/lib/tokens.js, core/swarm/lib/sessions.js, core/swarm/lib/manifest.js
Detail: G0 shipped the four foundation libraries plus lease enforcement at the manifest.js write chokepoint. (1) `core/swarm/signals.js` — typed cross-session messages (`focus-request` / `claim-request` / `absorb-proposed` / `lease-expired`) with mkdir-lock + auto-regenerated INDEX.md, monotonic NNNN ids that survive `processed/` archival, per-type required-field validation. (2) `core/swarm/schema/signal.schema.json` — v1 lock with per-type required fields. (3) `core/swarm/lib/tokens.js` — opaque 16-hex CRUD (`writeToken` / `readToken` / `consumeToken` / `purgeExpired` / `listTokens`) with single-use semantics under mkdir-lock and 1h default expiry. (4) `core/swarm/lib/sessions.js` — sessions[] registry extracted (registerSession / touchSession / findSession / listSessions). (5) Lease enforcement at `core/swarm/lib/manifest.js` — `assertOwnership(manifest, repo, sessionId, nowIso)` pure helper + `updateManifestAsOwner({...})` enforcing wrapper that rejects non-owners with valid leases (EOWNERSHIP error code) and allows takeover after lease expiry or against the new UNCLAIMED / FOCUSING sentinels. Existing `updateManifest` / `appendAudit` stay non-enforcing for audit-only writes (no regression). 31 new tests (`swarm-signals.test.js` 9 + `swarm-tokens-sessions.test.js` 12 + `swarm-lease-enforcement.test.js` 10). Full suite 464 → 495. Zero pre-existing regressions.

---
