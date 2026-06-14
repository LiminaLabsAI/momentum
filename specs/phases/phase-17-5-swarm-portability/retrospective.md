# Phase 17.5 — Swarm Portability: Retrospective

> **Target Version**: v0.20.2
> **Completed**: 2026-06-14
> **Branch**: `phase-17-5-swarm-portability`
> **Scope**: Claude Code only — Codex + Antigravity swarm parity remains Phase 18

## What shipped

A complete portability layer on top of v0.20.0's swarm subsystem. The
schema hooks that v0.20.0 baked in (`repos[*].owner` +
`lease_expires_at` + `lease_renewed_at` + `claimed_by_session`, top-level
`sessions[]`, reserved `signals/` and `tokens/` directories) are now
authoritative state — the conductor library reads them at write time and
they back five new subcommands. A swarm can now be co-conducted by
multiple sessions without stepping on itself.

### The five new subcommands

| Verb | Purpose |
|---|---|
| `/swarm claim <swarm-id> <repo>` | Take ownership of a repo (against UNCLAIMED, FOCUSING, or expired lease). Rejected when another session holds a valid lease — writes a `claim-request` signal. |
| `/swarm release <swarm-id> <repo>` | Flip owner back to `_unclaimed`. Idempotent. Owner-only. |
| `/swarm focus <swarm-id> <repo>` | Issue a single-use focus token, flip owner to `_focusing`, and print a `claude --bg --cwd <eco>` spawn directive for a second session to consume. |
| `/swarm join <swarm-id> [--token \| --claim]` | Register the current session in `sessions[]`. With `--token`, consume a focus or join token (auto-claims on `kind=focus`). With `--claim <repo>`, do an explicit claim under the same lease rules as `/swarm claim`. |
| `/swarm absorb <target> <source>` | Converge two parallel swarms. Contract conflict on shared `surface` (owner mismatch or content_hash divergence) aborts cleanly with `ECONTRACT` — both swarms left untouched. Clean merge unions repos / waves (recomputed) / sessions / contracts / audit / inbox; source archived to `swarms/.absorbed/`. |

### The lease enforcement chokepoint

All ownership-affecting writes flow through a single guard at
`core/swarm/lib/manifest.js::updateManifestAsOwner`. Decisions are
expressed by a pure helper `assertOwnership(manifest, repo, sessionId,
nowIso)` returning `{ allowed, reason, expired }`. The mutate callback
runs only after the decision passes. Rejection raises an error with
`err.code = 'EOWNERSHIP'` and a `decision` field carrying the reason.

### The signal protocol

Typed cross-session messages at `<eco>/swarms/<id>/signals/NNNN-<type>-<slug>.json`,
mkdir-locked just like the inbox. The conductor poller branches on type:

- `focus-request` — carries the token, surfaced to receiving session
- `claim-request` — written when `/swarm claim` was rejected; current owner sees it next poll
- `absorb-proposed` — reserved for inter-swarm notification
- `lease-expired` — audit trail of lease churn

Processed signals archive to `signals/processed/`.

### Per-group ship contents

**G0 — Foundation libraries** (31 tests)
- `core/swarm/signals.js` + `schema/signal.schema.json` — typed messages, mkdir-lock, monotonic NNNN ids, INDEX regen, `markProcessed` archival
- `core/swarm/lib/tokens.js` — opaque 16-hex tokens, single-use `consumeToken`, 1-hour default expiry, `purgeExpired` sweep, `listTokens`
- `core/swarm/lib/sessions.js` — `registerSession` / `touchSession` / `findSession` / `listSessions` extracted from manifest writes for cleaner reuse
- `core/swarm/lib/manifest.js` — `assertOwnership` + `updateManifestAsOwner` enforcement wrapper; UNCLAIMED / FOCUSING owner sentinels; new audit events (`claim`, `release`, `focus`, `join`, `absorb`, `lease-takeover`) in both the operational validator and JSON schema

**G1 — claim + release CLI** (10 tests)
- `bin/swarm.js`: `cmdClaim` / `cmdRelease` + `resolveSessionId` / `plusHours` / `sessionSlug` helpers
- Claim rejection writes a `claim-request` signal for the existing owner; release is idempotent on already-unclaimed
- `bin/momentum.js --help` lists the new verbs
- New `/swarm claim` and `/swarm release` sections in the slash command doc

