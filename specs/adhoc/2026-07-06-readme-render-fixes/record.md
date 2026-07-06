---
type: Ad-hoc Record
---

# Ad-hoc Work Record: 2026-07-06-readme-render-fixes

> **Type**: quick-task
> **Created**: 2026-07-06
> **Branch**: fix/readme-logo
> **Backlog**: none
> **Status**: shipped

## Current Behavior

Two README rendering bugs reported by the operator (screenshots, GitHub dark
mode):

1. **Logo broken** — README pointed at `site/src/assets/logo/wordmark.svg`,
   a path the site redesign (2026-07-05) deleted; the whole
   `site/src/assets/logo/` directory no longer exists (verified: local ls +
   raw.githubusercontent 404). Real brand assets live in
   `site/public/brand/`. Additionally the surviving lockup
   (`momentum-lockup.svg`) is cobalt `#0023AE` + ink `#15161C` — a
   light-background asset; the brand kit specifies white mark + wordmark on
   dark.
2. **Mermaid flow unreadable on dark** — the ecosystem flowchart hardcoded
   light fills (`style … fill:#F8FAFC / #EEF2FF`), so GitHub dark mode
   rendered white subgraph labels over forced-light boxes.

## Expected Behavior

1. New `site/public/brand/momentum-lockup-dark.svg` (white mark + wordmark,
   per brand kit). README header uses the GitHub `<picture>` dark/light
   pattern with **absolute** raw.githubusercontent URLs — renders correctly
   on GitHub light, GitHub dark, and npmjs.com (npm strips `<source>`,
   falling back to the light `<img>` on its white background; absolute URL
   required because `site/` isn't in the npm tarball).
2. Mermaid `style` overrides removed — GitHub's adaptive mermaid theme
   handles light/dark itself.
3. v0.31.2 docs-only patch published so the npm page picks up the fixed
   header.

## Unchanged Behavior

- No code changes; suite must stay 833/833 with zero fixture drift.
- README anchors pinned by tests/repo-integrity-guards.test.js preserved.
- Site pages unaffected (they use the animated `Brand` component, not these
  static assets); `site/public/brand/` gains one file, loses none.
- Historical specs referencing the old logo path stay frozen.

## Verification Evidence

Fresh from this session (2026-07-06):

**Broken-path confirmation**:

```
$ ls site/src/assets/logo/   → exit 1 (does not exist)
$ curl raw.githubusercontent.com/LiminaLabsAI/momentum/main/site/src/assets/logo/wordmark.svg → 404
```

**Full suite** (`npm test`, after fixes + version bump): `pass 833 / fail 0`

**Post-merge check (pending push)**: raw URLs for both lockup variants must
return 200; GitHub README renders logo in light + dark; mermaid labels
legible in dark mode.
