---
type: ADR
---

# ADR-0009: The Trust Layer Is Invariant-By-Default, Mechanisms Are Preferences

## Status

Accepted

## Context

Since Phase 19 (Lifecycle Hardening), momentum's git-lifecycle enforcement
has hardcoded three assumptions into every shipped surface — the recipe
templates (`/start-phase`, `/complete-phase`), the `pre-push` hook, and the
agent rules:

1. **Registry**: every project publishes to npm (`npm publish --access public`).
2. **Forge**: every project is on GitHub (`gh release create`).
3. **Branch flow**: every project merges `feature → staging → main`
   (`protected_branches = [main, master, staging]`).

BUG-023 (v0.32.0+SW) removed the npm-publish clause from `/start-phase`'s
hard-stop but kept "GitHub Release" — judged project-agnostic at the time.
BUG-024 surfaced the same error: `gh release create` is forge-specific
(GitLab uses `glab release create`; Bitbucket has no native releases;
Gitea/Forgejo have their own). ENH-061 generalized the root cause: recipe
templates bake project-specific *variable* settings into global, immutable
text — language, forge, publish target, branch flow, verification commands
all leak Node/GitHub/staging-main assumptions into every downstream install.

The operator brainstorm (2026-07-09) separated two layers that prior fixes
conflated:

- **The trust layer** — the principle that a protected-branch push requires
  explicit human authorization. This is WHY momentum has a merge gate at
  all; it is the product's reason for being in the lifecycle.
- **The mechanisms** — which branches are protected, how far the agent goes
  before handing back, which release/publish commands run, what
  verification command proves a claim.

Prior fixes (BUG-023, BUG-024) kept patching the mechanisms one leak at a
time while leaving the principle implicit. A bug family (023 → 024) is the
signature of a missing separation of concerns.

## Decision

**The trust-layer principle is invariant and non-configurable. The
mechanisms are preferences, read from `specs/preferences.md` at execution
time.**

### Invariant (never a preference)

Human authorization is required for a push to any protected branch. There
is no `disable_merge_gate` preference, no `auto_approve` toggle, no
"trusted agent" mode. The only way to bypass the gate is the auditable
emergency escape hatch `MOMENTUM_SKIP_HOOKS=1` — which exists for recovery,
never for routine operation. Stripping the trust layer would make momentum
a different product; it stays load-bearing by default.

### Preferences (configurable, in `specs/preferences.md`)

| Surface | What becomes configurable |
|---|---|
| `pre-push` hook | `protected_branches` (derived from `branch_flow`) |
| `/start-phase` hard-stop | `end_state`, `branch_flow`, `release_flow` phrasing |
| `/complete-phase` release | `test_command`, `build_command`, `release_command`, `branch_flow` walk |
| `/brainstorm-phase` | verification-command defaults |
| `/validate` | drift check (preferences vs manifest) |

### Fail-closed semantics

`readPreferences()` returns `null` when `specs/preferences.md` is absent —
recipes then fall back to the current npm/GitHub defaults (the behavior
before this ADR). An unknown or missing *value* in a present file resolves
to the default for that field **with a stderr warning**, never to a wrong
action. Preferences never elevate the agent past the trust layer.

### Three git-only end-states ship now

`end_state` ∈ {`merge-after-yes`, `staging-promotion`,
`feature-branch-only`} — all pure git, no forge API. A `pull-request`
end-state needs forge CLI integration (`gh`/`glab`) and is deferred to the
Platform phase (filed as FEAT-031).

### Source of truth vs derived cache

`specs/preferences.md` is the content source of truth (version-controlled,
hand-editable). `.momentum/preferences-cache.json` is a *derived* build
artifact (gitignored) the `pre-push` hook reads for the protected-branch
list, falling back to `['main', 'master', 'staging']` when absent. The hook
never parses markdown; it reads JSON.

## Consequences

### Positive
- ✅ BUG-024 is fixed structurally, not by another one-clause patch: forge
  commands leave the global templates and live in `## Project Extensions`
  + preferences
- ✅ Non-npm / non-GitHub / non-staging-main projects get correct gate copy
  and release commands on day one (Python→pypi, Rust→crates.io,
  GitLab→glab, single-branch repos, deploy-only web apps)
- ✅ The bug family (023 → 024) closes: the separation of concerns removes
  the leak class
- ✅ The trust layer becomes *more* credible, not less: it is declared
  invariant, so configuration can never be read as "we relaxed the gate"

### Negative
- ⚠️ One new authored file per project (`specs/preferences.md`) —
  mitigated: `momentum init` infers it from manifests + git remote;
  `momentum upgrade` writes it for founded projects; absence is a
  `/validate` WARNING, not failure
- ⚠️ The `pre-push` hook gains a cache read (one `fs.existsSync` +
  `JSON.parse` on a tiny file) — negligible; the fallback keeps enforcement
  real when the cache is missing
- ⚠️ Recipe templates gain conditional copy — more complex text, but the
  conditions are few and the fail-closed default is the current behavior

## Alternatives Considered

| Alternative | Rejected Because |
|---|---|
| Keep patching leaks one-at-a-time (BUG-023 → BUG-024 → …) | A bug family is the signature of a missing abstraction; the next leak (pypi? GitLab?) is already predictable |
| Make the trust layer itself a preference (`auto_approve: true`) | Strips the product's reason for being in the lifecycle; an auditable escape hatch already exists for emergencies |
| Forge-adapter plugins (`gh`/`glab` code in core) | Hard-couples momentum to a forge; violates the vendor-neutral DIP that Phase 19 established. Forge-specific *commands* belong in `## Project Extensions`; the global template stops at `git tag` + `git push <tag>` |
| Detect project type at recipe runtime (no preferences file) | Re-runs inference on every invocation; can't capture user intent (a repo may publish to npm but deploy via Vercel); a version-controlled file records the decision once |

## References
- ENH-061 (backlog) — project preferences surface
- BUG-023, BUG-024 (backlog) — the leak family this ADR closes
- ADR-0008 — the lifecycle contract this builds on (Installed → Founded → Phase loop)
- `core/project-lifecycle.md` — the founded predicate preferences migrate under
- `core/git-hooks/contract.js` — the invariant enforcement layer
- Phase 26 — Project Preferences (`specs/phases/phase-26-project-preferences/`)
