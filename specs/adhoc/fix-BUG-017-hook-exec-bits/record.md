# Ad-hoc Work Record: fix-BUG-017-hook-exec-bits

> **Type**: quick-task
> **Created**: 2026-07-05
> **Branch**: fix/BUG-017-hook-exec-bits (lane `fix-BUG-017-hook-exec-bits`)
> **Backlog**: BUG-017 (P1)
> **Status**: shipped

## Current Behavior

`git ls-files -s .githooks/` showed all four hook files (`commit-msg`,
`contract.js`, `pre-push`, `run-check.js`) tracked at mode **100644**, plus
four committed `*.bak` upgrade artifacts. The primary worktree's hooks were
executable only because the installer chmod'ed the **working tree**, never the
index. Consequence: every fresh clone and every `momentum lanes open` worktree
materialized non-executable hooks with `core.hooksPath=.githooks` set — the
Rule 6 enforcement layer (commit-msg Conventional-Commit validation, pre-push
protected-branch/sentinel/tag gates) was **silently OFF exactly where lanes do
their work**. Observed live twice on 2026-07-05: in lane
`feat-VAL-002-antigravity-compatibility` (discovery) and lane
`phase-22-opencode-adapter` (git hint: "hook was ignored because it's not set
as executable").

Same failure family as BUG-012 (exec bits on 7 shipped `*.sh` scripts), but
the BUG-012 suite guard filtered on `.endsWith('.sh')` — the extensionless
hook wrappers and node libs under `.githooks/` were never covered.

## Expected Behavior (this fix)

1. **Committed modes match runtime + installer reality.** All four
   `.githooks/` files committed at **100755** (`git update-index --chmod=+x`).
   `installGitHooks()` (bin/momentum.js) chmods every installed hook file
   0o755, so the committed mode now also prevents upgrade-induced mode-only
   tree dirt.
2. **Guard extended (regression-proof).** `tests/committed-exec-bits.test.js`
   gains a BUG-017 test: every tracked non-`.md` file under `.githooks/` must
   be 100755, and no `*.bak` may be tracked there.
3. **`.bak` artifacts dropped.** The four committed `.githooks/*.bak` upgrade
   backups removed from tracking; `.gitignore` gains `.githooks/*.bak` so
   future hook upgrades can't re-commit them.

Deliberately NOT in this quick-task (per the backlog entry's fix-candidate
(b)): making `lanes open` preflight self-heal working-tree exec bits — folded
into ENH-050's lanes-open hardening.

## Verification Evidence

- `git ls-files -s .githooks/` → all four files `100755`, no `.bak` entries.
- `node --test tests/committed-exec-bits.test.js` → pass (both guards), fresh
  run this session.
- Full suite green in this lane's worktree — see landing gate output.
- Live proof: the `commit-msg` hook ran (validated the Conventional-Commit
  subject) on this very fix commit in this lane worktree — the first enforced
  commit inside any lane worktree.
