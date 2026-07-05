---
type: Phase
status: complete
tags: [phase-19, lifecycle-hardening, git-enforcement, git-hooks, commit-msg-hook, pre-push-hook, conventional-commits, core-hookspath, githooks, zero-dependency, no-husky, escape-hatch, merge-approved-sentinel, verify-evidence-gate, rule-12-enforcement, rule-6-honesty, rule-14-escalation, ad-hoc-work, hotfix, spike-mode, work-types, specs-adhoc, phase-optional, log, sync-docs, validate-no-phase, ad-hoc-releases, forge-neutral, vendor-agnostic, dip, branch-protection-docs, branch-cleanup, stale-branches, gitignore-worktrees, phase-8-close, td-007, td-008, warn-not-clobber, v0-21-0]
---

# Phase 19 — Lifecycle Hardening

> **Status**: Planned (not started)
> **Target release**: v0.21.0
> **Renumbers roadmap**: Reach → 20, Intelligence → 21, Platform → 22
> **Source**: 2026-06-19 multi-agent git-lifecycle + lifecycle-model review (see `specs/changelog/2026-06.md`)

## Goal

Convert momentum's lifecycle discipline from **prose the agent may ignore** into **vendor-neutral mechanism** — for both the **git lifecycle** (Workstream A) and **off-phase / ad-hoc work** (Workstream B) — closing the credibility gap the review exposed: Rule 6 is labeled "(Automatic)" but no git behavior is enforced by code, "delete merged branch" has a 0% execution rate (16 stale branches on origin), and off-phase work has no first-class lane (v0.20.1 / v0.20.3 shipped via `—` phase rows that bypassed verification, history, and doc-sync).

## Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Phase shape | Single phase, two workstreams | One release closes the whole gap |
| Enforcement strength | Hard-block (exit ≠ 0) + documented escape hatch | Soft-warn reproduces the exact problem the phase fixes |
| Hook delivery | Plain `.sh` in a tracked `.githooks/` dir, wired via `git config core.hooksPath` by `bin/momentum.js` | Zero-dependency (`fs`/`path`/`process` only); survives clone; **no husky/lefthook** |
| Escape hatch | `MOMENTUM_SKIP_HOOKS=1` (emergency) + single-use `.momentum/merge-approved` sentinel (the legitimate approved-merge path) | Mirrors the existing `.momentum/brainstorm-active` sentinel pattern |
| Forge enforcement | Vendor-neutral git hooks only; server-side branch protection documented forge-neutrally | DIP / vendor-agnostic — momentum must not hard-couple to GitHub |
| Verify gate (FEAT-019) | `pre-push` blocks **tag pushes** unless the relevant `retrospective.md` has a non-empty `## Verification Evidence` section | Git-native + agent-agnostic (not a Claude-only `Stop` hook) |
| phase-8 (TD-008) | Close & delete; fix the false "shipped v0.11.0" retrospective | Native `--worktree` + swarm now cover the need; the 546-LOC impl predates the Phase 10 state machine |
| Destructive / outward-facing ops | Approval-gated at execution (TD-007 branch deletes, phase-8 delete) | Shared-system actions per CLAUDE.md |

## Scope

