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