**G2 — `/swarm focus <repo>`** (9 tests)
- `core/swarm/focus.js`: asserts ownership, issues a focus token, flips to FOCUSING, writes a `focus-request` signal carrying the token, audit-logs `focus`, refreshes the board, returns a `{token, signal, directive}` triple
- Token rollback on EOWNERSHIP keeps `tokens/` clean
- Spawn directive is `claude --bg --cwd <ecoRoot>` with `MOMENTUM_SWARM_ID` / `MOMENTUM_FOCUS_TOKEN` / `MOMENTUM_FOCUS_REPO` env + a seed prompt
- New `/swarm focus` section in the slash command doc

**G3 — `/swarm join <swarm-id>`** (13 tests)
- `core/swarm/join.js`: three call shapes — bare (registration + auto lease renewal), `--token` (consume + auto-claim if focus), `--claim <repo>` (explicit claim)
- Lazy-requires the conductor to avoid a cycle
- Audit-log `join` entry notes the route (`registration only` / `via token kind=…` / `with --claim …`)
- New `/swarm join` section in the slash command doc

**G4 — `/swarm absorb <other-id>`** (19 tests)
- `core/swarm/absorb.js`: contract conflict detection (owner + content_hash), repos union (target wins on overlap), wave recomputation against `ecosystem.json` dependencies, sessions union with earliest `first_seen` + latest `last_seen`, contracts union, audit timeline sort + `absorb` entry, inbox copy with bumped ids, source dir archive to `<eco>/swarms/.absorbed/<source-id>/`
- CLI `cmdAbsorb` with `--yes` confirmation gate — bare call prints a dry-run plan and exits 0; `--yes` commits
- `ECONTRACT` exits 1 with a per-surface diff; both swarms untouched
- New `/swarm absorb` section in the slash command doc

**G5 — E2E + docs + retrospective + release** (4 e2e tests + this file)
- Three synthetic two-session scenarios in `tests/swarm-portability-e2e.test.js`:
  - **P-Focus** — linear 3-repo (shared-types → backend → frontend); sess-A focuses backend, sess-B joins via token, lease enforcement blocks sess-A from writing to backend
  - **P-Join** — branched 4-repo (root → {mid-a, mid-b} → leaf); sess-A releases mid-b, sess-B joins as co-conductor with `--claim mid-b`, concurrent waves
  - **P-Absorb-Conflict** — wide 5-repo (root → 4 leaves); two swarms with diverging content_hash on `root-api`; absorb aborts with `ECONTRACT`; both swarms verified byte-for-byte unchanged
