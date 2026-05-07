# Phase 5 — Rules & Upgrade Safety: Retrospective

> Phase: phase-5-rules-and-upgrade
> Released: v0.6.0 (target — pending merge + tag + npm publish)
> Branch: phase-5-rules-and-upgrade
> Commits: 7

## Summary

Phase 5 shipped the cerebrio-sapience upstream improvements (Rules 10/11, expanded Rule 8, persuasion-hardening of high-leverage rules) plus the upgrade-safe `## Project Extensions` marker architecture and the breaking `--coding-agent` → `--agent` rename. Vision C: rule foundation work that Phase 6's execution engine will sit on.

All five execution groups landed plus brainstorm/start-phase prep. Phase came in cleanly within the originally agreed scope, with one in-flight discovery (ENH-014 was tagged phase-5 in the backlog but missed during brainstorm — deferred to Phase 6).

## What Went Well

- **Vision C was the right scope shape.** Conservative path A would have left the rules un-hardened — meaning Phase 6's execution engine would inherit soft rules. Ambitious path B would have built the engine on those soft rules. C laid the foundation in the right order.
- **Group structure held under serial execution.** The plan's parallel-groups layout (1+2+3 in parallel after Group 0) was theoretical for a single agent, but the dependency mapping was accurate — Groups 1, 2, 3 truly were independent and could have run in parallel had the harness supported it. Useful for future multi-agent dispatch.
- **Dogfooding (Group 4) caught real bugs.** Three marker-logic bugs that the design didn't surface: missing marker section in agent-rules, lossy `partitionByMarker` whitespace stripping, double-marker concatenation in `upgradeMarkedFile`. Each of these would have shipped in v0.6.0 and bitten the next user. Group 4's smoke tests paid for themselves and then some.
- **Persuasion-hardening pattern feels generative.** Each Red Flags table + anti-rationalization counters block took 10–20 minutes per rule but produces durable scaffolding that should keep working session-to-session. Worth applying to Rules 1, 3, 4, 5, 7, 9 in a future low-priority phase if/when failure evidence emerges.
- **Marker-based upgrade is satisfying.** Four-state output (`added`/`updated`/`unchanged`/`migrated`) is precise — operators know exactly what happened.

## What Didn't Go Well

- **Missed ENH-014 in brainstorm.** ENH-014 (cross-repo Rule 9 safeguards) was tagged `phase-5` in the backlog from the original upstream-batch commit `bcd9dcf`, but I only listed ENH-008/010/011/012/013 + FEAT-011 during the brainstorm. Discovered at completion. Action: deferred to Phase 6, retag in backlog. Process gap: brainstorm step "scan backlog for items tagged to this phase" needs to grep, not rely on memory.
- **Group 0 + Group 1 commit consolidation was anticipated, but not annotated in plan.md.** Plan called for two commits; in serial execution they collapsed to one. Worth noting in the plan template that single-agent execution may collapse adjacent same-file commits.
- **`partitionByMarker` design needed two iterations.** The original lossy whitespace-stripping plus the double-marker bug both stemmed from underspecifying the round-trip property — "managed + extensions === content" should have been a written invariant from the start. Lesson: when designing helpers that round-trip, write the invariant explicitly before coding.
- **No automated tests beyond smoke scripts.** Smoke tests were ad-hoc shell commands during this phase. A `tests/` directory with even a minimal Node-based test would have caught the partition bugs faster than `diff` + `grep`. Logged as a candidate for Phase 6 (or sooner).

## Lessons Learned

1. **Brainstorm gap-checking should be mechanical, not memory-based.** During /brainstorm-phase, run `grep -E 'phase-N\\b' specs/backlog/backlog.md` and reconcile against the proposed scope. Don't trust recall.
2. **For round-trip helpers, write the invariant first.** "X(Y(c)) === c when condition holds" — write it in a comment before the function body. Forces the lossy edge cases to surface during design.
3. **Dogfood at the end of each major group, not just at Group 4.** Three Group-4 bugs were independently fixable but compounded because none surfaced until late. A 5-minute smoke after Group 2 would have caught the partition bugs before Group 3 piled on.
4. **Persuasion-hardening pays for itself.** It feels like rule-bloat at first read, but the Red Flags + anti-rationalization pairing is genuinely different from the underlying rule — it's about *circumventing rationalizations* rather than *describing the rule*. Worth the extra lines.

## Backlog Outcomes

| ID | Status | Notes |
|---|---|---|
| ENH-008 | ✓ resolved | `--coding-agent` → `--agent` hard rename, no alias, exits 1 with hint |
| ENH-010 | ✓ resolved | `## Project Extensions` heading marker (chose heading over HTML comments) |
| ENH-011 | ✓ resolved | Rules 10 + 11 added; Rule 10 marked `(monorepo only)` |
| ENH-012 | ✓ resolved | Rule 8 expanded with triggers, `[EVALUATOR]`, impact-map reminder, hook reference |
| ENH-013 | ✓ resolved | `infra:` commit, SLA column, delete-after-merge convention |
| ENH-014 | **deferred to phase-6** | Tagged `phase-5` but missed during brainstorm; not implemented |
| FEAT-011 | ✓ resolved | Marker-aware upgrade preserves user content; pre-marker migration with `.bak` |

## Carry-Forward to Phase 6

- **ENH-014** (cross-repo Rule 9 safeguards) — re-tag from `phase-5` to `phase-6` in backlog
- **Persuasion-hardening backlog item** — consider hardening Rules 1, 3, 4, 5, 7, 9 if/when failure evidence emerges
- **Tests directory** — consider adding `tests/` with minimal Node test runner during Phase 6 since execution-engine work needs more rigorous verification anyway

## Metrics

| Metric | Value |
|---|---|
| Commits on branch | 7 (2 prep + 5 implementation) |
| Files touched | ~12 (templates, CLI, README, install.sh, specs) |
| Lines added | ~600 net |
| Bugs found in dogfood | 3 (all fixed before release) |
| Backlog items resolved | 6 of 7 tagged phase-5 |
| Backlog items deferred | 1 (ENH-014) |
| Acceptance criteria met | 11 of 11 |
