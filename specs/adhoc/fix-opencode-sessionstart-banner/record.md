---
type: Ad-hoc Record
---

# Ad-hoc Work Record: fix-opencode-sessionstart-banner

> **Type**: quick-task
> **Created**: 2026-07-05
> **Branch**: fix/opencode-sessionstart-banner (lane `fix-opencode-sessionstart-banner`)
> **Backlog**: closes the Phase 22 sessionStartHook follow-up; closes FEAT-004 + FEAT-009 (bookkeeping); files ENH-058
> **Status**: shipped

## Current Behavior (bug)

The opencode plugin's handoff banner was wired to a named `"session.created"`
plugin hook key — which **never fires** on opencode 1.17.x. Phase 22 G5
correctly observed "banner not confirmed" and held `sessionStartHook: false`,
but attributed it to run-mode limitations. Post-phase probing found the real
cause: session events reach plugins ONLY through the generic `event` bus
handler (`event.type === "session.created"`). The shipped banner was dead
code on every surface (run, serve, TUI).

Probe evidence (live, opencode 1.17.13):
- Serve mode, file-logging probe with both hook shapes: `event:
  session.created` fired; the named `"session.created"` key never did.
- Run mode, event-only probe: plugin loads, ZERO events delivered, and the
  handler's **mere presence hangs `opencode run`** (session never completes;
  reproduced twice; removing the probe restores normal runs). `process.argv`
  inside the plugin includes `"run"`, so run-mode is detectable.

## Expected Behavior (this fix)

1. The banner rides the `event` bus, filtered to `session.created`.
2. Registration is **skipped in run-mode** (`process.argv.includes("run")`) —
   avoids the upstream hang, and a session-start banner is meaningless in
   non-interactive mode. Gate + reminder hooks remain active in run-mode.
3. `sessionStartHook` flips `false → true` on live evidence; capability
   matrix + parity matrix cells and footnotes updated (SessionStart handoff
   banner cell: shipped-degraded¹⁹ → shipped¹⁹; the two ecosystem cells stay
   degraded — ENH-058).
4. Bookkeeping: FEAT-004 + FEAT-009 (pre-existing "Adapter: OpenCode" items,
   one deferred + one open) closed as delivered by Phase 22 v0.28.0.

## Verification Evidence

All fresh, this session:

- **Live banner firing (the flip's evidence)**: `opencode serve` in a
  momentum-scaffolded project with `.momentum/inbox/handoff-001.md` pending;
  `POST /session` → serve output printed:
  `[momentum] 1 pending handoff(s) in .momentum/inbox/: handoff-001.md — run /continue (or \`momentum continue\`) to pick up.`
- **Run-mode unaffected**: `opencode run "Reply with exactly OK"` with the
  fixed plugin completes normally and printed `OK` (no hang; event handler
  absent by design).
- **Unit tests**: `tests/adapter-opencode-plugin.test.js` 9/9 — banner via
  the event bus (fires on `session.created`, silent on other events and
  empty inbox), dead named key asserted absent, run-mode gating asserted
  (no `event` handler; tool hooks still registered).
- **Fingerprint re-baselined** for the new plugin bytes (explicit
  MOMENTUM_RESNAPSHOT_OPENCODE opt-in); upgrade idempotence test green.
- Full suite green pre-landing — see the landing gate output.
