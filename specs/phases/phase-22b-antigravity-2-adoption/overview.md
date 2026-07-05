# Phase 22b: Antigravity 2.0 Full Adoption

> **Status**: Planned (brainstormed 2026-07-05)
> **Branch / lane**: `phase-22b-antigravity-2-adoption` (Reach family; parallel to `phase-22-opencode-adapter`)
> **Target release**: v0.28.0 (opencode holds v0.27.0; Rule 6 Landing Order settles actual order)
> **Backlog**: VAL-002 (closure), ENH-051 (supersession), FEAT-008 (closure recommendation)

## Goal

Rebuild the Antigravity adapter against the real, shipping Antigravity 2.x
surface — IDE 2.1.1 + `agy` CLI 1.0.16 (released 2026-07-02, installed and
authenticated on this machine) + `google-antigravity` SDK 0.1.5 — and adopt
the full 2.0 native surface. Evidence-first: every path, matcher, flag, and
capability claim is locked by live CLI probes **before** any adapter code
changes. Closes VAL-002 with vendor-runtime evidence.

## Why now

The adapter was built (Phase 16) and validated (Phase 18, 2026-06-15) against
a world where Antigravity was IDE-only and no CLI existed. Antigravity 2.0
(Google I/O 2026) + the official CLI changed every assumption. The 2026-07-05
gap analysis (see `specs/adhoc/feat-VAL-002-antigravity-compatibility/record.md`
for the adjudication that preceded it) found:

