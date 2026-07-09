---
type: Plan
status: planned
---

# Phase 30a — Team-Walk — Implementation Plan

```
Execution order:
  Sequential:  Group 0 → (Group 1 ∥ Group 2) → Group 3 → Group 4
```

- **Group 0** blocks everything (contracts + identity + ADR).
- **Groups 1 and 2** are independent feature areas — claims vs fragment
  transport — and run in parallel (candidate lanes).
- **Group 3** wires the two into recipes/writers/rules (sequential).
- **Group 4** is verification (sequential, last).

All work lands on `phase-30a-team-walk` (or child lanes rebased onto it per the
Rule 6 Landing Order). Verification default: `npm test` (config; no build).

---

## Group 0 — Contracts & identity *(Sequential — blocks all)*

**External deps:** none (git only).
**Commit:** `feat(team): actor identity + coordination transport contracts (ADR-0012)`

- [ ] **ADR-0012 — Git-native multiplayer coordination.** Records: git-native/no-server plane (D1); eventual consistency accepted; identity from `git config`; the fragment-vs-CAS transport split and *why* (fragments merge too late for allocation, CAS is pre-merge atomic); relationship to the deferred Fly relay. Extends the ADR-0001 lane model to N humans.
- [ ] **`core/identity/` actor lib.** `resolveActor(cwd)` → `{ id, name, email }` from `git config user.email`/`user.name`; `MOMENTUM_ACTOR` env override; deterministic fallback (stable hash of repo path + a generated-once local id) when git identity is unset, with a one-line warning. Pure, zero-dependency (`child_process` git + `fs`).
- [ ] **Fragment format spec** (`core/team/lib/fragments.js`). Per-actor append-only files under `.momentum/team/<view>/<actor>-<seq>-<kind>.json`; monotonic per-actor `seq`; a fragment carries `{ actor, seq, ts, kind, payload }`. **Collision-free invariant:** an actor only ever writes files whose name begins with its own `<actor>-` prefix → no two actors touch the same path → no git conflict by construction. `compile(view)` folds all fragments deterministically (stable sort by `(ts, actor, seq)`) into the rendered view.
- [ ] **`refs/momentum/*` ref-CAS helper** (`core/team/lib/refcas.js`). `claim(namespace, key)` = attempt `git push origin <sha>:refs/momentum/<namespace>/<key>` with a create-only refspec (`--force` never used); success = won, non-fast-forward/exists = lost. `installRefspec()` adds `fetch = +refs/momentum/*:refs/momentum/*` to the remote so the channel travels on ordinary `fetch`.
- [ ] **`.momentum/team/` committed + gitignore reconciled.** Fragments are tracked (unlike the rest of `.momentum/`, which is gitignored) — extend the BUG-014-aware `.gitignore` refresh with a `!.momentum/team/` negation that survives a directory-level `.momentum/` rule.

## Group 1 — Collision-free claims *(∥ Group 2)*

**External deps:** a reachable git remote (tests use a local **bare-remote fixture**).
**Commit:** `feat(team): collision-free claims via git-ref CAS (ENH-057, ENH-056)`

- [ ] **`momentum claim <kind> [--key <k>]`** (`bin/team.js` / `core/team/lib/claim.js`). Kinds: `phase`, `id` (backlog), `version`. Reads the current max from the compiled view, computes the candidate, attempts the CAS; on loss, re-reads and retries (bounded) then reports the winning value so the caller re-picks.
- [ ] **Fold ENH-057** — `version` claim serializes releases at the runway: `momentum claim version` reserves the next version via CAS before any tag/publish; a stale bump is refused with the winning version.
- [ ] **Fold ENH-056** — `claim`/land path refuses a self-merge: detect `current branch == lane branch` (or invoking worktree IS the lane's worktree) and error with a hint to run from the integration branch. (Mechanically small; grouped here as the same "one winner" family.)
- [ ] Tests against the bare-remote fixture: two clones race the same claim → one wins; loser deflects and re-picks; refspec round-trips the ref on `fetch`.

## Group 2 — Fragment-compiled shared state *(∥ Group 1)*

**External deps:** none.
**Commit:** `feat(team): per-actor coordination fragments + compile (towncrier pattern)`

- [ ] **Active Phase table → fragments.** Each lane writes its row as a fragment (`kind: active-phase-row`, keyed by actor+branch); `compile('active-phase')` renders the table in `status.md` between managed markers. Rule 15's "one row per active lane, own-row-touch" becomes *mechanical* (you can only write your own fragment).
- [ ] **`changelog/` → fragments.** Per-actor changelog fragments compiled into `changelog/YYYY-MM.md` (append-only, attributed). Removes the adjacent-line merge conflict on the shared changelog.
- [ ] **`momentum team sync`** — `git fetch` (coordination refs + branch), recompile every managed view, report what changed. The single explicit "see teammates" action; documents the eventual-consistency boundary.
- [ ] **`lanes board` reads compiled shared state** — after `sync`, the board reflects fragments authored on other clones (basic cross-machine visibility; live presence is Run).
- [ ] Tests: two-actor concurrent fragment append + merge → zero conflict; compile is deterministic and attribution-correct; idempotent recompile.

## Group 3 — Wiring *(Sequential)*

**External deps:** none.
**Commit:** `feat(team): wire actor identity + claims through recipes and rules`

- [ ] Replace/augment ephemeral "who" with `core/identity`: lane signal `from` (`core/lanes/lib/signals.js:122`), swarm actor (`bin/swarm.js:98`), ecosystem session line, `.momentum/merge-approved` records the approving actor.
- [ ] `/brainstorm-phase`, `/start-phase`, `/hotfix` obtain their next number via `momentum claim phase` / `momentum claim id`; `/complete-phase` reserves the release via `momentum claim version` (ENH-057).
- [ ] Reword **Rule 15** (rules body + all adapter surfaces): shared-tracking safety references the fragment/CAS mechanism; keep the social discipline as the fallback narrative.
- [ ] Docs — site "Working on multiple things at once" gains a **team** section; README; developer-guide `momentum claim` / `momentum team sync`.
- [ ] Re-baseline adapter fingerprints for the intended rules/recipe drift (one path per adapter, byte-exact).

## Group 4 — Verification *(Sequential — last)*

**External deps:** none (fixture builds its own bare remote).
**Commit:** `test(team): two-clone distributed coordination e2e + suite`

- [ ] **Two-clone bare-remote e2e fixture** (`tests/team-distributed.e2e.test.js`): init a bare remote; two clones with distinct `MOMENTUM_ACTOR`s. Scenarios: (a) concurrent `claim phase` → exactly one wins; (b) concurrent Active-Phase-row + changelog fragment → push/merge → zero conflict, compiled view shows both; (c) ENH-057 release race → serialized; (d) `team sync` makes B's fragments visible to A only post-sync.
- [ ] Full suite green (`npm test`); record counts in the retrospective `## Verification Evidence` (Rule 12 gate).
- [ ] Smoke: `momentum claim`, `momentum team sync`, `lanes board` on the fixture.
