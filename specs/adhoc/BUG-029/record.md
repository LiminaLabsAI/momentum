---
type: Ad-hoc Record
---

# Ad-hoc Work Record: BUG-029

> **Type**: quick-task
> **Created**: 2026-07-27
> **Branch**: `fix/BUG-029-orient-lane-parsing`
> **Backlog**: BUG-029
> **Status**: shipped

## Current Behavior

`core/ecosystem/lib/orient.js` `openLanes()` reads
`<git-common-dir>/momentum/lanes/registry.json` and treats its `lanes` array as
an array of lane **objects**:

```js
return (reg.lanes || [])
  .filter((l) => l && l.status !== 'closed' && l.status !== 'landed')
  .map((l) => ({ id: l.id, branch: l.branch, status: l.status }));
```

The registry actually stores an array of lane **id strings** — the per-lane
detail lives in `<anchor>/<id>/manifest.json`:

```json
{ "stateVersion": 1, "lanes": ["phase-21b-lanes-run-g3", "feat-site-redesign", ...] }
```

So every entry becomes `{ id: undefined, branch: undefined, status: undefined }`,
and because `undefined !== 'closed'` the status filter passes **every lane the
repo has ever had**. On this repo that reports 30 "open" lanes when the true
state is 29 `closed` + 1 `landed` and **zero open**.

Both v0.41.0 surfaces that consume this are affected:

- `momentum ecosystem status` — prints a `lanes:` line of `undefined (undefined)`
  entries for each member
- the SessionStart `▸ Fleet:` banner — reports an inflated `N open lanes` count

Shipped in **v0.41.0** (Phase 31b G1).

### Why it happened

`orient.js` is deliberately dependency-free so it can be installed into a target
repo's `scripts/` (an installed project receives no copy of momentum's `core/`).
It therefore could not `require('../../lanes/lib/state')`, re-implemented
registry reading from scratch, and got the format wrong. This is the first
user-visible defect caused by the shipped-runtime duplication already filed as
**TD-012** — which is now a correctness argument rather than a tidiness one.

## Expected Behavior

`openLanes()` reads the registry as an id list, loads each lane's
`manifest.json`, and returns only genuinely in-flight lanes — status `open` or
`done`. `landed` and `closed` lanes are spent and must not appear.

It must also resolve the lane anchor correctly when `.git` is a **file** (a
linked worktree) by following `gitdir:` → `commondir`, since Rule 15 lane work
runs in worktrees and that is precisely where lane state matters.

On this repo the fleet line must report **no open lanes**.

## Unchanged Behavior

- `orient.js` stays **dependency-free** (node builtins only) — asserted by the
  existing require-list test. The fix must not reach for `core/lanes/lib/state`.
- Everything else orient reports — active phase rows, open P0/P1 items, the
  degradation behaviour for unreachable/unmanaged members — is untouched.
- `momentum ecosystem status --brief` output stays byte-identical.
- `momentum lanes` itself is NOT touched. Its own registry handling is correct;
  only orient's independent re-read was wrong.
- No behaviour change for repos with no lane state at all (the common case).

## Verification Evidence

Fresh output from this session (2026-07-27).

**1. The bug, against ground truth.** Before the fix the fleet view reported 30
open lanes on this repo. The authority disagrees:

```
$ node -e "const s=require('./core/lanes/lib/state'); const l=s.listLanes(s.resolveAnchor(process.cwd())); ..."
total: 30  |  by status: {"closed":29,"landed":1}
genuinely open: (none)
```

**2. After the fix** — orient now agrees:

```
$ node -e "const o=require('./core/ecosystem/lib/orient.js'); console.log(o.openLanes(process.cwd()))"
[]

fleet line: 5 members with open P0/P1 · 4 active phases      # the bogus "· 30 open lanes" is gone
```

**3. The regression tests fail against the v0.41.0 parser** (restored it
verbatim, ran, then reverted) — proving they catch the defect rather than merely
describing it:

```
### running the new tests against the v0.41.0 BROKEN parser ###
✖ BUG-029: only in-flight lanes are reported — landed and closed are spent
✖ BUG-029: a registry of id strings is not mistaken for objects
✖ BUG-029: lane state resolves through a linked worktree pointer
✖ BUG-029 parity: orient agrees with the real lanes API on this repo
✖ BUG-029: a corrupt or absent registry degrades to no lanes
ℹ tests 15 | pass 10 | fail 5

### restored ###
ℹ tests 15 | pass 15 | fail 0
```

**4. Full suite** (`npm test`, exit 0):

```
ℹ tests 1140
ℹ pass 1140
ℹ fail 0
```

1135 → 1140 (+5). Four adapter fingerprints re-baselined; `--check` first
confirmed the drift was exactly one file (`scripts/orient.js`).

## Discoveries

- **The parity fence was the missing check.** `orient.js` re-reads lane state
  independently because it must stay dependency-free to ship into installs. The
  new parity test pins its answer against `core/lanes/lib/state` — had it existed
  in 31b, the format mismatch could not have shipped. It is the same fence
  pattern already applied to `cross-repo.js` ↔ `detect.js`; lane reading simply
  never got one.
- **This is TD-012's first real cost.** The duplication was previously argued for
  on tidiness grounds. It has now produced a user-visible defect in two shipped
  surfaces, which is a correctness argument for consolidating the runtime.
- **Worktree anchoring was wrong too**, independently of the registry format: the
  original code only looked at `.git` as a directory, so lane state was invisible
  from a linked worktree — and Rule 15 lane work happens in worktrees.
- **A reporting error of my own**: this was reported to the operator as "30 stale
  open lanes across 5 members", conflating the members-with-open-P0/P1 count with
  the lane total. The lanes were all in one repo and none were stale. Verifying a
  claim before acting on it is the only reason any of this surfaced.