- Plus a signal protocol 20-way load test (acceptance #4)
- Evidence captured at `evidence/scenario-portability-{focus,join,absorb}.txt`
- `docs/swarm.md` "Future: Swarm Portability" → "Multi-session portability (Phase 17.5 / v0.20.2)" with full subcommand table, signal protocol description, two worked examples
- `core/adapter-parity-matrix.md` footnote 14 updated to cover both Phase 17 + Phase 17.5; Phase 18 retargeted to v0.20.3
- `core/adapter-capabilities.md` matrix date + Phase 17/17.5 scope section refreshed
- `package.json` 0.20.1 → 0.20.2

### Claude Code zero-regression guard

The same fingerprint snapshot from Phase 16 Rework
(`tests/claude-code-regression.test.js`) ran on every G0–G5 commit. The
only intentional drift across the phase was the `.claude/commands/swarm.md`
overlay file, which gained four new subcommand sections (one per group
G1–G4). Each group re-snapshotted the fingerprint with meta documenting
the additive scope. Solo-swarm (single-session) behaviour: unchanged.

## Verification Evidence

| Deliverable | Evidence |
|---|---|
| D1 — Signal protocol library | `node --test tests/swarm-signals.test.js` — 9/9 |
| D2 — Lease enforcement in manifest.js | `node --test tests/swarm-lease-enforcement.test.js` — 10/10 |
| D3 — Token CRUD + sessions[] CRUD | `node --test tests/swarm-tokens-sessions.test.js` — 12/12 |
| D4 — `/swarm claim` + `/swarm release` CLI | `node --test tests/swarm-claim-release.test.js` — 10/10 |
| D5 — `/swarm focus <repo>` | `node --test tests/swarm-focus.test.js` — 9/9 |
| D6 — `/swarm join <swarm-id>` | `node --test tests/swarm-join.test.js` — 13/13 |
| D7 — `/swarm absorb` clean merge | `node --test tests/swarm-absorb.test.js` — 19/19 |
| D8 — `/swarm absorb` contract-conflict abort | covered in D7 suite + P-Absorb-Conflict |
| D9 — Three synthetic two-session scenarios | `tests/swarm-portability-e2e.test.js` — 4/4; evidence at `evidence/scenario-portability-{focus,join,absorb}.txt` |
| D10 — docs/swarm.md Phase 17.5 section | grep verification — "Multi-session portability" section + worked examples present |
| D11 — No Claude Code regression | `tests/claude-code-regression.test.js` — 2/2 (intentional `swarm.md` overlay drift re-fingerprinted at each group with meta updates) |
| D12 — Full regression | `npm test` — **550 / 550** (464 v0.20.1 baseline + 86 new); zero pre-existing regressions |

## Acceptance Criteria — all met

1. ✅ Every D1–D12 test passes locally; D9 has captured evidence in `evidence/scenario-portability-*.txt`
2. ✅ `npm test` shows 550 (464 v0.20.1 baseline + 86 new); zero pre-existing regressions
3. ✅ Lease enforcement test-verified: owner write accepted, non-owner with valid lease rejected (EOWNERSHIP), takeover after lease expiry accepted (with `lease-takeover` audit entry). Verified in unit tests + P-Focus + P-Join e2e.
4. ✅ Signal protocol mkdir-lock test-verified: 20-way concurrent write produces 20 valid, distinct signals — no corruption. Verified in `swarm-signals.test.js` + `swarm-portability-e2e.test.js` load case.
5. ✅ Solo-swarm (single-session) behaviour unchanged: all Phase 17 e2e scenarios (A linear / B branched / C wide) still pass byte-for-byte in `tests/swarm-e2e-scenarios.test.js`.
6. ✅ This retrospective contains the Rule 12 Verification Evidence section.
7. ✅ No regression in Claude Code adapter — `claude-code-regression.test.js` green at every group; intentional `swarm.md` overlay drift documented in fingerprint meta (G1/G2/G3/G4 each have their own meta note).

## What we deliberately did NOT ship

Out-of-scope per the brainstorm — staying narrow shipped this in one day:

| Deferred to | What |
|---|---|
| Phase 18 (v0.20.3, displaced from v0.20.2) | Codex `.codex/agents/swarm-supervisor.toml` + MCP cwd shim; Antigravity Agent Manager workflow + supervisor skill. `core/swarm/` remains platform-agnostic; only adapter wiring is deferred. |
| Phase 18.5+ | Cross-platform portability — a Claude Code conductor co-conducting with a Codex conductor on the same swarm. Out of scope while Phase 18 still owes basic swarm support for non-Claude platforms. |
| v0.20.x | `interactive` mode; discuss thread (`/swarm discuss <repo>`); manual takeover (`/swarm pause|resume <repo>`); rewind (`/swarm rewind <repo>`); live-streaming `/swarm tail <repo>`. The 3 unshipped intervention patterns from Phase 17. |
| v0.20.x | Network-based session discovery — all cross-session signalling stays in `signals/` files. If two sessions need to find each other, they go through the filesystem. |
| Post-release | Cerebrio bootstrap stays a user activity. The user installs released v0.20.2 and uses portability on real cerebrio repos. Phase 17.5 validated synthetically. |

## Surprises + lessons

- **`updateManifestAsOwner` is the leverage point.** Adding lease enforcement at exactly one chokepoint kept the surface tiny. Every new portability command threads through that single function — `/swarm claim`, `/swarm release`, `/swarm focus`, `/swarm join --claim`, the auto-claim inside `join --token`, and the takeover paths all share the same `assertOwnership` decision and the same `EOWNERSHIP` error code.
- **The FOCUSING sentinel cleans up an annoying race.** Without it, `/swarm focus` would have to flip ownership to a real session id, but the receiver doesn't exist yet. Introducing `_focusing` as a "valid for anyone with a token" placeholder removes the chicken-and-egg.
- **Wall-clock time fragility in tests.** First G1 takeover test used `2026-06-14T16:00:00Z` as the expiry, hit a stale wall-clock on the host (real time was earlier in the day), and failed with "lease valid". Re-anchored every fixed expiry to `2024-01-01T00:00:00Z` (definitely past) or `2099-01-01T00:00:00Z` (definitely future). Pattern worth carrying forward: tests that compare against `Date.now()` should pick timestamps no real clock can drift into.
- **`absorb` wave recomputation is a small but correct knob.** Without it, the merged swarm has stale wave indices that no longer reflect the union's dependency graph. Reusing `computeWaves` directly works because the function is pure — it only needs the impacted set and the ecosystem's dependency array. Status preservation for unchanged-membership waves was a small extra carve-out.
- **`contracts[]` content_hash carries the abort signal.** Phase 17's `contract.schema.json` had `content_hash` as required but Phase 17.5's `absorb` is the first code to actually compare two of them. Existing contracts get migration-free benefit: any swarm that ever wrote a contract surface with `content_hash` is now first-class participant in absorb conflict detection.
- **Fingerprint refresh four times in one day.** Each group landed a single new `/swarm <verb>` section in the slash command doc, which drifts the fingerprint. The pattern is straightforward — compute new hash, edit the meta note + the one drifted entry, push — but it's also the right discipline: the fingerprint test catches drift without forcing premature consolidation.

## Files added / modified

**Added (new):**
- `core/swarm/signals.js`, `core/swarm/focus.js`, `core/swarm/join.js`, `core/swarm/absorb.js`
- `core/swarm/schema/signal.schema.json`
- `core/swarm/lib/tokens.js`, `core/swarm/lib/sessions.js`
- `tests/swarm-signals.test.js`, `swarm-tokens-sessions.test.js`, `swarm-lease-enforcement.test.js`, `swarm-claim-release.test.js`, `swarm-focus.test.js`, `swarm-join.test.js`, `swarm-absorb.test.js`, `swarm-portability-e2e.test.js`
- `specs/phases/phase-17-5-swarm-portability/evidence/scenario-portability-{focus,join,absorb}.txt`

**Modified (additive):**
- `core/swarm/lib/manifest.js` — `assertOwnership` + `updateManifestAsOwner` + UNCLAIMED/FOCUSING sentinels + new audit event enum entries
- `core/swarm/schema/manifest.schema.json` — audit event enum extended
- `bin/swarm.js` — `cmdClaim`, `cmdRelease`, `cmdFocus`, `cmdJoin`, `cmdAbsorb` + helpers + dispatcher cases + `--help` text
- `bin/momentum.js` — `--help` text lists the new subcommands
- `adapters/claude-code/commands/swarm.md` — five new subcommand sections
- `docs/swarm.md` — "Future" section replaced with shipped semantics + two worked examples
- `core/adapter-parity-matrix.md` — footnote 14 covers both Phase 17 + 17.5
- `core/adapter-capabilities.md` — matrix date + Phase 17/17.5 scope section
- `tests/fixtures/v0.18.0-claude-code-fingerprint.json` — re-snapshot at G1/G2/G3/G4 with explanatory meta
- `package.json` — version 0.20.1 → 0.20.2

## Roadmap impact

- Phase 17.5 → v0.20.2 (Swarm Portability) — **complete**
- Phase 18 → v0.20.3 (Swarm Parity for Codex + Antigravity) — adapter wiring only; core is platform-agnostic. Displaced one slot due to Phase 17.5 consuming v0.20.2.
- Phase 19 → v0.21.0 (Reach: Cursor + Gemini adapters). No change.
- Phase 20 → v0.22.0 (Intelligence). No change.
- Phase 21 → v1.0 (Platform). No change.

## Ready to release

All groups verified. Branch `phase-17-5-swarm-portability` clean. Next:
merge to `main`, tag `v0.20.2`, `gh release create`, `npm publish
--access public`.