### In scope
- **BUG-009** — relabel Rule 6 "(Automatic)" → accurate enforced/advised; fix the incoherent `--no-verify` line.
- **FEAT-018** — zero-dependency git hooks: `commit-msg` (conventional-commit validation) + `pre-push` (block direct push to `main`/`staging` without the approval sentinel), installed by `bin/momentum.js` via `core.hooksPath`, hard-block + escape hatch.
- **FEAT-019** — Rule 12 verification-evidence gate: `pre-push` tag-path blocks a release tag push unless the relevant `retrospective.md` has a non-empty `## Verification Evidence` section.
- **FEAT-020** — first-class ad-hoc work types: `/hotfix` quick-task lane (scaffolds `fix/`-`chore/` branch + a minimal `specs/adhoc/<id>/` record, reuses the Rule 12 gate) + a declared **spike** mode exempt from acceptance gates.
- **ENH-041 (reframed)** — forge-neutral branch-protection docs (GitHub Rulesets / GitLab protected branches / Bitbucket permissions as *optional* hardening). **No GitHub-specific code in core.**
- **ENH-042** — automated merged-branch deletion in `/complete-phase` (guarded on confirmed merge) + session-start branch-hygiene self-audit.
- **ENH-043** — gitignore agent-worktree dirs (`.claude/worktrees/` etc.) in repo + template.
- **ENH-044** — make `/log` + `/sync-docs` + the history hook phase-optional with a fallback sink; add an "Ad-hoc / Patch Releases" section to the `status.md` template; teach `/validate` that "no active phase" is a valid mode.
- **ENH-045** — Rule 14: escalation criteria for when ad-hoc work must become a phase + the "lightest work type that fits" governing principle.
- **TD-007** — prune the 16 stale released-phase / chore / audit branches on origin (excluding the phase-8 branch, handled by TD-008).
- **TD-008** — close phase-8 parallel-worktree limbo: fix the false retrospective, then delete the branch.

### Non-goals (explicitly out of scope)
- Forge-specific adapters / API scaffolding (GitHub/GitLab) — belongs behind a future "forge adapter" abstraction.
- Reviving phase-8 worktree-manager as a shipped feature.
- New coding-agent adapters (Cursor/Gemini) — that is Phase 20 (Reach).
- Any change to the swarm subsystem.
- Modifying momentum's own GitHub repo settings (a separate, explicitly-approved action if wanted).

## Deliverables & Verification

| Deliverable | Verification command / check |
|---|---|
| Git hooks installed on `init`/`upgrade` | After `momentum init` in a temp repo: `git config core.hooksPath` returns `.githooks`; `.githooks/commit-msg` + `.githooks/pre-push` exist and are executable |
| `commit-msg` enforcement (FEAT-018) | A commit with a non-conventional message exits non-zero; a conforming message succeeds |
| `pre-push` branch protection (FEAT-018) | A direct push to `main`/`staging` without `.momentum/merge-approved` exits non-zero; with the sentinel (or `MOMENTUM_SKIP_HOOKS=1`) it proceeds and the sentinel is consumed |
| Verify-evidence gate (FEAT-019) | Pushing a release tag is blocked unless the relevant `retrospective.md` has a non-empty `## Verification Evidence`; smoke proves both branches |
| Escape hatch | `MOMENTUM_SKIP_HOOKS=1 git commit/push` bypasses; documented in Rule 6 |
| Existing-hooks safety | Installing into a repo that already sets `core.hooksPath` or uses husky **warns and does not clobber** |
| `/hotfix` lane (FEAT-020) | Running it scaffolds `specs/adhoc/<id>/` with the Current/Expected/Unchanged + Verification-Evidence record and a `fix/`-`chore/` branch |
| Phase-optional plumbing (ENH-044) | `momentum validate` exits 0 with no active phase; `/log` + `/sync-docs` write to the fallback sink off-phase |
| Rule honesty (BUG-009) + Rule 14 (ENH-045) | CLAUDE.md, template, `.agent/rules/project.md`, codex/antigravity AGENTS.md updated at parity |
| Cleanup (ENH-043/TD-007/TD-008) | `.claude/worktrees/` is gitignored; the 16 stale origin branches are gone; phase-8 branch deleted + retrospective corrected |
| Regression | `npm test` green; Claude Code install fingerprint re-baselined; 3-adapter parity check passes |

## Acceptance Criteria

1. Every git rule momentum *states* is either mechanically enforced (hook) or honestly labeled "advised."
2. Non-conventional commit message → rejected; direct push to main without sentinel → blocked; release tag without verification evidence → blocked; escape hatch works and is documented.
3. `/hotfix` produces a tracked off-phase record that still passes through the Rule 12 evidence gate, without a full phase scaffold.
4. `/validate` treats no-active-phase as valid; off-phase `/log` + `/sync-docs` have a home.
5. phase-8 closed and its branch deleted; the 16 stale branches pruned; `.claude/worktrees/` gitignored.
6. `npm test` + fingerprint green; all three adapters at parity; `retrospective.md` carries captured Verification Evidence.
