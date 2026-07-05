---
type: Phase History
---

# Phase 15 — Ecosystem Agent Discoverability: History

> Append-only log of meaningful decisions, discoveries, scope changes,
> architecture changes, and noteworthy events during this phase.
> Format: see `core/agent-rules/project.md` Rule 8.

---

### [SCOPE_CHANGE] 2026-06-08 — Phase 15 inserted between Phase 14 and (former) Phase 15 Reach
Topics: roadmap, ecosystem, orchestration, discoverability
Affects-phases: phase-15-ecosystem-discoverability, phase-16-reach
Affects-specs: specs/planning/roadmap.md, specs/status.md, specs/phases/README.md, specs/phases/index.json
Detail: Real-world multi-repo dogfood session in the cerebrio ecosystem surfaced that agents don't reach for the orchestration primitives by default — root cause is discoverability (no managed CLAUDE.md at ecosystem root; info-only pointer block; no SessionStart context; degraded-mode silence on dispatch CLI; unshipped `initiative create` CLI). User requested fix before continuing to Reach (Cursor/Gemini adapters). Reach renumbered to Phase 16, Intelligence to 17, Platform to 18.

---

### [DECISION] 2026-06-08 — Managed ecosystem CLAUDE.md uses `## Project Extensions` marker
Topics: ecosystem, claude-md, upgrade-safety
Affects-phases: phase-15-ecosystem-discoverability
Affects-specs: core/ecosystem/templates/ecosystem-claude.md (new), bin/ecosystem.js
Detail: Chose to mirror the single-repo CLAUDE.md marker contract (`## Project Extensions`) for the new ecosystem-root CLAUDE.md. This means future `momentum upgrade` calls can refresh the managed prefix while preserving any user-added project extensions below the marker. Rejected alternative: separate `MANAGED.md` file — would split agent attention across two surfaces, defeating the discoverability goal. Wrote both `CLAUDE.md` and `AGENTS.md` (sibling templates with identical text) so the ecosystem root has the right surface regardless of which adapter the consuming agents use — we don't know that at ecosystem-init time.

---

### [DECISION] 2026-06-08 — Pointer block versioned (`v=2`); auto-migrates older blocks in place
Topics: ecosystem, pointer-block, migration
Affects-phases: phase-15-ecosystem-discoverability
Affects-specs: core/ecosystem/lib/pointer.js
Detail: Added `POINTER_VERSION = 2` constant; BEGIN sentinel now carries `<!-- ecosystem:begin v=2 -->`. `ensurePointerInjected` checks the version stamp and rewrites the block contents in place when stale (preserves surrounding file content). Rejected alternative: leave existing members untouched until `momentum ecosystem remove && add` cycled. Decided: silent in-place migration on next `add` invocation against the member is cheaper and more reliable than relying on users to cycle.

---

### [DECISION] 2026-06-08 — Dispatch CLI degraded-mode notice is a `note` event emitted BEFORE `started`
Topics: orchestration, dispatch, cli-degradation
Affects-phases: phase-15-ecosystem-discoverability
Affects-specs: core/orchestration/dispatch.js
Detail: Chose to surface the "CLI mode keyword-only" notice via the existing emitter `note` event channel rather than a stdout `console.log` direct write. Reason: the event renderer already wires to stdout in CLI mode and is silenced in agent-record mode (`opts.record`) — using the same channel keeps the message appearing where it's relevant and absent where it's noise. Placed BEFORE the `started` event so it's the literal first user-visible output line.

---

### [FEATURE] 2026-06-08 — `momentum ecosystem initiative create <slug>` ships as CLI subcommand
Topics: ecosystem, initiative, cli
Affects-phases: phase-15-ecosystem-discoverability
Affects-specs: bin/ecosystem.js, core/commands/initiative.md (description sync)
Detail: Promised in Phase 9 ("coming with Group 2 of Phase 9"); never actually shipped. Wired to existing `core/ecosystem/lib/initiative.js`. Non-interactive (flag-driven: `--why`, `--repos`, `--owner`) so it works from any agent context without prompting. Slash-command door (`/initiative create`) still works the same way and shares the lib.

---
