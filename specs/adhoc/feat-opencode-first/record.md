---
type: Ad-hoc Record
---

# Ad-hoc Work Record: feat-opencode-first

> **Type**: quick-task
> **Created**: 2026-07-05 (completed 2026-07-06)
> **Branch**: feat/opencode-first (lane `feat-opencode-first`)
> **Backlog**: closes ENH-058; operator directive "opencode first everywhere"
> **Status**: shipped

## Scope

Two bounded units:

1. **ENH-058 — close opencode's last degraded parity cells.** The plugin now
   delegates to the same installed shell scripts every other adapter wires:
   - `event` (session.created) → `scripts/sessionstart-handoff.sh`: prints
     the ecosystem context banner AND the handoff inbox banner (house
     format); pure-JS handoff fallback kept for scriptless installs.
   - `tool.execute.after` (bash) → `scripts/check-history-reminder.sh` with
     the canonical `{tool_name: "Bash", tool_input: {command}}` payload:
     bash-side history reminders plus the ecosystem session log
     (commit / pr events). Bash commands correlate via callID (captured at
     before-time), mirroring the write-tools fix from Phase 22.
   Both scripts self-guard (no-op outside ecosystems); spawns are bounded
   (3s timeout) and fail-open.

2. **opencode listed first on every adapter surface** (operator directive —
   placement only, no added copy): README quickstart + agents table; site
   landing agent chips (new opencode chip, live-status dot); site
   ide-support (new full opencode section + table row, placed first;
   Antigravity status refreshed to Available per the 22b release);
   getting-started / faq / about / orchestration / rules enumerations;
   capability matrix + parity matrix column order (12 + 56 rows); CLI
   usage example.

## Verification Evidence

All fresh, this session:

- **Live ecosystem banner**: `momentum init --agent opencode --ecosystem
  live-eco` scaffold; `opencode serve` + `POST /session` printed
  `▸ Ecosystem: live-eco (1 member)` + the pending-handoff banner —
  the real script's output through the plugin's event handler.
- **Live session log**: a real opencode agent ran
  `git commit --allow-empty -m 'feat: live session-log probe'` via the bash
  tool; `<eco>/sessions/2026-07-05.md` gained
  `19:31Z [app] commit: feat: live session-log probe (bc3e87d)`.
- **Unit tests**: plugin suite grew 9 → 13 (script delegation with payload
  capture via stub scripts; silent-script no-double-fire; script-absent
  no-op fallbacks). Fingerprint re-baselined (explicit opt-in).
- **Site build green**: 12 pages, dist content gate passed (min body
  5907 chars) after the landing chip + ide-support section.
- **Matrix audit tests green** after the column reorder (12/12 — header
  parsing is name-based, order-agnostic by design).
- Full suite green pre-landing — see the landing gate output.

## Notes

- Parity matrix: the last two `shipped-degraded¹⁹` cells (SessionStart
  ecosystem banner, Auto session log) promoted to `shipped¹⁹` — opencode's
  column now carries no degraded cells at all.
- The Cursor/Gemini "Phase 14/19" staleness on the site was corrected only
  where touched (getting-started line); a full site copy-audit stays with
  the site lane.
