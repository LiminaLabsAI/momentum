# Phase 16: Codex & Antigravity Adapter Parity

> **Target Version**: v0.19.0
> **Status**: Not Started
> **Goal**: Bring the Codex and Antigravity adapters to genuine end-to-end parity with Claude Code, validated by live smoke runs — not declarations.

## Goal

When v0.19.0 ships, a user can `momentum init --agent codex` or `--agent antigravity` and get the same authored workflow experience as Claude Code: brainstorm-gate enforcement, SessionStart banners, history reminders, orchestration primitives, and ecosystem commands all behave the same way, with adapter-native mechanisms (Codex TOML subagents, Antigravity `.agents/` plugin layout) substituted only where the underlying tool requires it.

This phase trades phase-16's original "Reach" (Cursor + Gemini) plan for hardening the three adapters we already declare. Reach moves to Phase 17.

## Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Redirect Phase 16 from Reach → Adapter Parity | Yes | Claude Code is dogfooded daily; Codex/Antigravity untested. Hardening before reach. |
| Wire `brainstorm-gate.sh` PreToolUse for Codex | Yes | Codex shipped PreToolUse with identical schema post-Phase-7b; same script just works. |
| Ship momentum subagent TOMLs in `adapters/codex/agents/` | Yes | Closes `/review-code` parity (Claude uses Task subagents; Codex now has TOML subagents). |
| Flip Codex `parallelSubagents: true` after live evidence | Yes (gated) | Promote only after a 3-target dispatch smoke fans out via real Codex parallel mode. |
| Switch Antigravity convention from `.antigravity/` → `.agents/` | Yes | Matches documented `agy` plugin/project layout. Current path is invisible to `agy`. |
| Ship Antigravity `hooks.json` (PostToolUse + SessionStart if supported) | Yes | `agy` supports `hooks.json`; we currently ship none, so history reminder + handoff banner are dark. |
| Add destinations `agents/` + `skills/` to adapter contract | Additive | New overlay subdirs alongside existing `commands/` / `agent-rules/` / `scripts/` / `engines/`. Rule 10 additive — no ADR. |
| Introduce Adapter Parity Matrix as a separate doc | Yes | Capability matrix tracks adapter primitives; parity matrix tracks feature × adapter shipping status. Distinct concerns. |
| Add "hook actually fires" smoke layer | Yes | Existing tests prove installation; this layer proves execution by faking a tool event and asserting side effects. |
| Defer Cursor + Gemini to Phase 17 | Yes | FEAT-007 / FEAT-008 / ENH-009 all shift. Roadmap updated at completion via `/sync-docs`. |

## In Scope

1. Codex PreToolUse hook wired to `brainstorm-gate.sh`.
2. Codex subagent TOMLs in `adapters/codex/agents/` for `/review-code` roles (security, QA, architecture).
3. Codex `/review-code` overlay (currently Claude-Code-only).
4. Codex parallel dispatch live smoke; flip `parallelSubagents: true` on evidence.
5. Antigravity convention rewire: `.antigravity/` → `.agents/` everywhere (adapter destinations, AGENTS.md text, tests).
6. Antigravity `hooks.json` shipping `check-history-reminder.sh` PostToolUse and (if `agy` supports it) SessionStart handoff banner.
7. Antigravity `skills/` + `agents/` overlay directories populated to mirror Codex.
8. Adapter contract extension: `destinations.agents` + `destinations.skills` declared by every adapter.
9. Capability matrix refresh: `core/adapter-capabilities.md` + every `adapter.js` capability block re-audited against current vendor docs.
10. New `core/adapter-parity-matrix.md` mapping every momentum feature × every adapter to shipping status (shipped / shipped-degraded / not-applicable), enforced by audit test.
11. Hook-execution smoke harness: per-adapter test that fakes a `Write` tool event and asserts the matching hook would run.
12. Live dogfood pass: full `/brainstorm-phase → /start-phase → /complete-phase` cycle exercised on Codex CLI and `agy`; evidence captured in retrospective.

