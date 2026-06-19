# Phase 20 — Upgrade Hardening: Plan

> **Target release**: v0.22.0
> **Branch**: `phase-20-upgrade-hardening`
> **Status**: Active

## Why

momentum installs files (slash commands, agent rules, git hooks, instruction
files, templates) directly INTO each repo and re-syncs them on `momentum
upgrade`. A multi-agent review + a deep-research pass against the closest prior
art (Copier, Cruft, Angular `ng update`, Nx `nx migrate`, Renovate, mani)
surfaced four gaps versus standard practice:

1. **No version-of-record in the target.** Nothing records which momentum
   version installed a repo, so there is no drift detection, no per-repo
   version reporting, and no way to compute orphans.
2. **Copy-only upgrade can never delete.** A file dropped by a newer release
   lingers in every installed repo forever (the Cruft #67 failure mode).
3. **Distribution staleness.** `npx <pkg>` serves a cached version; a stale
   GLOBAL install shadows everything; `momentum upgrade` copies from the
   *installed* CLI, so file freshness is capped by CLI freshness — and the
   docs recommend the un-pinned form that triggers the npx cache.
4. **No fleet upgrade.** Ecosystems must `cd` into each repo and run `upgrade`
   by hand — the exact friction that stalled the cerebrio dogfood.

The validated model for our content type (declarative markdown/scripts, not
user code needing codemods) is the **Copier/Cruft template-sync** approach —
a per-repo lock file + managed/owned separation + orphan cleanup — plus a
**PULL-model** fleet sweep (mani-style), NOT a forge-coupled PUSH bot
(Renovate/Dependabot would violate the vendor-neutral / DIP constraint).

We deliberately do NOT adopt git three-way merge as the core mechanism: the
research flags it as fragile (needs the base blob locally; fails on fresh
clones — Cruft #181). Our existing `## Project Extensions` marker is the
robust intra-file managed-block variant and stays.

## Design decisions (load-bearing)

- **D1 — Lock file is committed**, not gitignored: the version-of-record must
  travel with the repo and survive fresh clones.
- **D2 — Stale-CLI on `upgrade` is a loud WARNING, not a hard block**: preserves
  offline / air-gapped use; never silently upgrades from a stale CLI.
- **D3 — Ecosystem sweep requires a clean tree per repo, then leaves changes in
  the working tree for review**: no auto-commit / auto-push across a fleet.
- **D4 — Versioned ordered migrations are DEFERRED** (P2 backlog): our payload
  is declarative; the lock file + orphan cleanup deliver the value. Add a
  `core/migrations/vX.Y.Z.js` escape hatch only when a release needs a
  structural transform (rename, settings schema bump).

## Lock file schema — `.momentum/installed.json`

```json
{
  "schema": 1,
  "momentumVersion": "0.22.0",
  "agent": "claude-code",
  "installedAt": "2026-06-19",
  "updatedAt": "2026-06-19",
  "managedFiles": [
    { "path": ".claude/commands/start-phase.md", "sha256": "…" }
  ]
}
```

- `momentumVersion` — CLI version that last wrote it → version reporting +
  stale detection.
- `agent` — adapter that installed → lets the ecosystem sweep pick the right
  adapter per repo without guessing.
- `managedFiles` — the exact set of tool-managed files written this run.
  `(old.managedFiles − new.managedFiles)` = orphans to remove. We only ever
  delete files we previously installed — user files are never touched.

## Groups

### Group 0 — Lock file & version stamp (Sequential, blocks G1 + G3)
- `.momentum/installed.json` schema + `writeInstalledManifest()` /
  `readInstalledManifest()` in `bin/momentum.js`.
- Managed-file collector threaded through `copyFile` / `copyDir` /
  `installPrimaryInstruction` / `upgradePrimaryInstruction` / `upgradeMarkedFile`
  / `applyOverlay` and the adapter `runInstall` / `runUpgrade`.
- Write the manifest at the end of `init()` and `upgrade()`.
- Tests: manifest written on init; rewritten on upgrade; sha256 + version
  correct; agent recorded.

### Group 1 — Safe upgrade: orphan cleanup + BUG-008 + dry-run (∥ G2)
- **Orphan cleanup** on upgrade: diff old vs new manifest; back up + remove
  removed files; guard so only previously-managed files are eligible.
- **BUG-008** — `init` backs up momentum-owned files before overwriting
  (commands/scripts/engines): no silent clobber. (Backlog recommends routing to
  upgrade semantics when targets exist.)
- **ENH-040** — `--dry-run` for `init` + `upgrade`: thread `opts.dryRun`, gate
  every `fs` write, print the planned action set (`+ added`, `↑ upgraded`,
  `↻ migrated`, `🗑 removed`, `⚠️ skipped`, `❌ would clobber`), exit 0 without
  touching disk.
- Tests: orphan removed; user file preserved; init no longer clobbers; dry-run
  writes nothing.

### Group 2 — Distribution hardening (∥ G1)
- Pin `@latest` across README + site docs (getting-started, ide-support,
  ecosystem, `InstallSnippet.astro`).
- **Stale-CLI gate**: `upgrade` warns prominently when the installed CLI is
  behind npm `latest` (reuse `checkForUpdates()`): "your files will only ever
  be as new as your CLI — run `npm i -g …@latest` first."
- **FAQ fix**: correct the false "`momentum upgrade` fetches from the npm
  registry" claim; drop the stale BUG-006 "known regression" note (fixed
  v0.20.3).
- Tests: stale-CLI warning fires when local < latest; silent when current.

### Group 3 — Ecosystem batch upgrade (Sequential, needs G0 + G1)
- `momentum ecosystem upgrade [--dry-run] [--force] [--agent <a>]` — new
  subcommand in `bin/ecosystem.js`.
- For each manifest member: existence check → **dirty-tree gate** (skip unless
  `--force`) → detect agent (`.momentum/installed.json.agent`, else CLAUDE.md /
  AGENTS.md presence) → run `upgrade()` in-process → capture result.
- **Per-repo version report** (before → after from the lock file),
  **partial-failure tolerance** (continue on error), **fleet summary** at end.
- Usage text + `momentum doctor` shows per-repo momentum version.
- Tests: synthetic 2-repo ecosystem fixture — clean repo upgrades, dirty repo
  skipped, missing repo reported, summary correct, `--dry-run` writes nothing.

### Group 4 — Verify, docs, release prep (Sequential, last)
- `npm test` green; re-baseline all 3 install fingerprints (install now writes
  `installed.json` — expected fingerprint change) with explanatory meta.
- E2E smoke (temp git repos): init writes manifest; upgrade removes a planted
  orphan + preserves a user edit; dry-run no-ops; `ecosystem upgrade` sweeps a
  2-repo fixture with correct per-repo report.
- Site: new "Upgrading" page + ecosystem-upgrade section; README upgrade
  section rewritten (two-step CLI-then-files model made explicit).
- `retrospective.md` with a non-empty `## Verification Evidence` block (gates
  the release tag — FEAT-019).
- Version bump → v0.22.0; roadmap renumber (Reach→21, Intelligence→22,
  Platform→23); backlog reconcile.

## Out of scope (this phase)
- Ordered-migration framework (D4) — deferred to backlog as a FEAT.
- PUSH-model / forge bot — rejected (violates vendor-neutral constraint).
- Fetching the template payload from the registry at upgrade time — optional
  future hardening; would cost the offline property.
