# Ad-hoc Work Record: feat-VAL-002-antigravity-compatibility

> **Type**: quick-task
> **Created**: 2026-07-03 (lane opened; record written 2026-07-05)
> **Branch**: feat/VAL-002-antigravity-compatibility (lane `feat-VAL-002-antigravity-compatibility`)
> **Backlog**: VAL-002 (adjudicated — stays blocked); ENH-051 (filed en route)
> **Status**: shipped — as an ADJUDICATION. The wrapper feature the lane
> originally carried was rejected and does NOT land; what ships is the
> close-vs-blocked resolution, the preserved diff, and the tracking updates.

## Current Behavior

The lane and the spec layer contradicted each other:

- **Backlog** (main): VAL-002 is `blocked` — Phase 18 G4 evidence found no
  standalone `agy` CLI; all 6 verification questions need operator-manual
  validation inside the Antigravity IDE; `sessionStartHook` stays `false`
  until operator evidence confirms IDE surfacing.
- **This branch's 33db31a** ("feat(antigravity): auto-provision agy wrapper
  and close VAL-002", authored 2026-07-03 by a live Antigravity session):
  flipped `sessionStartHook: true`, emptied the roadmap caveat, rewrote
  capabilities/parity docs as closed, and made `momentum init --agent
  antigravity` auto-provision an `agy` wrapper (python3 venv +
  `pip install google-antigravity` into `~/.gemini/antigravity/bin/`).
- **Main's Phase 23** had already adjudicated the surface claims: commit
  90229b6 purged the unearned "Fully supported via the agy CLI wrapper"
  SessionStart line from `adapters/antigravity/instructions/surfaces.md` and
  restored the truthful "pending VAL-002" row + fallback subsection. The
  phase-23 history records the authoring session skipped Rule 12 verification
  and calls the branch "rejected". The lane also sat 14 commits behind main
  (pre-Phase-23 instruction model — its direct `instructions/AGENTS.md` edit
  predates build-time generation + drift guard).

## Expected Behavior

After this quick-task:

1. **Close-vs-blocked resolved: VAL-002 stays `blocked`.** The closure is
   rejected on four grounds:
   - **Circular validation.** The wrapper is momentum-authored scaffolding:
     it loads skills via its own `load_skill_instructions()` and never wires
     `.agents/hooks.json`. VAL-002's questions gate on the *vendor runtime*
     discovering workflows/skills and firing hooks — a self-built shim cannot
     answer them.
   - **SessionStart never observed.** `google.antigravity.hooks.policy` is a
     permission-policy API (`allow`/`deny`/`ask_user`/`confirm_run_command`),
     not a lifecycle-hook API. Nothing in the library or wrapper fires
     SessionStart, so the `sessionStartHook: true` flip was unearned (Rule 12).
   - **Unshippable implementation.** The wrapper content hardcodes
     `#!/Users/avinash/.gemini/antigravity/bin/venv/bin/python3` — a
     user-specific absolute path in shipped adapter code.
   - **Unapproved install side effect.** venv creation + network pip install
     of an alpha library into the user's home directory during `momentum init`
     is a decisional change (Rule 10 spirit) with no ADR and no plan review
     (Rule 7).
2. **The genuinely new fact is recorded, not lost.** `google-antigravity`
   EXISTS on PyPI (author: Google LLC, Development Status: 3 — Alpha) and its
   API imports cleanly. This updates Phase 18's "no CLI path at all" finding
   and opens a possible future *headless* validation path once the library
   exposes lifecycle hooks. Salvage filed as **ENH-051** (opt-in provisioning
   command; portable shebang; zero capability flips).
3. **The rejected work is preserved, not vaporized.** Full diff of 33db31a at
   `rejected-33db31a-agy-wrapper.patch` in this directory. Pre-reset lane tip
   was 7e288b4 (33db31a + two lane-session chore commits: `.githooks`
   tracking identical to main; a `settings.local.json` permission line).
4. **The lane lands docs/tracking only**, rebased onto v0.26.0 main
   (`git reset --hard main` — the all-commits-dropped form of the rebase):
   backlog VAL-002 adjudication + ENH-051, this record, changelog, status
   Next-Action note.

## Unchanged Behavior

- `adapters/antigravity/adapter.js` capabilities: `sessionStartHook: false`
  and its roadmap caveat — exactly as on main.
- `core/adapter-capabilities.md`, `core/adapter-parity-matrix.md`, and the
  Phase-23 generated antigravity instruction surfaces (truthful SessionStart
  row + fallback subsection) — untouched.
- `momentum init` / `upgrade` behavior: no new side effects, no network
  access, no home-directory writes; `momentum doctor` gains no `agy` check.
- Test suite: no tests added or removed — count stays at main's 733.
- The local `~/.gemini/antigravity/bin/agy` wrapper on the operator's machine
  (created by the Jul 3 session, not on PATH) is left as-is — it was never
  provisioned by landed code and is now inert.

## Verification Evidence

Adjudication evidence (fresh, 2026-07-05, this session):

```
$ which agy
agy not found            # exit=1 — no vendor CLI on PATH (unchanged from Phase 18)

$ curl -sS "https://pypi.org/pypi/google-antigravity/json" -w "%{http_code}"
200  {"info":{"author":"Google LLC", ... "Development Status :: 3 - Alpha" ...}
                         # the library is REAL — new fact vs Phase 18's 404s

$ ~/.gemini/antigravity/bin/venv/bin/python3 -c "from google.antigravity import \
    Agent, LocalAgentConfig, CapabilitiesConfig; ...; print('imports OK')"
imports OK, version: unknown

$ python3 -c "print([n for n in dir(google.antigravity.hooks.policy) ...])"
['allow', 'allow_all', 'ask_user', 'confirm_run_command', 'deny', 'deny_all',
 'enforce', 'safe_defaults', 'workspace_only', ...]
                         # permission policies only — NO lifecycle/SessionStart
                         # hooks → the sessionStartHook:true flip was unearned
```

Rebase/reconciliation evidence:

```
$ git rev-list --left-right --count main...HEAD    # before
14	3
$ git reset --hard main
HEAD is now at 743d17c merge: land lane 'phase-23-rules-unification' → main (momentum lanes)
$ git status
nothing to commit, working tree clean (docs added after)
```

Suite (Rule 12, run on this lane after the reset + docs):

```
$ npm test        # 2026-07-05, lane worktree, post-reset + docs
ℹ tests 733
ℹ pass 733
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ duration_ms 46797.021584   # exit 0 — identical count to v0.26.0 main
```