## Out of Scope (Non-Goals)

- Cursor (FEAT-007) and Gemini CLI (FEAT-008) adapters — Phase 17.
- ENH-009 distribution decision — still gated on extra adapters, Phase 17.
- Codex `browser` / `computerUse` capabilities — separate research drop.
- Antigravity custom per-project slash commands — ship as AGENTS.md NL recipes; revisit if `agy` docs confirm a custom-slash surface later.
- Antigravity Managed Agents tier / SDK integration — separate workstream.
- Self-learning hooks, retrospective-driven rule evolution — Phase 17 / 18.
- Tier 2 ecosystem features — Phase 18.
- Any core command rewrite — parity is achieved by wiring + adapter additions, not by changing core.

## Deliverables

| # | Deliverable | Verification |
|---|---|---|
| D1 | Codex PreToolUse + PostToolUse + SessionStart hooks installed and proven to fire | `node --test tests/adapter-hook-execution-codex.test.js` |
| D2 | Codex subagent TOMLs ship and install to `.codex/agents/` | `node --test tests/adapter-subagents-codex.test.js` |
| D3 | Codex parallel dispatch smoke + `parallelSubagents: true` flip | `node --test tests/adapter-parallel-dispatch-codex.test.js` + retrospective evidence |
| D4 | Codex `/review-code` overlay shipping | extended `tests/adapter-smoke-codex.test.js` |
| D5 | Antigravity uses `.agents/` paths; `.antigravity/` removed | updated `tests/adapter-smoke-antigravity.test.js` |
| D6 | Antigravity `hooks.json` ships and wires history reminder + handoff banner | `node --test tests/adapter-hook-execution-antigravity.test.js` |
| D7 | Antigravity `skills/` + `agents/` directories shipped | `node --test tests/adapter-subagents-antigravity.test.js` |
| D8 | Capability matrix doc + every `adapter.js` declaration refreshed | `node --test tests/adapter-capabilities-declared.test.js` (extended assertions) |
| D9 | Adapter Parity Matrix doc + audit test | `node --test tests/adapter-parity-matrix.test.js` |
| D10 | Live dogfood evidence (Codex CLI + `agy`) captured in retrospective | `retrospective.md` "Verification Evidence" section per Rule 12 |
| D11 | No regressions | `npm test` — ≥288 tests still pass |

## Acceptance Criteria

1. Every test in D1–D9 passes locally and in CI.
2. `npm test` shows zero regressions vs the v0.18.0 baseline.
3. Parity Matrix shows ≥95% of momentum features marked `shipped` or `shipped-degraded` on Codex and Antigravity; any residual gap is documented in the adapter's `roadmap` block, not silent.
4. `retrospective.md` contains terminal-capture evidence of `/brainstorm-phase`, `/start-phase`, `/sync-docs`, `/complete-phase` executed on both Codex CLI and `agy`.
5. No regression on Claude Code: every existing Claude-Code-only test still passes.
6. ENH-023 + ENH-024 roadmap footnotes either resolved or explicitly re-justified against today's vendor docs.

## Reference Documents

Vendor sources reviewed during brainstorm (2026-06-11):

- Codex Hooks — <https://developers.openai.com/codex/hooks>
- Codex Subagents — <https://developers.openai.com/codex/subagents>
- Codex Agent Skills — <https://developers.openai.com/codex/skills>
- Codex AGENTS.md guide — <https://developers.openai.com/codex/guides/agents-md>
- Build with Google Antigravity — <https://developers.googleblog.com/build-with-google-antigravity-our-new-agentic-development-platform/>
- Antigravity 2.0 deep dive — <https://nerdleveltech.com/google-antigravity-2-agentic-coding-platform>
- Antigravity CLI (`agy`) first look — <https://antigravitylab.net/en/articles/antigravity/antigravity-cli-agy-setup-and-slash-commands-getting-started>
