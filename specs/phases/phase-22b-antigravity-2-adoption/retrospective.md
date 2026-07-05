---
type: Retrospective
---

# Phase 22b Retrospective — Antigravity 2.0 Full Adoption

> **Completed on lane**: 2026-07-05 (single session, ~4.5h wall clock)
> **Branch**: `phase-22b-antigravity-2-adoption` · **Target**: v0.28.0
> **Landing/release**: pending operator approval (Rule 6 hard gate)

## What shipped

Rebuilt the Antigravity adapter against the real, shipping 2.x surface
(IDE 2.1.1 · `agy` CLI 1.0.16 — released three days before this phase ·
SDK 0.1.5), evidence-first. VAL-002 resolved after 20 days blocked.

- **G0** — Live-probe evidence lock: committed fact sheet pinned to agy
  1.0.16; vendor reference docs archived verbatim (shipped on disk inside the
  CLI's builtin `agy-customizations` skill — the decisive find); captured
  hook payloads for all five events; all six VAL-002 questions answered.
- **G1** — Realignment (ADR-0006): canonical `.agents/` root (legacy
  `.agent/` orphan-cleaned on upgrade); vendor named-group hooks.json over
  the real five events; boundary shim `antigravity-hook-adapter.sh`
  translates camelCase payloads → shared core scripts (byte-identical for
  Claude Code/Codex — capture tool: "no change") and emits decision JSON;
  handoff banner via PreInvocation `ephemeralMessage` at `invocationNum 0`
  with a notice queue for PostToolUse reminders.
- **G2** — Spawn on real flags: detached `agy --new-project
  --dangerously-skip-permissions --print-timeout <bound> -p <boot prompt>`
  from `repoPath`, per-repo supervisor log, synchronous missing-binary
  detection. Live smoke: BOOT-OK.
- **G3** — Native surfaces: `momentum antigravity plugin-pack [--global]`
  (live `agy plugin validate` → [ok]); `momentum doctor` advisory (official
  installer, never provisions); reviewer-subagent-defs deliverable DROPPED
  per evidence — no such vendor surface exists ([SCOPE_CHANGE]).
- **G4** — Truth-sync: capabilities/parity/swarm docs carry only evidenced
  claims; VAL-002 resolved; ENH-051 closed-superseded; FEAT-008 closure
  recommended (Gemini CLI sunsetted 2026-06-18); ENH-054 (vendor hang) +
  ENH-055 (deferred surfaces) filed.

## Verification Evidence

Fresh outputs, this session (2026-07-05):

```
$ npm test                                  # after G4, lane worktree
ℹ tests 745
ℹ pass 745
ℹ fail 0                                    # 733 baseline → 745 (+12 net)

$ node scripts/capture-fingerprints.js      # zero-regression proof
=== claude-code === no change
=== codex ===       no change
=== antigravity === re-baselined deliberately (G1 layout; G3 plugin docs)

$ agy --version
1.0.16

# G0 hook fire (probe-03): all five events captured — evidence/hook-captures/
# PreToolUse payload: {"toolCall":{"name":"write_to_file","args":{"TargetFile":…}}}

# G2 live spawn smoke (evidence/spawn-smoke.md):
{"repoId":"smoke-repo","status":0,"detail":"launched pid 68529 (log: …)"}
log content: BOOT-OK

# G3 live plugin validation (evidence/plugin-pack.md):
$ agy plugin validate …/plugins/momentum
[ok]  ✔ skills : 5 processed

$ grep -ri "no CLI exists|no standalone|IDE-only product" core/ docs/ README.md
(empty)
```

## Acceptance criteria — all six met

1. ✅ Six VAL-002 questions answered with agy 1.0.16 runtime evidence (fact-sheet §8).
2. ✅ PreToolUse + PostToolUse + PreInvocation fire-verified with captured
   payloads; SessionStart documented nonexistent with the PreInvocation
   equivalent + AGENTS.md fallback shipped.
3. ✅ Fixture discovery demonstrated live (probe-01b: skills + workflows incl.
   planted markers, AGENTS.md in context).
4. ✅ `spawn()` launched a real headless session; contract tuple returned;
   BOOT-OK logged.
5. ✅ Suite 745/745; two deliberate fingerprint re-baselines, each with the
   capture-tool diff in its commit; Claude/Codex byte-identical throughout.
6. ✅ Stale-claim grep clean across every shipped surface.

## Known caveats (tracked, not hidden)

- `sessionStartHook` stays `false`: the PreInvocation injection round-trip
  needs one live re-probe, blocked by the intermittent agy 1.0.16 hook-runner
  hang (**ENH-054**, P2 — also mandates watchdogs for all headless callers).
- Deny-semantics live confirmation deferred for the same reason (doc-sourced;
  shim implements the documented contract; unit-tested against captured shapes).
- Vendor churn risk: the CLI is days old; evidence is version-pinned and the
  fact sheet is the re-validation baseline.
- Cross-surface: live evidence is CLI-scoped; IDE + Agent Manager share the
  same engine per vendor docs (fact-sheet §11) — a ~10-minute operator
  observation pass is filed as VAL-003.

## Version note for landing

Lane bumps to **v0.29.0** (retargeted at landing: OKF released v0.27.0 mid-phase, opencode retargeted to v0.28.0).
If this lane lands FIRST, adjust to the next sequential version at the
release step — npm versions must be ordered; the operator resolves this at
the Rule 6 gate.

## What went well / what to repeat

- **Evidence-first (G0 before any code) paid for itself within hours**: it
  killed a planned deliverable (subagent defs) before implementation, found
  vendor docs ON DISK, and turned VAL-002 from "operator-manual IDE session"
  into a scriptable half-day.
- **The boundary-shim pattern** kept the zero-regression constraint trivially
  provable — the capture tool's "no change" for the other two adapters is the
  whole review.
- **Honest dead-ends recorded**: the intermittent hang cost ~5 probe runs and
  produced ENH-054 instead of a false config-blame conclusion.
