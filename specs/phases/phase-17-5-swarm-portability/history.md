---
type: Phase History
---

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

### [NOTE] 2026-06-14 — Group 5 landed — e2e + docs + retrospective + version bump to 0.20.2
Topics: phase-17-5, swarm-portability, group-5, e2e-scenarios, evidence, docs-swarm, parity-matrix, capabilities-matrix, retrospective, sync-docs, version-bump
Affects-phases: phase-17-5-swarm-portability
Affects-specs: tests/swarm-portability-e2e.test.js, specs/phases/phase-17-5-swarm-portability/evidence/scenario-portability-{focus,join,absorb}.txt, docs/swarm.md, core/adapter-parity-matrix.md, core/adapter-capabilities.md, specs/phases/phase-17-5-swarm-portability/retrospective.md, specs/status.md, specs/phases/README.md, specs/phases/index.json, specs/changelog/2026-06.md, specs/planning/roadmap.md, package.json
Detail: G5 shipped the three synthetic two-session e2e scenarios + signal load test, captured evidence to `specs/phases/phase-17-5-swarm-portability/evidence/`, converted `docs/swarm.md` "Future: Swarm Portability (Phase 17.5)" → "Multi-session portability (Phase 17.5 / v0.20.2)" with full subcommand table + signal protocol description + two worked examples, updated `core/adapter-parity-matrix.md` footnote 14 to cover Phase 17 + Phase 17.5 (Phase 18 retargeted to v0.20.3), refreshed `core/adapter-capabilities.md` matrix date + Phase 17/17.5 scope section, wrote retrospective.md, ran /sync-docs propagation to status.md / phases/README.md / phases/index.json / changelog/2026-06.md / planning/roadmap.md, bumped `package.json` 0.20.1 → 0.20.2. E2E scenarios: P-Focus (linear 3-repo — sess-A focuses backend, sess-B claims via token, lease enforcement blocks sess-A cross-write), P-Join (branched 4-repo — sess-A releases mid-b, sess-B joins as co-conductor and claims mid-b, concurrent waves), P-Absorb-Conflict (wide 5-repo — two swarms with diverging content_hash on root-api; absorb aborts with ECONTRACT; both swarms verified deep-equal to pre-absorb state). Plus signal protocol 20-way concurrent write load test (acceptance #4 evidence). Suite: **550/550** (464 v0.20.1 baseline + 86 new — 31 G0 + 10 G1 + 9 G2 + 13 G3 + 19 G4 + 4 G5). Ready to merge + tag + release.

---

### [NOTE] 2026-06-14 — Group 4 landed — /swarm absorb
Topics: phase-17-5, swarm-portability, group-4, absorb, two-swarm-convergence, contract-verify, manifest-merge, wave-recompute, sessions-union, inbox-merge, audit-timeline, archive, fingerprint-refresh
Affects-phases: phase-17-5-swarm-portability
Affects-specs: core/swarm/absorb.js, bin/swarm.js, bin/momentum.js, adapters/claude-code/commands/swarm.md, tests/fixtures/v0.18.0-claude-code-fingerprint.json
Detail: G4 shipped `/swarm absorb <target> <source>` — two-swarm convergence with contract-verify abort. Library at `core/swarm/absorb.js` (`absorb({ecosystemRoot, targetSwarmId, sourceSwarmId, sessionId, nowIso})`) does the full merge in five phases: (1) `detectContractConflicts` — for every shared `surface`, the `owner` must match and `content_hash` (when present) must match; mismatch returns `{kind: 'owner-divergence' | 'content-hash-divergence'}` and `absorb` throws `ECONTRACT` with both swarms untouched; (2) wave recomputation — collects union of repos and runs `computeWaves` against `ecosystem.json` dependency edges to produce dependency-correct waves; (3) section merges — repos union (target wins on overlap), sessions[] union by `session_id` with earliest `first_seen` + latest `last_seen`, contracts union (target's version on overlap), audit timeline sorted by timestamp + appended `absorb` entry; (4) inbox copy — source pending items rewritten as `absorbed-<slug>` with bumped ids in target via `inboxLib.writeInboxItem`, INDEX regenerated; (5) source dir archived to `<eco>/swarms/.absorbed/<source-id>/` for forensics. CLI `cmdAbsorb` with `--yes` confirmation gate: bare call renders a dry-run plan (repos to add, overlap, contract conflict count) and exits 0; `--yes` commits. `ECONTRACT` exits 1 with a per-surface diff. Exposed helpers (`detectContractConflicts` / `mergeRepos` / `mergeSessions` / `mergeContracts` / `mergeAudit`) are pure and unit-testable. Slash command doc: new `/swarm absorb` section explaining the abort contract + JSON shape. Claude Code regression fingerprint re-snapshotted (G4 meta). 19 new tests (`swarm-absorb.test.js`): 5 pure helpers (no-conflict, matching-hash, owner-divergence, hash-divergence, mergeSessions), 9 end-to-end (clean disjoint, wave recomputation, contract match, contract diverge with both-untouched verify, sessions union, audit interleaving, inbox copy, self-absorb refused, ghost source), 5 CLI surfaces (--yes commits, dry-run plan, contract-conflict exit 1, usage error, --help mentions absorb). Full suite 527 → 546. Zero pre-existing regressions.

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
