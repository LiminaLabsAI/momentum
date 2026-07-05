---
type: Decision
---

# ADR-0006: Antigravity canonical root `.agents/` + payload-adapter hook shim

> **Status**: Accepted (2026-07-05, Phase 22b G1)
> **Context**: Phase 22b Antigravity 2.0 Full Adoption — evidence at
> `specs/phases/phase-22b-antigravity-2-adoption/evidence/fact-sheet.md`

## Context

Phase 16 shipped a split layout — workflows/engines at `.agent/` (singular),
skills/hooks at `.agents/` (plural) — because vendor sources conflicted and no
runtime existed to test against. Phase 22b's G0 probes against `agy` 1.0.16
established (fact-sheet §1): Antigravity accepts FOUR customization-root
spellings (`.agents/`, `.agent/`, `_agents/`, `_agent/`) and discovers all of
them, so the split "works" — but every vendor example, the builtin reference
docs, and the plugin layout use **`.agents/`**.

G0 also locked the real hooks contract (fact-sheet §5), which differs from what
momentum ships in four ways: named-group schema; five events with NO
SessionStart (PreInvocation + `injectSteps` is the session-start mechanism);
commands run with CWD = the hooks.json directory; PreToolUse responses are
stdout JSON `{"decision": …}` with mandatory exit 0 (not exit-code semantics).
PostToolUse output is `{}` — it has NO message channel to the model.

## Decision

1. **Canonical root**: all Antigravity destinations consolidate under
   `.agents/` — workflows, engines, skills, hooks, (future) plugins. The
   legacy `.agent/` files are removed on upgrade by the existing Phase 20
   orphan-cleanup machinery (user-owned files keep their shield).
2. **One payload-adapter shim, three unchanged core scripts**:
   `core/scripts/antigravity-hook-adapter.sh` translates Antigravity's
   camelCase payloads/responses at the boundary and delegates to the existing
   shared scripts, so Claude Code and Codex behavior stays byte-identical:
   - `pre-tool` → translate → `brainstorm-gate.sh` → exit-2/stderr mapped to
     `{"decision":"deny","reason"}`; exit-0 mapped to `{"decision":"allow"}`.
   - `post-tool` → translate → `check-history-reminder.sh` → stdout reminders
     QUEUED to `.momentum/antigravity-notices` (PostToolUse cannot message the
     model), respond `{}`.
   - `pre-invocation` → at `invocationNum == 0` run `sessionstart-handoff.sh`
     (banner mode) AND always drain queued notices → respond
     `{"injectSteps":[{"ephemeralMessage": …}]}` (or `{}`).
3. **Relative hook commands** (`bash ../scripts/antigravity-hook-adapter.sh …`)
   — resolved from `.agents/` per the locked CWD rule. No install-time
   absolute-path templating, no per-machine content.
4. **`sessionStartHook` capability stays `false`** until the PreInvocation
   injection round-trip is verified live (blocked by the intermittent vendor
   hang, ENH-052); the roadmap note now states the verified plan instead of a
   guess.

## Consequences

- Simpler mental model and docs; layout matches every vendor example.
- Upgrade migration is automatic (orphan cleanup) — no bespoke migration code.
- The shim isolates ALL vendor payload knowledge in one file; future vendor
  contract changes touch one script.
- Reminders reach the model one invocation later than on Claude Code (queued
  through PreInvocation) — the native mechanism's constraint, documented in
  the surfaces fragment.

## Alternatives rejected

- **Keep the split** (works today): perpetuates an accident; two roots to
  document/test forever.
- **Branch antigravity logic inside each core script**: three scripts × vendor
  contract = smeared knowledge; the shim keeps zero-regression trivially
  provable for the other adapters.
- **Absolute-path templating for hook commands**: unnecessary given the locked
  CWD rule; creates per-machine file content and upgrade churn (and the
  VAL-002 rejection showed where hardcoded paths lead).
