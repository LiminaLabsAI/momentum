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

### [FEATURE] 2026-06-07 — Group 0 landed: schemas, layout doc, lib helpers
Topics: ecosystem, schema, lib, group-0
Affects-phases: phase-9-ecosystem-tier1
Affects-specs: core/ecosystem/schema/ecosystem.schema.json, core/ecosystem/schema/initiative.schema.json, core/ecosystem/layout.md, core/ecosystem/lib/index.js
Detail: Group 0 (contracts and on-disk layout) is complete. Wrote the two JSON Schemas (ecosystem manifest + initiative frontmatter), the on-disk layout reference doc, and a zero-dependency lib exposing findRoot/loadManifest/listMembers/findMember/validateManifest. validateManifest is a hand-rolled structural check that mirrors the JSON Schema; we keep momentum CLI dependency-free (no ajv/joi). Smoke-tested via inline node script: valid manifest accepted, malformed manifests yield typed-error lists; findRoot returns null outside an ecosystem. Existing 64-test suite green; no regressions.

---

### [FEATURE] 2026-06-07 — Group 1 landed: momentum ecosystem CLI
Topics: ecosystem, cli, init, add, remove, status, group-1
Affects-phases: phase-9-ecosystem-tier1
Affects-specs: bin/ecosystem.js, bin/momentum.js
Detail: `momentum ecosystem init/add/remove/status` shipped. init scaffolds a new ecosystem root (manifest, initiatives/, sessions/, .state/, README, .gitignore) and runs `git init` + initial commit. add registers a member, idempotent on re-run, injects a fenced one-line pointer into the target's CLAUDE.md/AGENTS.md, with pre-flight refusing non-momentum-installed targets. remove inverses both. status prints manifest + per-member git state; stderr from `git status` is now suppressed so non-git members show a clean "(not a git repo)" line. Verified end-to-end via tmpdir smoke test: init → add → idempotent re-add → status → remove cycle works; pointer block is correctly added/removed.

---

### [FEATURE] 2026-06-07 — Group 2 landed: initiative subsystem
Topics: ecosystem, initiatives, slash-commands, group-2
Affects-phases: phase-9-ecosystem-tier1
Affects-specs: core/commands/initiative.md, core/ecosystem/lib/initiative.js, core/ecosystem/templates/initiative-template.md
Detail: Initiative subsystem complete. `core/ecosystem/lib/initiative.js` exposes parseFrontmatter / serializeFrontmatter / validateFrontmatter (hand-rolled minimal YAML parser — single-level scalars + inline arrays; zero deps), nextInitiativeId, initiativePath, loadInitiative, writeInitiative, setActive, getActive, clearActive. The slash-command recipe (`core/commands/initiative.md`) defines create / status / close / list with one-question-at-a-time prompts. Template at `core/ecosystem/templates/initiative-template.md` enforces fixed sections (Why / Per-repo contributions / Linked decisions / Deploy chronology / Close).

---

### [FEATURE] 2026-06-07 — Group 4 landed: agent-facing slash-command surface
Topics: ecosystem, slash-commands, agent-surface, group-4
Affects-phases: phase-9-ecosystem-tier1
Affects-specs: core/commands/ecosystem.md, core/commands/session.md, core/commands/track.md
Detail: Group 4 ships three agent-facing recipes. `core/commands/ecosystem.md` documents the full `momentum ecosystem` CLI surface plus the on-disk model so an agent reading it cold knows how to discover an ecosystem root, query state, register/remove members, and read sessions/initiatives. `core/commands/session.md` documents `/session log` for narrative entries (auto-events still fire from the hook). `core/commands/track.md` gains a "Cross-repo backlog items" appendix pointing at `/initiative` for cross-repo features. No per-adapter overlays needed — all three recipes are agent-agnostic markdown and ride the existing `copyDir(core/commands → adapter destination)` paths in init/upgrade.

---

### [FEATURE] 2026-06-07 — Group 5 landed: 30+ new tests, 101/101 green
Topics: ecosystem, tests, group-5
Affects-phases: phase-9-ecosystem-tier1
Affects-specs: tests/ecosystem-cli.test.js, tests/ecosystem-initiative.test.js, tests/ecosystem-hook.test.js
Detail: Three new test files added covering Groups 0-3. ecosystem-cli.test.js (13 cases) covers validateManifest's error reporting (does-not-bail-on-first), findRoot's bounded walk + memoization (verified 5-parent ceiling), CLI init scaffolding, idempotent add, pre-flight pre-check, remove cleanup, status with/without active initiative banner, pointer inject/strip, sanitizeId. ecosystem-initiative.test.js (10 cases) covers the hand-rolled YAML frontmatter parse/serialize round-trip, validation including the "closed requires closed date" constraint, monotonic numbering, active state round-trip. ecosystem-hook.test.js (7 cases) covers session-append.sh end-to-end (first/subsequent writes, active-initiative header banner, orphan no-op) AND the upstream hook (commit detection via tool_input.command, phase-history reminder still works, non-significant edits silent). Test fixes: macOS /var → /private/var symlink handling (use path.resolve not realpathSync); explicit slug arg in init-overwrite test (mktmp basenames contain uppercase). Final tally: 101/101 (was 64; +37 new).

---

### [FEATURE] 2026-06-07 — Group 6 landed: architecture doc + README section
Topics: ecosystem, docs, group-6
Affects-phases: phase-9-ecosystem-tier1
Affects-specs: core/specs-templates/specs/architecture/ecosystem.md, README.md, specs/changelog/2026-06.md
Detail: Group 6 ships the architecture reference doc (`core/specs-templates/specs/architecture/ecosystem.md` — installed into every momentum project from v0.12.0) and the user-facing README section. The architecture doc captures: what an ecosystem is, on-disk layout, opt-in/out commands, initiative model + frontmatter shape, session log triggers, discovery via bounded walk-up, per-repo vs cross-repo file ownership, what's deferred to Tier 2, operator failure-mode playbook. README "Ecosystems" section ~50 lines with worked cerebrio example. The `/sync-docs` propagation + retrospective populate are deferred to `/complete-phase` per the standard convention.

---

### [FEATURE] 2026-06-07 — Group 3 landed: auto session-log via hook
Topics: ecosystem, session-log, hook, post-tool-use, group-3
Affects-phases: phase-9-ecosystem-tier1
Affects-specs: core/ecosystem/scripts/session-append.sh, core/scripts/check-history-reminder.sh, bin/momentum.js
Detail: Auto session-logging works end-to-end. session-append.sh (pure bash + python3 for JSON) locates the ecosystem root via bounded walk-up looking at sibling directories for ecosystem.json, resolves the member id by matching realpath($PWD) against manifest.members[].path, and atomically appends a one-line entry to sessions/YYYY-MM-DD.md. First write of the day prepends a header line plus the active initiative banner when set. The existing PostToolUse hook (check-history-reminder.sh) now reads tool_name + tool_input.command, detects `git commit` and `gh pr {merge,create}` Bash invocations, and invokes session-append. Init+upgrade both ship the helper alongside the hook. Smoke test: two consecutive commits in a registered member repo produce two appended lines under the correct header; running the hook outside any ecosystem is a silent no-op.

---
