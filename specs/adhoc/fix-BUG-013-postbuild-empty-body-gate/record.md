---
type: Ad-hoc Record
---

# Ad-hoc Work Record: fix-BUG-013-postbuild-empty-body-gate

> **Type**: quick-task
> **Created**: 2026-07-03
> **Branch**: fix/BUG-013-postbuild-empty-body-gate (lane `fix-BUG-013-postbuild-empty-body-gate`)
> **Backlog**: BUG-013
> **Status**: shipped

## Current Behavior

When Playwright's chromium-headless-shell is missing, `astro build` exits 0
while every rehype-mermaid page ships an EMPTY `sl-markdown-content` body —
the `browserType.launch: Executable doesn't exist …` error from
mermaid-isomorphic is log-only. The empty renders are then CACHED in
`.astro`/`node_modules/.astro`, so even a later fixed environment can rebuild
empty until caches are cleared. The deploy workflow installs only `chromium`
(`npx playwright install --with-deps chromium`), which does NOT include the
headless shell (a separate download), so a fresh CI/deploy environment could
silently publish a gutted site — this exact silent failure bit the deploy
pipeline on 2026-07-03.

## Expected Behavior

Fix candidates (a)+(c) from the backlog:

- **(a) Postbuild content gate** — `site/scripts/check-dist-content.mjs`
  (zero-dependency Node) scans every `site/dist/**/index.html`, extracts the
  `sl-markdown-content` body (balancing nested divs; for the custom-splash
  landing `index.html`, which has no such div, it requires a non-trivial
  `<body>` text length ≥ 1000 chars), and exits 1 listing every page whose
  content is empty/whitespace, with a hint pointing at
  `npx playwright install chromium-headless-shell` + clearing the `.astro`
  caches. Prints a one-line ✓ summary (page count + min body size) when all
  pass. Wired as `"postbuild"` in `site/package.json`, so npm runs it
  automatically after every `npm run build` — an empty-bodied build can no
  longer exit 0, regardless of cause.
- **(c) Deploy workflow install fix** — `.github/workflows/deploy-site.yml`
  Playwright step now runs
  `npx playwright install --with-deps chromium chromium-headless-shell`, with
  the step comment updated to explain the BUG-013 failure mode.

## Unchanged Behavior

- `astro build` itself is untouched — no Astro config, content, or rendering
  changes; the gate only reads `dist/` after the build.
- `prebuild` (OG-card generation) and all other npm scripts are unchanged.
- The deploy workflow is otherwise untouched (triggers, permissions,
  concurrency, deploy push step all byte-identical).
- Fix candidate (b) (rehype-mermaid error-strategy pinning) intentionally NOT
  taken — the postbuild gate catches every cause of empty bodies, not just
  the missing headless shell.
- The repo test suite does not cover `site/` (site isn't in `npm test`); no
  test files changed.

## Verification Evidence

All fresh in this session, in the lane worktree (Node v26.4.0):

```
$ cd site && npm ci && npm run build          # fresh worktree install
…
15:38:45 [build] 13 page(s) built in 2.82s
15:38:45 [build] Complete!

> site@0.0.1 postbuild
> node scripts/check-dist-content.mjs

✓ dist content gate: 12 page(s) checked, all bodies non-empty (min 6461 chars)
BUILD_EXIT=0
```

(12 index.html pages scanned; the 13th built page is `404.html`, which is not
an `index.html` route.)

Synthetic-failure proof — gutted the `sl-markdown-content` div of
`dist/concepts/index.html` to whitespace, ran the gate directly:

```
$ node scripts/check-dist-content.mjs
✗ dist content gate: 1 of 12 page(s) shipped an empty body (BUG-013):
    - concepts/index.html: sl-markdown-content body is empty/whitespace

  Likely cause: Playwright chromium-headless-shell is missing, so rehype-mermaid
  pages render empty while the build exits 0. Fix:
      npx playwright install chromium-headless-shell
  then clear the cached empty renders (.astro/ and node_modules/.astro/) and rebuild.
$ echo $?
1
```

Restored the page, gate green again:

```
$ node scripts/check-dist-content.mjs
✓ dist content gate: 12 page(s) checked, all bodies non-empty (min 6461 chars)
GATE_EXIT=0
```

Repo sanity (no committed non-755 scripts added; `.mjs` invoked via node needs
no exec bit):

```
$ node --test tests/committed-exec-bits.test.js
tests 1, pass 1, fail 0
```

## Commit

Single commit on `fix/BUG-013-postbuild-empty-body-gate`:
`fix(site): postbuild gate fails the build on empty page bodies (BUG-013)`
— touches `site/scripts/check-dist-content.mjs` (new gate),
`site/package.json` (postbuild wiring),
`.github/workflows/deploy-site.yml` (headless-shell install + comment), and
the lane-scoped tracking (this record, the BUG-013 backlog row, one changelog
bullet).
