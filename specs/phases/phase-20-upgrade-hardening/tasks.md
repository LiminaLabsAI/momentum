# Phase 20 — Upgrade Hardening: Tasks

> Mirrors `plan.md`. Mark `[x]` complete, `[/]` in-progress. Verify before marking done (Rule 12).

## Group 0 — Lock file & version stamp (Sequential, blocks G1 + G3) ✅
- [x] `.momentum/installed.json` schema + `writeInstalledManifest()` / `readInstalledManifest()` + `sha256File()` + `recordManaged()` in `bin/momentum.js`
- [x] Managed-file collector (`_managedCollector` Set) threaded through `copyFile` / `copyDir` (leaf-level, `record:false` opt) / `installPrimaryInstruction` / `upgradePrimaryInstruction` / `upgradeMarkedFile`; adapter writes captured via the shared `copyFile`/`copyDir` helpers
- [x] Write manifest at end of `init()` and `upgrade()` (committed, per D1); `try/finally` clears collector — safe for in-process repeated calls (ecosystem sweep)
- [x] specs/ skeleton opts out via `record:false` (install-once / user-owned → never orphaned)
- [x] Fingerprint tests exclude `.momentum/` (generated runtime state, non-deterministic) — baselines unchanged, no re-capture needed
- [x] Tests: `tests/installed-manifest.test.js` (5) — well-formed lock file; specs excluded + tool files included; sha256 integrity; upgrade preserves installedAt; codex agent recorded. Suite **604 → 609** (+5), all green

## Group 1 — Safe upgrade: orphan cleanup + BUG-008 + dry-run (∥ G2)
- [ ] Orphan cleanup on upgrade (diff old vs new manifest; back up + remove; only previously-managed files eligible)
- [ ] BUG-008 — `init` backs up momentum-owned files before overwrite (no silent clobber)
- [ ] ENH-040 — `--dry-run` for `init` + `upgrade` (thread `opts.dryRun`, gate all fs writes, print planned actions, exit 0)
- [ ] Tests: orphan removed; user file preserved; init no-clobber; dry-run writes nothing

## Group 2 — Distribution hardening (∥ G1)
- [ ] Pin `@latest` across README + site docs (getting-started, ide-support, ecosystem, InstallSnippet.astro)
- [ ] Stale-CLI gate: `upgrade` warns when installed CLI < npm latest (reuse `checkForUpdates()`)
- [ ] FAQ fix: correct "fetches from registry" claim; drop stale BUG-006 note (fixed v0.20.3)
- [ ] Tests: stale-CLI warning fires when local < latest; silent when current

## Group 3 — Ecosystem batch upgrade (Sequential, needs G0 + G1)
- [ ] `momentum ecosystem upgrade [--dry-run] [--force] [--agent <a>]` in `bin/ecosystem.js`
- [ ] Per member: existence check → dirty-tree gate (skip unless `--force`) → detect agent → run `upgrade()` in-process → capture result
- [ ] Per-repo version report (before → after), partial-failure tolerance, fleet summary
- [ ] Usage text + `momentum doctor` per-repo version
- [ ] Tests: synthetic 2-repo fixture — clean upgrades / dirty skipped / missing reported / summary / dry-run no-op

## Group 4 — Verify, docs, release prep (Sequential, last)
- [ ] `npm test` green; re-baseline 3 install fingerprints (installed.json is expected new file) with meta
- [ ] E2E smoke: init manifest; upgrade removes planted orphan + preserves user edit; dry-run no-op; ecosystem sweep 2-repo
- [ ] Site: "Upgrading" page + ecosystem-upgrade section; README upgrade rewrite (two-step model explicit)
- [ ] `retrospective.md` with non-empty `## Verification Evidence` (gates release tag)
- [ ] Version bump v0.22.0; roadmap renumber (Reach→21, Intelligence→22, Platform→23); backlog reconcile (BUG-008, ENH-040 resolved; new FAQ-fix + lockfile items)

## Deferred → backlog (this phase files them, does NOT build)
- [ ] FEAT — ordered-migration escape hatch (`core/migrations/vX.Y.Z.js`), Nx-style, for structural transforms (D4)
