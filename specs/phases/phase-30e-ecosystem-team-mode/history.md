---
type: History
status: planned
---

# Phase 30e — Ecosystem Team Mode — History

### [DECISION] 2026-07-10 — Full ENH-065 scope, incl. the swarm transport
Topics: scope, ecosystem, multi-repo, swarm
Affects-phases: phase-30e-ecosystem-team-mode
Affects-specs: specs/backlog/backlog.md
Detail: Operator chose the full ENH-065 (all four pieces — remote-URL members,
ecosystem-state fragments, swarm shared-manifest transport, docs/reader/demo) over
the "Walk-sized" 1+2+4 slice or the minimal 1+2. Phase 30e extends the git-native
Team-mode plane from single-repo (v0.37/0.38) to the multi-repo ecosystem layer.

### [DECISION] 2026-07-10 — Swarm transport = leases-as-source-of-truth (ref-CAS default-on)
Topics: swarm, lease-cas, transport, keystone
Affects-phases: phase-30e-ecosystem-team-mode
Affects-specs: specs/decisions/0015-ecosystem-team-mode.md, core/swarm/lib/manifest.js
Detail: The hard part (#3) — swarm's manifest mutates too fast for git-commit
transport. Chosen approach (operator deferred to recommendation): the CONTENDED
thing, repo ownership, is shared via `refs/momentum/leases/*` CAS (the fence built
+ tested in 30d), made the DEFAULT when a remote is present; the manifest becomes a
local projection; renewals are cheap ref updates; coarse state syncs via ecosystem
fragments; the optional relay adds real-time when present. Reuses lease-CAS +
fragments + relay — minimal new surface, lowest risk. Rejected: shared-manifest-via-
fragments (heavier new transport) and relay-primary (weakens no-required-server).

### [ARCH_CHANGE] 2026-07-10 — Ecosystem-team state travels via the ecosystem repo
Topics: keystone, fragments, refs, ecosystem-repo
Affects-phases: phase-30e-ecosystem-team-mode
Affects-specs: specs/phases/phase-30e-ecosystem-team-mode/overview.md
Detail: The ecosystem coordination root is itself a git repo, so the settled
Team-mode keystone applies directly: ecosystem-team state (active-initiative,
initiatives, presence) travels via per-actor fragments committed in the ecosystem
repo + `refs/momentum/*` for leases. Converts the ecosystem's two single-operator
assumptions (`../relative` members on one disk; per-machine `.state/`).

### [DECISION] 2026-07-10 — Single-machine invariance is a hard gate
Topics: invariance, swarm, risk, 231-tests
Affects-phases: phase-30e-ecosystem-team-mode
Affects-specs: core/swarm/lib/manifest.js
Detail: G3 is the one risky group. Mitigation locked as a decision: the ref-CAS
ownership path is default-on ONLY when a remote is present; with no remote the
existing wall-clock lease path is byte-unchanged, and the **231 swarm tests must
stay green** as the gate. Same "gate-risk-behind-a-default" discipline that made
30d's fence safe.

### [DECISION] 2026-07-10 — ADR-0015 authored in Group 0
Topics: adr-0015, contracts
Affects-phases: phase-30e-ecosystem-team-mode
Affects-specs: specs/decisions/0015-ecosystem-team-mode.md
Detail: The ecosystem team-mode contract (git-native via the ecosystem repo;
leases-as-source-of-truth; single-machine invariance) is authored as ADR-0015 in
G0 before consumers. Extends ADR-0012/0013/0014 (single-repo Team Mode) to the
multi-repo layer; relates ADR-0001/0002/0003 (lanes) + the ecosystem layer.

---
### [ARCH_CHANGE] 2026-07-10 — G3 complete: swarm leases-as-source-of-truth (default-on-with-remote)
Topics: swarm, lease-cas, ref-cas, ownership, liveness, invariance, adr-0015
Affects-phases: phase-30e-ecosystem-team-mode
Affects-specs: core/swarm/lib/manifest.js
Detail: The 30d opt-in cross-machine lease fence becomes the DEFAULT when the
ecosystem root has a git remote (ADR-0015 #3/#4): refs/momentum/leases/* CAS is
the source of truth for contended swarm repo ownership; the manifest owner/lease_*
fields are the local projection. Two surgical changes to core/swarm/lib/manifest.js:
(1) leaseFence activation flips from opt-in (`!== '1'`) to default-on-when-remote
with a `MOMENTUM_SWARM_LEASE_CAS=0` escape hatch (force single-machine) and `=1`
still forcing on; no remote → inactive (wall-clock byte-unchanged). (2) The CAS
key now includes the SUPERSEDED lease generation (current lease_expires_at), so
each takeover is a fresh single-winner race — concurrent takers of the same
expired lease resolve to exactly one winner (no double-own), while a crashed
owner's stale ref can never wedge the NEXT legitimate takeover (liveness).
Residual (accepted): generation-keyed refs accumulate under refs/momentum/leases/*
(space, not correctness) — cleanup deferred. Invariance gate: 233/233 swarm tests
green (no-remote path unchanged); the one 30d lease-cas test's seed updated to the
generation-keyed name. New tests/swarm-lease-cas-ecosystem.test.js (two-clone
default-on: skew can't double-own; fresh-generation liveness; single-machine
unchanged). RISKY-group diff surfaced for operator review before landing.

---
### [FEATURE] 2026-07-10 — G2 complete: ecosystem-state → fragments
Topics: fragments, active-initiative, presence, ecosystem-repo, adr-0015
Affects-phases: phase-30e-ecosystem-team-mode
Affects-specs: core/ecosystem/lib/team-state.js, bin/ecosystem.js
Detail: New core/ecosystem/lib/team-state.js moves `active-initiative` (was
per-machine `.state/`) onto the shared per-actor fragment substrate
(core/team/lib/fragments) committed in the ecosystem repo — compiled value is
global last-writer-wins, attributed to who set it; the legacy `.state/` file is
kept as a per-machine cache + back-compat fallback. Session-presence reuses
core/team/lib/presence at the ecosystem root. `ecosystem initiative create` now
sets active via fragment (attributed); `ecosystem status` shows the shared
active initiative + a live Presence section (auto-heartbeat gated on a
team-active ecosystem). `momentum team sync` already works at the ecosystem root
(it is a git repo; fragments arrive via branch integration). Two-clone test:
concurrent active-initiative set + merge = zero git conflict (own-prefix files).
Suite 1013 → 1023.

---
### [FEATURE] 2026-07-10 — G1 complete: remote-URL members
Topics: remote-members, ecosystem-schema, discovery, adr-0015
Affects-phases: phase-30e-ecosystem-team-mode
Affects-specs: core/ecosystem/schema/ecosystem.schema.json, core/ecosystem/lib/index.js
Detail: `ecosystem.json` members now accept an optional `remote` (git URL)
alongside `path`; validation requires at least one of the two (path-only
back-compat preserved). New `lib.resolveMemberLocation()` classifies each member
as local / remote / local+remote. `ecosystem status` renders remote-URL members
by URL with a best-effort `git ls-remote` reachability probe (5s timeout,
offline-safe via file://); relative paths unaffected. `ecosystem add --remote
<url> --id <id>` registers a remote-only member (no pointer injection); `remove`
tolerates the missing local path. New tests/ecosystem-remote-members.test.js (12
cases). Suite +12; existing ecosystem tests green.

---
### [DECISION] 2026-07-10 — G0 complete: ADR-0015 authored
Topics: adr-0015, g0, contracts
Affects-phases: phase-30e-ecosystem-team-mode
Affects-specs: specs/decisions/0015-ecosystem-team-mode.md
Detail: Group 0 done — ADR-0015 defines the ecosystem team-mode contract:
git-native via the ecosystem repo (fragments) + refs/momentum leases; remote-URL
member schema (`remote` git URL alongside `path`); ecosystem fragment views
(active-initiative/initiatives/presence via core/team/lib/fragments); swarm
ownership = ref-CAS leases as source of truth (default-on with a remote,
single-machine byte-unchanged, 231 swarm tests the gate). Suite 1008/1008
(docs-only). Next: G1 (remote-URL members) ∥ G2 (ecosystem-state fragments).

---