1. **Hooks contract wrong ×4** — schema shape, absolute-path command
   requirement, stale matchers (`apply_patch` is Codex's tool), inverted
   response semantics (Antigravity: always exit 0 + `{"allow_tool": false,
   "deny_reason"}` stdout JSON; ours: exit 2 to block, Claude-style).
2. **Path matrix unlocked** — `.agent/` vs `.agents/` conflict from Phase 16
   never resolved; secondary sources now actively disagree AND suggest
   IDE-vs-CLI divergence.
3. **`spawn()` flags fictional** — `agy --cwd X --skill Y` does not exist on
   the real CLI (verified against `agy --help`, 1.0.16). Real surface:
   `-p/--print`, `--print-timeout`, `--add-dir`, `--sandbox`,
   `--dangerously-skip-permissions`, `--model`, plugins subcommand.
4. **SessionStart ambiguous but testable** — CLI file-hook event set may be
   five events (PreToolUse/PostToolUse/PreInvocation/PostInvocation/Stop);
   SDK has programmatic `OnSessionStartHook`. One live probe settles it.
5. **Missed 2.0 surfaces** — subagent definitions, `agy plugin` packaging,
   global skills dir, scheduled tasks.
6. **Docs/capability drift** — capabilities doc vs adapter.js disagree;
   parity footnotes still say "no CLI exists"; FEAT-008 (Gemini CLI adapter)
   targets a product sunsetted 2026-06-18 (Antigravity CLI is its successor).

## Key Decisions

| Decision | Choice | Why |
|---|---|---|
| Scope | **Full 2.0 adoption** (operator, 2026-07-05) — realign + subagent defs + plugin packaging + global skills opt-in | "Fix it all"; Antigravity is a first-class supported vendor |
| Evidence order | G0 locks a fact sheet before any adapter edit | Phase 16/18 shipped documented-guesses that went stale; never again |
| Vendor software | momentum NEVER provisions vendor binaries; `doctor` detects `agy` and points at the official installer | Supersedes ENH-051; avoids the rejected-wrapper failure mode |
| Path divergence | Resolved by probe; if IDE and CLI truly diverge, dual-destination install (adapter contract change → ADR required) | Only the runtime's answer counts |
| Probe style | Deterministic surfaces (hook-fire transcripts, `/skills` listing, payload capture) over LLM-answer probes | Semantic auto-detection answers are flaky evidence |
| Probe budget | Scripted, few, cheap; runs on operator quota (CLI shares IDE auth) | Live probes are the point, but respect quota |

## Scope

### In

- G0 live-probe evidence lock (fact sheet pinned to `agy` 1.0.16, committed)
- Hooks contract rewrite: real schema, install-time absolute-path templating
  (with upgrade path), real tool-name matchers, real stdin payload handling
  (`hook_event_name`, `toolCall.args`), exit-0 + `allow_tool` JSON responses
- Path matrix lock + destination fixes (workflows/skills/hooks/subagents)
- `spawn()` rewrite on real CLI flags + swarm smoke
- SessionStart resolution per evidence (real event, `PreInvocation` fallback,
  or AGENTS.md-text-only floor — which already ships)
- Reviewer personas as native subagent definitions; `/review-code` native fan-out
- `agy plugin` packaging of momentum recipes (per G0 evidence)
- Global-skills as documented, explicit opt-in (never an init side effect)
- `momentum doctor`: `agy` presence check advising the official installer
- Truth-sync: capability flips with evidence citations; capabilities/parity/
  surfaces rewrite; VAL-002 resolved; ENH-051 superseded; FEAT-008 closure
  recommendation (operator sign-off); backlog items for deferred surfaces

### Out (non-goals)

- Provisioning/wrapping vendor binaries (ENH-051 superseded, not implemented)
- Automated IDE-side testing — manual IDE observations recorded as such only
  where the CLI cannot answer
- Cursor adapter (FEAT-007) — stays in Phase 22 backlog
- Scheduled tasks / voice / browser-control adoption — filed as backlog items
- Any Claude Code or Codex adapter change (fingerprint guards enforce zero-regression)
- Any init-time network or home-directory side effect

## Deliverables & Verification

| # | Deliverable | Verification |
|---|---|---|
| D1 | `evidence/fact-sheet.md` + probe scripts + raw transcripts | Files committed; every claim cites a probe output; pinned to `agy --version` output |
| D2 | Realigned hooks contract | `node --test tests/adapter-hook-execution-antigravity.test.js` green against real payload fixtures; live fire transcript in evidence/ |
| D3 | Locked destinations | Fixture install → probe shows discovery; fingerprint test green after one deliberate re-baseline |
| D4 | Working `spawn()` | Live headless spawn smoke transcript; `node --test tests/adapter-antigravity-swarm.test.js` |
| D5 | Native subagents + plugin packaging + doctor check | Probe transcripts; new tests green |
| D6 | Truth-synced docs + backlog + VAL-002 closed | `grep -ri "pending VAL-002\|no CLI exists\|no standalone" core/ adapters/antigravity/` returns nothing stale; backlog rows updated |
| D7 | v0.28.0 release | Full suite green ×3 adapters; retrospective with Verification Evidence; Rule 6/12 release gates |

## Acceptance Criteria

1. All 6 VAL-002 questions answered with fresh `agy` 1.0.16 runtime evidence.
2. Each of the 3 hooks demonstrably fires (captured payload + response), or is
   documented unsupported with its shipped fallback.
3. Fixture `momentum init --agent antigravity` → `agy` demonstrably discovers
   workflows, skills, and subagent definitions.
4. `spawn()` launches a real headless supervisor session and returns the
   contract tuple.
5. Suite green (733 baseline + new); antigravity fingerprint re-baselined
   only deliberately — each re-baseline carries the capture-tool diff in its
   commit (G1: layout consolidation; G3: plugin docs section in AGENTS.md).
6. Zero stale "pending VAL-002" / "no CLI exists" residue in any shipped surface.

## Risks

| Risk | Mitigation |
|---|---|
| Vendor churn (CLI is 3 days old) | Evidence dated + version-pinned; drift noted as future re-validation trigger |
| Probe quota/cost | Few, scripted, deterministic probes; no loops over LLM calls |
| IDE/CLI divergence forces contract change | ADR before implementation (Rule 10 decisional path) |
| Overlap with `phase-22-opencode-adapter` on shared docs | Both lanes edit only their own adapter's rows/columns; rebase + coordinate at landing (Rule 15) |
