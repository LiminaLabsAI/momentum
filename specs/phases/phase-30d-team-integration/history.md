---
type: History
status: in-progress
---

# Phase 30d — Team Integration — History

### [DECISION] 2026-07-10 — ENH-064 escalated to a phase (Rule 14)
Topics: rule-14, scope, escalation
Affects-phases: phase-30d-team-integration
Affects-specs: specs/backlog/backlog.md
Detail: Finishing the Team-mode integration touches the phase recipes across 4
adapters (→ fingerprint re-baselines), the `pre-push` hook, and adds
ecosystem/multi-repo team-mode features — >5 production files + architecture +
public-surface changes. Per Rule 14 that is phase-scale, not a quick-task.
Operator chose "make it a proper phase (30d)" over grinding it as a large
quick-task. Avoids repeating the over-claim pattern the operator flagged.

### [SCOPE_CHANGE] 2026-07-10 — Phase = wiring, not rebuild
Topics: integration, primitives
Affects-phases: phase-30d-team-integration
Affects-specs: specs/phases/phase-30d-team-integration/overview.md
Detail: v0.37.0 shipped + tested the git-native primitives (`core/team/*`,
`core/identity`). 30d consumes them — wires `momentum claim` into the recipes,
the reviewer≠author gate into `lanes land`/`pre-push`, rewords Rule 15, and
builds ecosystem team mode on the same fragments + `refs/momentum/leases/*` CAS.
No primitive behavior changes.

### [NOTE] 2026-07-10 — Started before the brainstorm formalized
Topics: demo, signals, lane
Affects-phases: phase-30d-team-integration
Affects-specs: none
Detail: Two pieces already landed in the `feat-team-integration` lane while
answering the operator's "how do we test it" question: the live two-clone demo
(`scripts/demo-team.sh`, commit 3fb2c1d) and durable actor on lane signals
(`core/lanes/lib/signals.js`, commit e3d3776). Folded into G3/G2 respectively.

### [DECISION] 2026-07-10 — Hook change + fingerprints are explicit gates
Topics: pre-push, fingerprints, approval
Affects-phases: phase-30d-team-integration
Affects-specs: core/git-hooks/, adapters/*/
Detail: The `pre-push` reviewer≠author change is a hook-file change → needs the
operator's action-specific approval (memory). The recipe/Rule-15 changes
regenerate instructions → all 4 adapter fingerprints re-baseline with meta. Both
are called out in the plan so they aren't silent.

---
