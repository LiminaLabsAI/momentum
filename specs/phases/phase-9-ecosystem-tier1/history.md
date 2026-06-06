# Phase 9 — Ecosystem (Tier 1): Implementation History

> Append-only log. Do NOT edit existing entries.

## Entry Types

| Type | When to use |
|------|-------------|
| [DECISION] | ADR created, technology choice made |
| [SCOPE_CHANGE] | Phase deliverables added or removed |
| [DISCOVERY] | Bug, tech debt, or enhancement found |
| [FEATURE] | New planned feature |
| [ARCH_CHANGE] | Architectural pattern changed |
| [EVALUATOR] | Locked evaluator defined or evaluation set changed |
| [NOTE] | Anything else worth recording |

## Entries

### [DECISION] 2026-06-07 — Ecosystem layer as additive parallel module
Topics: ecosystem, multi-repo, additive-design
Affects-phases: phase-9-ecosystem-tier1
Affects-specs: specs/phases/phase-9-ecosystem-tier1/overview.md
Detail: After reviewing a full multi-repo session that bounced across sapience/frontend/infra (cerebrio Memory module v1 shipping), confirmed momentum's single-repo model loses context at every directory switch. Designed an ecosystem layer that strictly adds — never writes into a member's `specs/`. Single-repo momentum continues to work identically when no ecosystem root is present.

---

### [DECISION] 2026-06-07 — Ecosystem state lives in a separate git repo
Topics: ecosystem, versioning, portability
Affects-phases: phase-9-ecosystem-tier1
Affects-specs: specs/phases/phase-9-ecosystem-tier1/overview.md
Detail: User-confirmed: ecosystem.json + initiatives/ + sessions/ live in their own sibling repo (e.g. `cerebrio-ecosystem/`). Trade-off accepted: one more repo on the constellation in exchange for PR-reviewable initiatives, portable session history, and lifecycle independence from any single member. Alternatives considered: unversioned local dir (loses portability), nesting inside one member repo (couples lifecycle and obscures intent).

---

### [DECISION] 2026-06-07 — Auto-log session events from PostToolUse hook
Topics: ecosystem, session-log, hook, automation
Affects-phases: phase-9-ecosystem-tier1
Affects-specs: specs/phases/phase-9-ecosystem-tier1/plan.md
Detail: User-confirmed: zero-discipline auto-logging beats explicit `/session log` calls for completeness. Existing `core/scripts/check-history-reminder.sh` hook will be extended to detect commits/PRs/deploys and append one line to today's session file. Hook self-locates the ecosystem root via bounded upward walk (max 5 parents) with caching. Explicit `/session log` still exists for narrative entries; the two coexist.

---

### [DECISION] 2026-06-07 — `momentum ecosystem add <repo-path>` for opt-in
Topics: ecosystem, opt-in, cli
Affects-phases: phase-9-ecosystem-tier1
Affects-specs: specs/phases/phase-9-ecosystem-tier1/plan.md
Detail: User-confirmed: symmetric-with-`momentum init` CLI command rather than manual JSON edit or auto-detect. Writes the member into `ecosystem.json` AND injects a one-line fenced pointer in the target's CLAUDE.md so child-repo readers see the ecosystem context. Idempotent; `remove` reverses both writes.

---

### [DECISION] 2026-06-07 — Slot as Phase 9; renumber existing Phase 9 → 10
Topics: ecosystem, roadmap, phase-numbering
Affects-phases: phase-9-ecosystem-tier1, phase-10-hardening-activation
Affects-specs: specs/status.md, specs/planning/roadmap.md
Detail: Existing Phase 9 (Hardening & Activation, status "in-progress 0%, planning active") is renumbered to Phase 10 (target v0.13.0). Ecosystem (Tier 1) takes the Phase 9 slot at target v0.12.0. Phase 10 onward each shift by one release. Rationale: ecosystem is the next thing momentum ships given the multi-repo pain demonstrated in the originating session; Hardening was not yet started so the rename has zero implementation cost.

---

### [SCOPE_CHANGE] 2026-06-07 — Tier 2 features explicitly deferred
Topics: ecosystem, scope, tier-2
Affects-phases: phase-9-ecosystem-tier1
Affects-specs: specs/phases/phase-9-ecosystem-tier1/overview.md
Detail: Following Tier 1 features moved to a future phase (Tier 2): `/switch-repo` with carry-over context, federated impact-map, cross-repo `/sync-docs`, shared rules of record, deploy-order awareness, multi-repo `/review-code`, inter-repo parallel agent orchestration. Tier 1 ships the foundational primitives (manifest, initiatives, session log, /track aggregation) that everything else attaches to.

---

### [NOTE] 2026-06-07 — Proving ground = cerebrio constellation
Topics: ecosystem, dogfooding
Affects-phases: phase-9-ecosystem-tier1
Affects-specs: none
Detail: The cerebrio constellation (cerebrio-sapience, cerebrio-frontend, cerebrio-infra, open-guard, open-shield-python, cerebrio-py, cerebrio-cli, cerebrio-bench) will dogfood this phase. The hand-maintained `cerebrio/CLAUDE.md` parent file becomes a thin shell pointing at the ecosystem manifest. The originating session (Memory module v1 shipping, 2026-06-05 to 2026-06-06) becomes initiative 0001 retroactively.

---
