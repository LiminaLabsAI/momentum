---
type: Impact Map
title: Decision Impact Map
description: "Topic keywords → spec files/sections, consumed by /sync-docs."
---

# Impact Map

Maps topic keywords to the spec files/sections they affect. Used by
`/sync-docs` to find documents needing updates when a phase history
entry carries matching `Topics:`.

| Topic | File | Section |
|-------|------|---------|
| install | specs/planning/roadmap.md | Timeline |
| install | specs/status.md | Summary |
| distribution | specs/planning/roadmap.md | Phase 1 |
| template | specs/status.md | Summary |
| template | specs/phases/phase-0-bootstrap/tasks.md | Group 1 |
| adapter | specs/planning/roadmap.md | Timeline |
| adapter | README.md | Adapter Authors |
| contract | README.md | Adapter Authors |
| overlay | README.md | Adapter Authors |
| overlay | specs/phases/phase-6-overlay-and-verify/plan.md | Group 0 |
| verification | specs/phases/phase-6-overlay-and-verify/plan.md | Group 1 |
| verification | specs/planning/roadmap.md | Timeline |
| rules | README.md | Autonomous Agent Rules |
| rules | specs/planning/roadmap.md | Timeline |
| claude-md | README.md | What You Get |
| upgrade | specs/planning/roadmap.md | Timeline |
| marker | specs/planning/roadmap.md | Phase 5 |
| project-name | specs/backlog/backlog.md | Enhancements |
| FEAT-012 | specs/backlog/backlog.md | Features |
| FEAT-013 | specs/backlog/backlog.md | Features |
| FEAT-014 | specs/backlog/backlog.md | Features |
| ENH-014 | specs/backlog/backlog.md | Enhancements |
| ENH-015 | specs/backlog/backlog.md | Enhancements |
| ENH-016 | specs/backlog/backlog.md | Enhancements |
| ENH-017 | specs/backlog/backlog.md | Enhancements |
| /review-code | specs/phases/phase-6-overlay-and-verify/plan.md | Group 2 |
| adapter-overlay | README.md | Adapter Authors |
| phase-6 | specs/status.md | Active Phase |
| phase-6 | specs/planning/roadmap.md | Timeline |
| phase-7 | specs/planning/roadmap.md | Timeline |
| phase-8 | specs/planning/roadmap.md | Timeline |
| phase-9 | specs/planning/roadmap.md | Timeline |
| phase-10 | specs/planning/roadmap.md | Timeline |
| phase-10 | specs/phases/phase-10-ecosystem-activation/overview.md |  |
| phase-11 | specs/planning/roadmap.md | Timeline |
| phase-11 | specs/planning/phase-11-orchestration-handover.md |  |
| join | bin/state-commands.js |  |
| join | README.md | Ecosystem quickstart |
| leave | bin/state-commands.js |  |
| leave | README.md | Ecosystem quickstart |
| doctor | bin/state-commands.js |  |
| doctor | README.md | Diagnosing state |
| state-machine | core/ecosystem/lib/state.js |  |
| sibling-walk | core/ecosystem/lib/state.js | findRegistration |
| sibling-walk | bin/ecosystem.js | resolveEcosystemRoot |
| max-parent-walk | core/ecosystem/lib/state.js | getMaxParentWalk |
| max-parent-walk | core/ecosystem/lib/index.js | resolveMaxParentWalk |
| max-parent-walk | core/ecosystem/scripts/session-append.sh | find_ecosystem_root |
| max-parent-walk | core/ecosystem/layout.md | Discovery & limits |
| adapter-capabilities | core/adapter-capabilities.md |  |
| init-ecosystem | bin/momentum.js | scaffoldEcosystemAndJoin |
| init-ecosystem | README.md | Ecosystem quickstart |
| auto-detect | bin/momentum.js | maybePromptForAutoEcosystem |
| single-project-invariant | tests/single-project-unchanged.test.js |  |
| single-project-invariant | README.md | Single-project quickstart |
| roadmap | specs/planning/roadmap.md | Timeline |
| scope | specs/status.md | Active Phase |
| deferrals | specs/planning/roadmap.md | Timeline |
| naming | specs/planning/roadmap.md | Timeline |
| TDD | specs/planning/roadmap.md | Phase 7 |
| agent-rules | README.md | What You Get |
| migration | specs/planning/roadmap.md | Phase 5 |
| commands | README.md | Commands |
| execution | specs/planning/roadmap.md | Phase 7 |
| ecosystem | specs/planning/roadmap.md | Timeline |
| ecosystem | README.md | Ecosystems |
| ecosystem | core/specs-templates/specs/architecture/ecosystem.md | What an ecosystem is |
| multi-repo | README.md | Ecosystems |
| multi-repo | core/specs-templates/specs/architecture/ecosystem.md | What an ecosystem is |
| cross-repo | core/specs-templates/specs/architecture/ecosystem.md | What stays per-repo (unchanged) |
| cross-repo | README.md | Ecosystems |
| initiative | core/specs-templates/specs/architecture/ecosystem.md | Initiatives |
| initiative | core/commands/initiative.md | Subcommands |
| session-log | core/specs-templates/specs/architecture/ecosystem.md | Session log |
| session-log | core/commands/session.md | Usage |
| manifest | core/specs-templates/specs/architecture/ecosystem.md | Layout |
| manifest | core/ecosystem/schema/ecosystem.schema.json |  |
| post-tool-use-hook | core/specs-templates/specs/architecture/ecosystem.md | Session log |
| post-tool-use-hook | core/scripts/check-history-reminder.sh |  |
| tier-1 | core/specs-templates/specs/architecture/ecosystem.md | What's NOT in Tier 1 |
| concurrent-workstreams | specs/planning/platform-parallel-lanes.md |  |
| concurrent-workstreams | specs/planning/roadmap.md | Timeline |
| concurrent-workstreams | specs/status.md | Active Phase |
| concurrent-workstreams | specs/decisions/0001-concurrent-workstreams.md |  |
| lanes | specs/planning/platform-parallel-lanes.md |  |
| lanes | specs/backlog/backlog.md | Features |
| merge-discipline | CLAUDE.md | Rule 6: Git Lifecycle |
| merge-discipline | specs/decisions/0001-concurrent-workstreams.md |  |
| site-docs | site/src/content/docs/ |  |
| site-docs | README.md |  |
| tier-2 | core/specs-templates/specs/architecture/ecosystem.md | What's NOT in Tier 1 |
| tier-2 | specs/planning/roadmap.md | Timeline |
| instructions | specs/decisions/0004-single-source-instruction-generation.md | Decision |
| instructions | specs/status.md | Summary |
| opencode-adapter | core/adapter-capabilities.md | Matrix |
| opencode-adapter | core/adapter-parity-matrix.md | (all) |
| opencode-adapter | specs/planning/roadmap.md | Timeline |
| opencode-adapter | README.md | Adapter Authors |
| reach | specs/planning/roadmap.md | Timeline |
| adapter-contract | README.md | Adapter Authors |
| adapter-contract | core/adapter-parity-matrix.md | (all) |
| capability-flips | core/adapter-capabilities.md | Matrix |
| validation | specs/backlog/backlog.md | Validation (post-release follow-ups) |
| tracking-drift | specs/planning/roadmap.md | Timeline |
| tracking-drift | specs/status.md | Summary |
| skills | core/adapter-capabilities.md | Matrix |
| antigravity | core/adapter-capabilities.md | Antigravity |
| antigravity | core/adapter-parity-matrix.md | (all) |
| antigravity | specs/backlog/backlog.md | Validation (post-release follow-ups) |
| gemini | specs/planning/roadmap.md | Timeline |
| gemini | specs/backlog/backlog.md | Features |
| lifecycle | core/project-lifecycle.md |  |
| lifecycle | specs/decisions/0008-foundation-docs-authored-not-scaffolded.md |  |
| foundation-docs | core/project-lifecycle.md |  |
| foundation-docs | core/commands/start-project.md |  |
| foundation-docs | specs/backlog/backlog.md | Enhancements |
| founding | core/project-lifecycle.md |  |
| founding | specs/planning/roadmap.md | Timeline |
| start-project | core/commands/start-project.md |  |
| init-templates | core/specs-templates/specs/status.md |  |
| upgrade-migration | specs/decisions/0008-foundation-docs-authored-not-scaffolded.md | Key design points |
| preferences | core/preferences.js |  |
| preferences | core/commands/start-project.md |  |
| preferences | core/commands/start-phase.md |  |
| preferences | core/commands/complete-phase.md |  |
| preferences | core/commands/brainstorm-idea.md |  |
| preferences | core/commands/brainstorm-phase.md |  |
| preferences | core/commands/validate.md |  |
| trust-layer | specs/decisions/0009-trust-layer-invariant-mechanisms-preferences.md |  |
| trust-layer | core/git-hooks/contract.js |  |
| end-state | core/commands/start-phase.md | Autonomous Execution Contract |
| end-state | core/commands/complete-phase.md | Release |
| branch-flow | core/commands/complete-phase.md | Release |
| branch-flow | core/git-hooks/pre-push.sh |  |
| protected-branches | core/git-hooks/contract.js | protectedBranches |
| protected-branches | core/git-hooks/pre-push.sh |  |
| forge-aware | core/commands/start-phase.md |  |
| forge-aware | core/commands/complete-phase.md |  |
| merge-gate | specs/decisions/0009-trust-layer-invariant-mechanisms-preferences.md |  |
