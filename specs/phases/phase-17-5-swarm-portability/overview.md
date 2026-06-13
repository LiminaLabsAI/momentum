# Phase 17.5 — Swarm Portability

> **Target Version**: v0.20.2 (v0.20.1 consumed by Codex Runtime Refresh)
> **Branch**: `phase-17-5-swarm-portability`
> **Scope**: Claude Code only — Codex + Antigravity swarm parity remains Phase 18

## Goal

Light up multi-session swarm coordination using the schema hooks shipped
in v0.20.0. Three new commands (`/swarm focus`, `/swarm join`,
`/swarm absorb`) plus ownership-flip primitives (`/swarm claim`,
`/swarm release`). Lease enforcement currently audit-only becomes a hard
write-time check. The reserved `signals/` directory gets a typed,
mkdir-locked protocol. No schema migration needed.

## Key Decisions

| Decision | Reason |
|---|---|
| Files-as-channels for cross-session signalling | Same pattern as Phase 17. `<eco>/swarms/<id>/signals/` directory; typed messages; mkdir-locked writes; conductor polls each turn. No daemon. |
| Lease enforcement at `manifest.js` write chokepoint | Every conductor write already routes through `core/swarm/lib/manifest.js`. Enforcement becomes a single guard there: reject write if caller isn't `owner` AND lease isn't expired. |
| Opaque transfer tokens at `tokens/<token>.json` | `kind: focus\|join`, `expires`, `target_repo` (focus) or `swarm_id` (join). Random 16-hex string. Single-use; deleted on consume. |
| `focus` = transfer token + spawn directive | `/swarm focus <repo>` flips owner to a placeholder, writes a token, prints a `claude --bg` directive the user runs in another window. Receiving session calls `/swarm join --token`. |
| Sessions[] registry is conductor-write, append-only | First write adds; each turn updates `last_seen`. Never deleted. Audit trail for who ever touched the swarm. |
| Absorb = manifest merge + contract verify | Source-swarm's repos must be disjoint from target's OR have matching contracts. Inbox + audit logs merge by timestamp. Boards regenerate after merge. |
| Synthetic two-session scenarios | Phase 17 e2e pattern works for two-session — invoke the second conductor in-process with a different session_id. No live two-window dogfood as a gate. |
| Claude Code only | Phase 18 wires Codex/Antigravity adapters for swarm at all. Portability across platforms is a later concern. |

## Scope

**In:**
- `core/swarm/signals.js` — typed messages (`focus-request`, `claim-request`, `absorb-proposed`, `lease-expired`), mkdir-lock, poller
- Lease enforcement in `core/swarm/lib/manifest.js` write path
- `core/swarm/lib/tokens.js` — opaque transfer token CRUD
- `core/swarm/lib/sessions.js` — sessions[] registry CRUD (helper extracted from existing manifest writes)
- `core/swarm/focus.js`, `core/swarm/join.js`, `core/swarm/absorb.js` — command implementations
- `bin/swarm.js` extensions: `claim`, `release`, `focus`, `join`, `absorb` subcommands
- `adapters/claude-code/commands/swarm.md` extensions for the new verbs
- Three synthetic two-session scenarios + evidence
- `docs/swarm.md` Phase 17.5 section converted from "Future" to "Shipped"
- `core/adapter-parity-matrix.md` footnote update (no row change — still `/swarm` row)
- `core/adapter-capabilities.md` Phase 17.5 section
- Version bump to 0.20.2 + retrospective

**Out:**
- Codex + Antigravity swarm parity → Phase 18
- `interactive` mode, discuss thread, pause/resume, rewind → v0.20.x
- Live cerebrio bootstrap → post-release user activity
- HTTP/broker/registry coordination — files-as-channels only
- Cross-platform conductors (Claude + Codex co-conductors) → Phase 18.5+

## Deliverables with verification

| D | Deliverable | Verification |
|---|---|---|
| D1 | Signal protocol library + poller | `node --test tests/swarm-signals.test.js` |
| D2 | Lease enforcement in `manifest.js` | `node --test tests/swarm-lease-enforcement.test.js` |
| D3 | Token CRUD + sessions[] CRUD | `node --test tests/swarm-tokens-sessions.test.js` |
| D4 | `/swarm claim` + `/swarm release` CLI | `node --test tests/swarm-claim-release.test.js` |
| D5 | `/swarm focus <repo>` | `node --test tests/swarm-focus.test.js` |
| D6 | `/swarm join <swarm-id>` | `node --test tests/swarm-join.test.js` |
| D7 | `/swarm absorb <other-id>` clean merge | `node --test tests/swarm-absorb.test.js` |
| D8 | `/swarm absorb` contract-conflict abort | covered in D7 suite |
| D9 | Three synthetic two-session scenarios | `tests/swarm-portability-e2e.test.js` + `evidence/scenario-portability-{focus,join,absorb}.txt` |
| D10 | `docs/swarm.md` Phase 17.5 section + slash command docs | grep verification in `tests/docs-swarm-portability.test.js` |
| D11 | No Claude Code regression | `node --test tests/claude-code-regression.test.js` |
| D12 | Full suite green | `npm test` shows ≥464 + ~80 new (~544 total); zero pre-existing regressions |

## Acceptance criteria

1. D1–D12 all pass; D9 has captured evidence in `evidence/scenario-portability-*.txt`
2. `npm test` shows ≥544 (464 v0.20.1 baseline + ~80 new); zero pre-existing regressions
3. Lease enforcement test-verified: write from non-owner session with valid lease → rejected; write from owner → accepted; write from non-owner after lease expiry → accepted (lease takeover)
4. Signal protocol mkdir-lock test-verified: 20 concurrent writes produce 20 valid, distinct signals — no corruption
5. Solo-swarm (single-session) behaviour unchanged: all Phase 17 e2e scenarios pass byte-for-byte
6. Retrospective contains Rule 12 Verification Evidence section
7. No regression in Claude Code adapter — `claude-code-regression.test.js` green (intentional `swarm.md` overlay drift documented in fingerprint meta)
