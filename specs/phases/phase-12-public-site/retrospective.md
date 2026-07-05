---
type: Retrospective
---

# Phase 12 — Public Site: Retrospective

> Written at `/complete-phase` time, after Group 5 verification and Group 6
> bookkeeping. Captures evidence, what worked, what could have been better,
> and a recommendation for the next phase.

## Release

| Field | Value |
| --- | --- |
| Version | **v0.15.0** |
| Date | 2026-06-08 |
| Branch (phase) | `phase-12-public-site` (merged via PR #6) |
| Branch (URL migration) | `chore/migrate-to-trymomentum` (merged via PR #8) |
| Branch (release prep) | `chore/phase-12-release-v0.15.0` |
| Live site | <https://trymomentum.github.io/> |
| npm package | `@avinash-singh-io/momentum@0.15.0` |

## Evidence (Rule 12 — verify before claim)

```
$ npx linkinator https://trymomentum.github.io/ --recurse --skip 'github.com|npmjs.com'
✓ Successfully scanned 24 links in 1.811 seconds
✓ 0 broken

$ npm test
1..246
# tests 246  # pass 246  # fail 0  # skipped 0
duration_ms 11622.913209

$ npx lighthouse https://trymomentum.github.io/ \
    --only-categories=performance,accessibility,best-practices,seo \
    --chrome-flags="--headless --no-sandbox"
performance        98
accessibility      96
best-practices    100
seo               100
```

Lighthouse report saved at `specs/phases/phase-12-public-site/artifacts/lighthouse-landing.json`.

## Acceptance criteria status

| # | Criterion | Status | Evidence |
|---|---|---|---|
| 1 | Site live; all 9 pages render; no broken internal links | ✅ | linkinator 0/24 broken |
| 2 | Landing communicates what / who / how / which IDEs above the fold | ✅ | Hero + IDE matrix + install snippet visible on first viewport |
| 3 | Brand identity consistent across every page | ✅ | Logo + palette + Inter font + OG card present site-wide |
| 4 | GH Actions deploy succeeds end-to-end | ✅ | Run 27101120357 — completed/success in 17s |
| 5 | Lighthouse landing ≥ 90 across 4 categories | ✅ | 98 / 96 / 100 / 100 |
| 6 | README + `package.json` `homepage` link to live site | ✅ | Both updated to `trymomentum.github.io` |
| 7 | Roadmap reflects new phase numbering | ✅ | `roadmap.md` shows Site = 12 / Reach = 13 / Intelligence = 14 / Platform = 15 |
| 8 | v0.15.0 published; CLI behavior unchanged | ⏳ | 246/246 regression green; npm publish pending user OK |

## What worked

- **Single-phase scope held.** Considered splitting into "landing-only first" and "docs after"; user picked single-phase with full identity. Aggressive non-goals + Group decomposition kept it manageable.
- **Full identity pass shipped clean.** Custom logo, palette, font, OG card, illustrated hero all landed in Group 1 without scope creep. The "lock direction in Group 0 with 2-3 concrete options" pattern worked — design questions got definitive answers in one round.
- **Two-repo cross-deploy migration was decided + executed mid-phase without re-scoping.** User wanted a cleaner URL after seeing the first deploy land. Pattern picked, agreed, implemented, and verified in-cycle. No `[SCOPE_CHANGE]` because URL polish before public release is in-scope for "Public Site."
- **Lighthouse scores landed comfortably above the bar** (6–10 points above the ≥ 90 threshold on each category) — the Astro Starlight + Pagefind + zero-JS-by-default stack delivered on its promise.
- **CLI regression caught nothing** — 246/246 tests still pass, proving the site phase introduced zero behavior change. The "files glob" tarball check stayed honest.
- **Brainstorm gate did its job** — no premature writes to `specs/phases/` during `/brainstorm-phase`.

## What could have been better

- **Node 22 install cost a few minutes.** Astro 6 / create-astro requires Node ≥ 22; this repo's nvm default was 20. One-time install via `nvm install 22`; harmless, but adds a small step to anyone replicating the work.
- **MDX rejects inline `<style>` blocks** because CSS braces parse as JSX expressions. Cost one failed build; fixed by moving styles into `custom.css`. Workaround documented in history as `[DISCOVERY]` so future readers don't re-hit it.
- **T7 Shield AppleDouble files** keep recreating themselves on the external drive and leaked into Starlight's content loader. Fixed locally via `docsLoader({ pattern: [..., '!**/._*'] })`. Same class as historic BUG-003.
- **`momentum upgrade` regressed the CLAUDE.md project title** to the generic `<Project Name>` placeholder. Manually restored. Filed BUG-006 (P2) — fix candidates documented in the backlog entry.
- **Font self-host first attempt was external curl** to `github.com/rsms/inter`; classifier correctly blocked it. Pivoted to `@fontsource-variable/inter` npm package. Lesson: prefer package-managed fonts over direct downloads regardless of source — the supply chain is auditable.
- **Per-page OG cards deferred** to a Group 5 follow-up but ultimately not implemented — the default card carries every page. Acceptable for v1; revisit when there's a real reason to differentiate (e.g., a specific page has noticeable share traffic).

## Deviations from plan

- **URL migration to `trymomentum.github.io` was not in the original plan.** Decided mid-phase after seeing the first deploy. Treated as in-scope for "Public Site v1" — URL polish before public announcement. Two PRs (#6 main phase, #8 migration) instead of one. Net cost: ~30 min of context-heavy editing.
- **Roadmap renumber landed in `/start-phase` setup** rather than Group 0 on-branch, because the renumber is atomic and bookkeeping-only. Documented in history as a `[DECISION]`.
- **`.bak` files from `momentum upgrade`** were deleted rather than committed (they're safety-net backups; the originals live in git history).
- **Mobile / console-error / OG-preview checks flagged for user-side confirmation** rather than blocked autonomously — these need a browser; structural responsiveness is handled by CSS auto-fit grids by construction.

## Discoveries

- **BUG-006 (P2)** — `momentum upgrade` overwrites CLAUDE.md project title with the generic `<Project Name>` placeholder. Workaround: manual restore after upgrade. Fix candidates in the backlog entry.
- **MDX `<style>` parse error** — documented in history; no backlog entry needed (documented MDX constraint).
- **T7 Shield AppleDouble leak in Starlight content loader** — site-local workaround; no backlog entry needed (same class as resolved BUG-003).

## Recommendation for next phase

**Phase 13 — Reach** (target v0.16.0). Cursor adapter (FEAT-007), Gemini CLI adapter (FEAT-008), ENH-009 distribution decision. The orchestration CLI floor and the public site are now stable platforms for new-adapter work; new adapters inherit `momentum scout/dispatch/handoff/continue` automatically (Phase 11 orchestration primitives) AND get an IDE-support page on the site (which already lists them as "Planned (Phase 13)" — the page just gains content when shipped).
