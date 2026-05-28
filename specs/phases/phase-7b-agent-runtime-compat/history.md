# Phase 7b — Agent Runtime Compatibility: Implementation History

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

### [SCOPE_CHANGE] 2026-05-28 — Phase 7b reshaped around agent runtime compatibility
Topics: phase-7b, codex, adapter-contract, compatibility
Affects-phases: phase-7b-agent-runtime-compat, phase-7c (downstream), phase-8 (downstream)
Affects-specs: specs/planning/roadmap.md, specs/status.md, specs/backlog/backlog.md
Detail: User clarified that momentum must prove its agent-agnostic architecture before deeper autonomous execution. Phase 7b is now Adapter Contract v3 plus Codex adapter MVP. Original 7b deliverables (autonomous execution, TDD Rule 13, retry budget) move to the next phase so they can be built on a real multi-agent foundation.

---

### [DECISION] 2026-05-28 — Claude Code support is read/classify/test, not rewrite
Topics: claude-code, codex, adapter-boundary
Affects-phases: phase-7b-agent-runtime-compat
Affects-specs: none
Detail: Claude-specific files such as `CLAUDE.md`, `.claude/commands/`, `.claude/settings.json`, hooks, and `/review-code` stay Claude-specific. Phase 7b may inspect them to define the adapter contract and add regression tests, but Codex compatibility must not dilute or relocate Claude-only capabilities.

---

### [FEATURE] 2026-05-28 — Adapter Contract v3 defined for runtime surfaces
Topics: adapter-contract-v3, codex, claude-code, runtime-surface
Affects-phases: phase-7b-agent-runtime-compat
Affects-specs: README.md#adapter-authors
Detail: Adapter Contract v3 extends the overlay model with runtime metadata: display name, destinations, primary instruction file, config/hook files, and capability flags. This keeps core generic while allowing Claude Code and Codex to expose their native instruction, command, and hook surfaces independently.

---

### [FEATURE] 2026-05-28 — CLI supports adapter-declared root instruction files
Topics: cli, adapter-contract-v3, primary-instruction, claude-code
Affects-phases: phase-7b-agent-runtime-compat
Affects-specs: bin/momentum.js
Detail: CLI agent discovery is now dynamic from `adapters/*/adapter.js`, and adapters can declare a marker-aware root instruction file. Claude Code now installs/upgrades `CLAUDE.md` through adapter metadata while preserving the existing file content and behavior. Verification: `node --test --test-concurrency=1 tests/install.test.js tests/upgrade.test.js tests/overlay.test.js` passed 16/16.

---

### [FEATURE] 2026-05-28 — Codex adapter MVP added
Topics: codex, agents-md, hooks, command-recipes
Affects-phases: phase-7b-agent-runtime-compat
Affects-specs: adapters/codex/adapter.js, adapters/codex/instructions/AGENTS.md, adapters/codex/hooks.json
Detail: Added `adapters/codex/` with `AGENTS.md` as the primary instruction surface, `.codex/hooks.json` for Codex hook wiring, and `.codex/commands/` as the destination for generic momentum command recipes. Claude Code remains untouched except for regression-tested adapter metadata.

---

### [DISCOVERY] 2026-05-28 — BUG-003: AppleDouble sidecars leaked into installs
Topics: bug-003, appledouble, install, copydir
Affects-phases: phase-7b-agent-runtime-compat
Affects-specs: specs/backlog/backlog.md
Detail: Codex install smoke revealed `copyDir()` was copying macOS `._*` sidecar files into target projects. Added BUG-003 to backlog and fixed it by skipping `._*` and `.DS_Store` in both directory copy and file-walk helpers. Verification: Codex fresh install exits 0 and `find <target> -name '._*'` returns no files.

---
