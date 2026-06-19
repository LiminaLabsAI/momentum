# Phase 20 — Upgrade Hardening: Tasks

> Mirrors `plan.md`. Mark `[x]` complete, `[/]` in-progress. Verify before marking done (Rule 12).

## Group 0 — Lock file & version stamp (Sequential, blocks G1 + G3) ✅
- [x] `.momentum/installed.json` schema + `writeInstalledManifest()` / `readInstalledManifest()` + `sha256File()` + `recordManaged()` in `bin/momentum.js`
- [x] Managed-file collector (`_managedCollector` Set) threaded through `copyFile` / `copyDir` (leaf-level, `record:false` opt) / `installPrimaryInstruction` / `upgradePrimaryInstruction` / `upgradeMarkedFile`; adapter writes captured via the shared `copyFile`/`copyDir` helpers
- [x] Write manifest at end of `init()` and `upgrade()` (committed, per D1); `try/finally` clears collector — safe for in-process repeated calls (ecosystem sweep)
- [x] specs/ skeleton opts out via `record:false` (install-once / user-owned → never orphaned)
- [x] Fingerprint tests exclude `.momentum/` (generated runtime state, non-deterministic) — baselines unchanged, no re-capture needed
- [x] Tests: `tests/installed-manifest.test.js` (5) — well-formed lock file; specs excluded + tool files included; sha256 integrity; upgrade preserves installedAt; codex agent recorded. Suite **604 → 609** (+5), all green

## Group 1 — Safe upgrade: orphan cleanup + BUG-008 + dry-run (∥ G2) ✅
- [x] Orphan cleanup on upgrade — `removeOrphans()` diffs prev-manifest vs current managed set; backs up + removes; only previously-managed files eligible; no-op when no prior lock file (pre-Phase-20 installs upgrade safely)
- [x] **Adapter recordManaged fix** — adapters now record owned config (settings.json/hooks.json + codex generated skills) via `helpers.recordManaged` regardless of rewrite; fixes a near-miss where orphan cleanup deleted adapter hook config on the identical-skip path. 3-adapter regression test added.
- [x] BUG-008 — `init` backs up momentum-owned files before overwrite via `copyDir` `backup` mode (commands/scripts/engines/overlay); fresh installs stay quiet
- [x] ENH-040 — `--dry-run` for `init` + `upgrade`: module-level `_dryRun` gates every fs-mutation + post-copy chmod/readdir loops + adapter direct writes + git-hook config + manifest + orphan removal; threaded into all 3 adapters via `helpers.dryRun`; prints planned action set (`✋ would …`), exit 0
- [x] Tests: `tests/upgrade-safety.test.js` (7) + `tests/dry-run.test.js` (5) — orphan removed/preserved/manifest-dropped; user files untouched; BUG-008 re-init backup; fresh-init no .bak; 3-adapter config-survives; dry-run writes nothing (init + 3-adapter upgrade byte-unchanged + orphan-not-removed). Suite **609 → 621**, all green

## Group 2 — Distribution hardening (∥ G1) ✅
- [x] Pin `@latest` across README (3) + getting-started (5 + a "pin @latest" aside) + ide-support (3) + ecosystem.mdx (6) + `InstallSnippet.astro` default
- [x] Stale-CLI warning: `formatStaleCliWarning(current, latest)` (pure, exported) wired into the `upgrade` dispatch — warns prominently (D2: warn, never block) that upgrade copies from the installed CLI so files are only as new as the CLI; tells user to `npm i -g …@latest` first
- [x] FAQ fix: corrected the false "`momentum upgrade` fetches from the npm registry" claim (it copies from the installed CLI; only network call is the version check); rewrote the upgrade section around the two-step model + `@latest` + safety (marker/.bak/orphan/dry-run) + ecosystem sweep; dropped the stale BUG-006 "known regression" note (fixed v0.20.3)
- [x] Tests: `tests/stale-cli-warning.test.js` (4) — warns when behind; silent when current / null / ahead. Suite **621 → 625**, all green

## Group 3 — Ecosystem batch upgrade (Sequential, needs G0 + G1) ✅
- [x] `momentum ecosystem upgrade [--dry-run] [--force] [--agent <a>]` in `bin/ecosystem.js` (PULL model — vendor-neutral over local checkouts, NOT a forge bot)
- [x] Per member: existence check → dirty-tree gate (`git status --porcelain`, skip unless `--force`; non-git = clean) → detect agent (`detectMemberAgent`: lock file authoritative, else heuristic) → run `upgrade()` in-process → capture result
- [x] Per-repo version report (`before → after` from lock file), partial-failure tolerance (one bad repo never aborts the fleet), `printSweepSummary` with per-status counts
- [x] **Circular-require fix**: moved `module.exports` above the `if (require.main === module) main()` line in `bin/momentum.js` — the in-process sweep require()s the module back during main()'s synchronous dispatch; exports had to be set first. **Flag-scoping fix**: `--dry-run` is parsed per-command, not stripped globally, or the ecosystem subcommand never saw it.
- [x] Usage text updated (dispatch + `printUsage`); `momentum doctor` per-repo version DEFERRED (sweep already reports before→after; minor)
- [x] Tests: `tests/ecosystem-upgrade.test.js` (4) — clean sweep + per-repo report; dirty skipped then `--force` upgrades; `--dry-run` leaves members byte-unchanged; missing member reported + sweep continues. Suite **625 → 629**, all green

## Group 4 — Verify, docs, release prep (Sequential, last)
- [x] `npm test` green — **629/629** (581 baseline + 48 new). Fingerprints green, baselines unchanged (`.momentum/` excluded — no re-capture needed)
- [x] E2E smoke (temp git repo): init manifest (34 managed, specs excluded); upgrade removes planted orphan + preserves user file; `--dry-run` byte-unchanged; stale-CLI warning fires; ecosystem sweep 2-repo (report/dirty-skip/force/missing/dry-run) — captured in `retrospective.md` § Verification Evidence
- [x] Docs: README "Keeping projects up to date" (two-step + ecosystem sweep + dry-run); FAQ rewrite (registry-claim fix + safety); getting-started "pin @latest" aside; `@latest` pinned across README/getting-started/ide-support/ecosystem/InstallSnippet
- [x] `retrospective.md` with non-empty `## Verification Evidence` (gates release tag — FEAT-019)
- [x] Version bump v0.22.0; roadmap renumber done in status.md (Reach→21, Intelligence→22, Platform→23); backlog reconcile (BUG-008 + ENH-040 resolved; FEAT-021 migration escape hatch filed)
- [ ] **RELEASE (approval-gated)**: merge → main, tag v0.22.0, `gh release create`, `npm publish --access public` — all require explicit user OK (project release checklist)

## Deferred → backlog (this phase files them, does NOT build)
- [ ] FEAT — ordered-migration escape hatch (`core/migrations/vX.Y.Z.js`), Nx-style, for structural transforms (D4)
