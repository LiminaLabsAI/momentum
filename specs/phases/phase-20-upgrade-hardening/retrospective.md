# Phase 20 — Upgrade Hardening: Retrospective

> **Released as**: v0.22.0
> **Branch**: `phase-20-upgrade-hardening`

## Summary

Brought momentum's own upgrade mechanism up to standard practice, grounded in a
multi-agent review + a verified deep-research pass (21 sources, 25 claims
confirmed 3-0; closest analogs Copier/Cruft, Angular `ng update`, Nx `nx
migrate`, Renovate, mani). For momentum's declarative payload the right model is
**Copier/Cruft template-sync** — a per-repo committed lock file + managed/owned
separation + orphan cleanup — explicitly NOT fragile git three-way merge (Cruft
#181) and NOT Nx-style codemods (we don't rewrite user code). The ecosystem
story is a **PULL-model sweep** (mani-style), NOT a forge-coupled PUSH bot
(vendor-neutral / DIP).

## What shipped

- **G0 — Lock file** (`.momentum/installed.json`): per-repo version-of-record
  (version + adapter + managed files with sha256), committed so it survives
  fresh clones. Managed-file collector threaded through the install path; specs
  excluded (user-owned). Keystone for orphan cleanup + ecosystem version
  reporting.
- **G1a — Orphan cleanup + BUG-008**: upgrade removes files a newer version
  dropped (`.bak`-backed; only ever previously-managed files). `init` no longer
  silently clobbers momentum-owned files (`copyDir` `backup` mode). Caught +
  fixed a near-miss where orphan cleanup would have deleted adapter
  `settings.json`/`hooks.json` on the identical-skip path — adapters now record
  what they own via `helpers.recordManaged`.
- **G1b — `--dry-run`** (ENH-040): full no-write preview for init/upgrade across
  all 3 adapters; module-level gate over every fs-mutation incl. post-copy
  chmod/readdir and adapter direct writes.
- **G2 — Distribution**: `@latest` pinned across all install docs; `upgrade`
  warns (never blocks — D2) when the installed CLI is behind the published
  latest, explaining the two-step model; FAQ corrected (the false "upgrade
  fetches from the registry" claim) and rewritten around two-step + safety.
- **G3 — `momentum ecosystem upgrade`**: PULL-model fleet sweep — clean-tree
  gate (skip dirty unless `--force`), adapter detection, in-process upgrade,
  per-repo version report, partial-failure tolerance, `--dry-run`.

## Decisions

- **D1** lock file committed (survives clones). **D2** stale-CLI = warn, not
  block (offline use). **D3** sweep requires clean tree then leaves changes for
  review (no fleet auto-commit). **D4** ordered migrations deferred → FEAT-021
  (built only when a release needs a structural transform; avoids speculative
  complexity).
- Resolved **BUG-008** + **ENH-040** (folded in). Filed **FEAT-021** (migration
  escape hatch).

## What worked

- The deep-research pass picked the right model first time (Copier/Cruft over
  Nx/three-way-merge) — saved building the wrong, heavier thing.
- Fingerprint tests caught the lock file immediately; excluding `.momentum/`
  (generated state) kept them deterministic with **no baseline churn**.
- Writing the cross-adapter regression test surfaced that orphan cleanup
  depended on every managed file being re-recorded each run — caught the
  settings.json/hooks.json near-miss before it could ship.

## What was tricky

- **Circular require**: the in-process ecosystem sweep `require()`s
  `bin/momentum.js` back during `main()`'s synchronous dispatch — `module.exports`
  had to move above `if (require.main === module) main()` or `upgrade` was
  undefined.
- **Flag scoping**: a global `--dry-run` strip in `main()` hid the flag from the
  `ecosystem upgrade` subcommand; moved parsing per-command.
- Orphan cleanup correctness hinges on managed-set completeness — the fix was to
  make adapters record what they own independent of whether they rewrite it.

## Verification Evidence

- **Test suite**: `npm test` → **629/629 passing** (604 v0.21.0 baseline + 25
  new: `installed-manifest` (5), `upgrade-safety` (7, incl. the 3-adapter
  recordManaged regression), `dry-run` (5), `stale-cli-warning` (4),
  `ecosystem-upgrade` (4)). Fingerprints (claude-code/codex/antigravity) green
  with baselines unchanged.
- **E2E smoke** (temp git repo, fresh from this session):
  - init writes `.momentum/installed.json` — `version=0.21.0 agent=claude-code
    managed=34 specs-excluded=true`.
  - upgrade orphan cleanup: planted `retired.md` (in manifest) → `🗑 removed
    (original saved as .bak)`; `retired gone=YES`; a user file `my-note.md`
    `user-preserved=YES`.
  - `upgrade --dry-run`: repo byte-for-byte `unchanged=YES`.
  - `formatStaleCliWarning("0.20.2","0.22.0")` → fires when behind.
  - `ecosystem upgrade` across a synthetic 2-repo ecosystem: per-repo
    `before → after` report + `N upgraded` summary; dirty repo skipped, `--force`
    upgrades it; missing member reported and sweep continues; `--dry-run` leaves
    every member byte-for-byte unchanged.
- **Adapters**: claude-code / codex / antigravity all keep their config
  (`settings.json` / `hooks.json`) across upgrade and are tracked in the
  manifest (regression test).

## Acceptance

All Group 0–3 tasks complete and verified per Rule 12. G4 docs + version bump +
backlog reconcile done. Remaining: merge to main + tag v0.22.0 + GitHub Release
+ npm publish — all gated on explicit user approval.
